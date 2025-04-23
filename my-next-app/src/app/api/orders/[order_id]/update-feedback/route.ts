// PUT /api/orders/:order_id/update-feedback
import { NextResponse, NextRequest } from "next/server"; // Use NextRequest
import dbConnect from "@/app/lib/mongodb";
import { Order } from "@/app/models/Orders";
import { Shop } from "@/app/models/Shop";
import { Admin } from "@/app/models/Admin";
import { Customer } from "@/app/models/Customer";
// --- Add Redis, Mongoose, and Notification Imports ---
import { createClient } from "redis";
import mongoose from "mongoose";
import { Notification } from "@/app/models/Notification"; // Import Notification model
// --- End Imports ---

export async function PUT(request: NextRequest, context: { params: any }) {
  // Use NextRequest
  const { order_id } = context.params;
  let redisClient: ReturnType<typeof createClient> | undefined; // Define redisClient variable with explicit type

  try {
    await dbConnect();
    const { feedback_id, rating, comments, date_submitted } =
      await request.json();

    // --- Find the Order first to get shop_id and the feedback object ---
    const order = await Order.findById(order_id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const shopIdFromOrder = order.shop; // Get shop_id for finding admin/shop name later
    console.log(`[Feedback Update API] Order's shop_id: ${shopIdFromOrder}`);

    const targetFeedback = order.feedbacks.find(
      (fb: any) => fb.feedback_id === feedback_id
    );

    if (!targetFeedback) {
      return NextResponse.json(
        { error: "Feedback not found in the order" },
        { status: 404 }
      );
    }

    // --- Update the feedback object in the Order document ---
    targetFeedback.rating = rating;
    targetFeedback.comments = comments;
    targetFeedback.date_submitted = date_submitted || new Date().toISOString(); // Update date or use current
    await order.save(); // Save the primary Order document
    console.log(
      `[Feedback Update API] Feedback ${feedback_id} updated successfully in order ${order_id}`
    );

    // --- Create the updated feedback object to publish ---
    const updatedFeedbackData = {
      ...targetFeedback, // Spread existing properties from the updated feedback
      feedback_id: targetFeedback.feedback_id,
      order_id: order_id,
      shop_id: shopIdFromOrder,
      // customer_id: targetFeedback.customer_id || order.customer, // Add if needed and available
      rating: rating,
      comments: comments,
      date_submitted: targetFeedback.date_submitted,
    };

    // --- START: Update Denormalized Data & Redis Publish (Combined - Not Recommended) ---
    console.log(
      "[Feedback Update API] Starting update of denormalized data & potential Redis publish..."
    );

    // Helper function to update feedback within nested orders array
    const updateFeedbackInEntity = (entityOrders: any[]) => {
      let modified = false;
      for (const o of entityOrders) {
        if (o._id.toString() === order_id && Array.isArray(o.feedbacks)) {
          const feedback = o.feedbacks.find(
            (fb: any) => fb.feedback_id === feedback_id
          );
          if (feedback) {
            feedback.rating = rating;
            feedback.comments = comments;
            feedback.date_submitted = targetFeedback.date_submitted; // Use updated date
            modified = true;
          }
        }
      }
      return modified;
    };

    try {
      // Update in Shops
      const shops = await Shop.find(); // Inefficient
      for (const shop of shops) {
        if (updateFeedbackInEntity(shop.orders)) {
          shop.markModified("orders");
          await shop.save();
          console.log(
            "[Feedback Update API] Denormalized Shop updated:",
            shop._id
          );
        }
      }

      // Update in Admins & Attempt Redis Publish
      const admins = await Admin.find(); // Inefficient
      for (const admin of admins) {
        let adminModified = false;
        let shopNameForNotification = "your shop"; // Default

        for (const shop of admin.shops) {
          // Find the shop name if it matches shopIdFromOrder (for notification)
          if (shop.shop_id === shopIdFromOrder && shop.name) {
            shopNameForNotification = shop.name;
          }
          // Update feedback within this admin's shop's orders
          if (updateFeedbackInEntity(shop.orders)) {
            adminModified = true;
          }
        }

        if (adminModified) {
          admin.markModified("shops"); // Mark the entire shops array as modified
          await admin.save();
          console.log(
            "[Feedback Update API] Denormalized Admin updated:",
            admin._id
          );

          // --- Get adminId from the current admin in the loop ---
          const adminId = admin.admin_id;
          console.log(
            `[Feedback Update API] Attempting Redis publish for adminId found in loop: ${adminId}`
          );

          // --- START: Redis Publishing (Inside Admin Loop - Problematic) ---
          if (adminId) {
            try {
              redisClient = createClient({ url: process.env.REDIS_URL });
              redisClient.on("error", (err) =>
                console.error(
                  "[Feedback Update API] Redis Client Error (in loop)",
                  err
                )
              );
              await redisClient.connect();
              console.log(
                `[Feedback Update API] Connected to Redis for admin ${adminId}.`
              );

              // 1. Publish Real-time Feedback Update (Use a different event name)
              const feedbackChannel = `feedback-updated:admin:${adminId}`; // Event name for updates
              await redisClient.publish(
                feedbackChannel,
                JSON.stringify(updatedFeedbackData)
              ); // Publish updated data
              console.log(
                `[Feedback Update API] Published feedback update to Redis channel: ${feedbackChannel}`
              );

              // 2. Publish & Save Notification (Optional for updates, but added for persistence)
              const notificationChannel = `admin-notifications:${adminId}`;
              const notificationData = {
                // _id: new mongoose.Types.ObjectId().toString(), // Mongoose adds _id
                message: `Feedback updated for order in ${shopNameForNotification}. Rating: ${updatedFeedbackData.rating}`, // Adjust message
                timestamp: new Date().toISOString(),
                read: false,
                link: `/admin/shop-self-service/feedback`, // Or link to specific order/feedback
                recipient_id: adminId,
                recipient_type: "admin",
              };
              // Publish to Redis
              await redisClient.publish(
                notificationChannel,
                JSON.stringify(notificationData)
              ); // Publish might need _id
              console.log(
                `[Feedback Update API] Published update notification to Redis channel: ${notificationChannel}`
              );

              // Save to Database
              try {
                await Notification.create(notificationData);
                console.log(
                  `[Feedback Update API] Saved update notification to database for admin ${adminId}`
                );
              } catch (dbError) {
                console.error(
                  `[Feedback Update API] Failed to save update notification to database for admin ${adminId}:`,
                  dbError
                );
              }

              await redisClient.disconnect();
              console.log(
                `[Feedback Update API] Disconnected Redis for admin ${adminId}.`
              );
              redisClient = undefined;
            } catch (redisError) {
              console.error(
                `[Feedback Update API] Error during Redis publishing for admin ${adminId}:`,
                redisError
              );
              if (redisClient?.isOpen) {
                try {
                  await redisClient.disconnect();
                } catch (e) {
                  /* ignore */
                }
                redisClient = undefined;
              }
            }
          } else {
            console.warn(
              `[Feedback Update API] Skipping Redis publish for updated admin ${admin._id} because admin.admin_id was missing.`
            );
          }
          // --- END: Redis Publishing (Inside Admin Loop) ---
        }
      }

      // Update in Customers
      const customers = await Customer.find(); // Inefficient
      for (const customer of customers) {
        if (updateFeedbackInEntity(customer.orders)) {
          customer.markModified("orders");
          await customer.save();
          console.log(
            "[Feedback Update API] Denormalized Customer updated:",
            customer._id
          );
        }
      }
      console.log("[Feedback Update API] Finished updating denormalized data.");
    } catch (denormalizationError) {
      console.error(
        "[Feedback Update API] Error updating denormalized data:",
        denormalizationError
      );
    }
    // --- END: Update Denormalized Data & Redis Publish ---

    return NextResponse.json({
      success: true,
      message: "Feedback updated",
      feedback: updatedFeedbackData,
    }); // Return updated feedback
  } catch (error) {
    console.error("[Feedback Update API] Error updating feedback:", error);
    if (redisClient?.isOpen) {
      // Ensure disconnect if error happened during loop publish
      try {
        await redisClient.disconnect();
      } catch (e) {
        /* ignore */
      }
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
