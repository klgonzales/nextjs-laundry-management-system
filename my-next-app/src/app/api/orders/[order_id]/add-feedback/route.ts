import { NextResponse, NextRequest } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Order } from "@/app/models/Orders";
import { Shop } from "@/app/models/Shop";
import { Admin } from "@/app/models/Admin";
import { Customer } from "@/app/models/Customer";
import { createClient } from "redis";
import mongoose from "mongoose";
import { Notification } from "@/app/models/Notification"; // Optional

export async function PATCH(request: NextRequest, context: any) {
  const { order_id } = context.params;
  const orderId = order_id;
  let redisClient: ReturnType<typeof createClient> | undefined; // Define redisClient variable with explicit type

  try {
    await dbConnect();
    const {
      feedback_id,
      shop_id,
      customer_id,
      rating,
      comments,
      date_submitted,
    } = await request.json();

    // --- Construct feedback object (shop_id added later) ---
    const newFeedback = {
      feedback_id: feedback_id || new mongoose.Types.ObjectId().toString(),
      customer_id: customer_id,
      order_id: orderId,
      shop_id: shop_id, // Initialize shop_id, will be set after finding the order
      rating: rating,
      comments: comments,
      date_submitted: date_submitted || new Date().toISOString(),
    };

    console.log(`[Feedback API] Adding feedback to order: ${orderId}`);

    // --- Update Orders collection (Your existing inefficient logic) ---
    console.log(
      "[Feedback API] Fetching all orders to find the target order..."
    );
    const orders = await Order.find(); // Inefficient
    const updatedOrder = orders.find(
      (order) => order._id.toString() === orderId
    );

    if (!updatedOrder) {
      console.error(
        "[Feedback API] Order not found in Orders collection:",
        orderId
      );
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Add shop_id to the feedback object now that we have the order
    newFeedback.shop_id = updatedOrder.shop;
    const shopIdFromOrder = updatedOrder.shop; // Store shop_id for potential use
    console.log(
      `[Feedback API] Order's shop_id is: ${shopIdFromOrder} (Type: ${typeof shopIdFromOrder})`
    );

    // Add feedback to the order document
    updatedOrder.feedbacks = updatedOrder.feedbacks || [];
    updatedOrder.feedbacks.push(newFeedback);
    await updatedOrder.save();
    console.log(
      "[Feedback API] Feedback added successfully to order document:",
      orderId
    );
    // --- End Order Update ---

    // --- START: Update Denormalized Data & Redis Publish (Combined - Not Recommended) ---
    console.log(
      "[Feedback API] Starting update of denormalized data & potential Redis publish..."
    );
    try {
      // Update feedbacks in Shops
      const shops = await Shop.find(); // Inefficient
      for (const shop of shops) {
        let modified = false;
        shop.orders.forEach((order: any) => {
          if (order._id.toString() === orderId) {
            order.feedbacks = order.feedbacks || [];
            if (
              !order.feedbacks.some(
                (fb: any) => fb.feedback_id === newFeedback.feedback_id
              )
            ) {
              order.feedbacks.push(newFeedback);
              modified = true;
            }
          }
        });
        if (modified) {
          shop.markModified("orders");
          await shop.save();
          console.log("[Feedback API] Denormalized Shop updated:", shop._id);
        }
      }

      // Update feedbacks in Admins & Attempt Redis Publish
      const admins = await Admin.find(); // Inefficient
      for (const admin of admins) {
        let modified = false;
        let shopNameForNotification = "your shop"; // Default shop name

        admin.shops.forEach((shop: any) => {
          // Find the shop name if it matches shopIdFromOrder (for notification)
          if (shop.shop_id === shopIdFromOrder && shop.name) {
            shopNameForNotification = shop.name;
          }
          // Check orders within this shop
          shop.orders.forEach((order: any) => {
            if (order._id.toString() === orderId) {
              order.feedbacks = order.feedbacks || [];
              if (
                !order.feedbacks.some(
                  (fb: any) => fb.feedback_id === newFeedback.feedback_id
                )
              ) {
                order.feedbacks.push(newFeedback);
                modified = true; // Mark admin as modified if feedback was added
              }
            }
          });
        });

        if (modified) {
          admin.markModified("shops");
          await admin.save();
          console.log("[Feedback API] Denormalized Admin updated:", admin._id);

          // --- Get adminId from the current admin in the loop ---
          const adminId = admin.admin_id;
          console.log(
            `[Feedback API] Attempting Redis publish for adminId found in loop: ${adminId}`
          );

          // --- START: Redis Publishing (Inside Admin Loop - Problematic) ---
          // WARNING: This block runs for *every* admin that was modified.
          // It also runs *after* the denormalization save, not immediately.
          // It might not target the correct admin if the 'modified' logic is complex
          // or if the loop processes an admin unrelated to shopIdFromOrder but still gets modified.
          if (adminId) {
            // Check if adminId exists on the admin object
            try {
              redisClient = createClient({ url: process.env.REDIS_URL });
              redisClient.on("error", (err) =>
                console.error(
                  "[Feedback API] Redis Client Error (in loop)",
                  err
                )
              );
              await redisClient.connect();
              console.log(
                `[Feedback API] Connected to Redis for admin ${adminId}.`
              );

              // 1. Publish Real-time Feedback Update
              const feedbackChannel = `new-feedback:admin:${adminId}`;
              await redisClient.publish(
                feedbackChannel,
                JSON.stringify(newFeedback)
              );
              console.log(
                `[Feedback API] Published feedback update to Redis channel: ${feedbackChannel}`
              );

              // 2. Publish Notification
              const notificationChannel = `admin-notifications:${adminId}`;
              const notificationData = {
                _id: new mongoose.Types.ObjectId().toString(),
                message: `New feedback received for ${shopNameForNotification}. Rating: ${newFeedback.rating}`,
                timestamp: new Date().toISOString(),
                read: false,
                link: `/admin/shop-self-service/feedback`,
                recipient_id: adminId,
                recipient_type: "admin",
              };
              await redisClient.publish(
                notificationChannel,
                JSON.stringify(notificationData)
              );
              console.log(
                `[Feedback API] Published feedback notification to Redis channel: ${notificationChannel}`
              );

              // --- Add this line to save to DB ---
              try {
                await Notification.create(notificationData);
                console.log(
                  `[Feedback API] Saved notification to database for admin ${adminId}`
                );
              } catch (dbError) {
                console.error(
                  `[Feedback API] Failed to save notification to database for admin ${adminId}:`,
                  dbError
                );
                // Decide if you want to handle this error specifically
              }
              // --- End Save to DB ---

              await redisClient.disconnect();
              console.log(
                `[Feedback API] Disconnected Redis for admin ${adminId}.`
              );
              redisClient = undefined;
            } catch (redisError) {
              console.error(
                `[Feedback API] Error during Redis publishing for admin ${adminId}:`,
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
              `[Feedback API] Skipping Redis publish for updated admin ${admin._id} because admin.admin_id was missing.`
            );
          }
          // --- END: Redis Publishing (Inside Admin Loop) ---
        }
      }

      // Update feedbacks in Customers
      const customers = await Customer.find(); // Inefficient
      for (const customer of customers) {
        let modified = false;
        customer.orders.forEach((order: any) => {
          if (order._id.toString() === orderId) {
            order.feedbacks = order.feedbacks || [];
            if (
              !order.feedbacks.some(
                (fb: any) => fb.feedback_id === newFeedback.feedback_id
              )
            ) {
              order.feedbacks.push(newFeedback);
              modified = true;
            }
          }
        });
        if (modified) {
          customer.markModified("orders");
          await customer.save();
          console.log(
            "[Feedback API] Denormalized Customer updated:",
            customer._id
          );
        }
      }
      console.log("[Feedback API] Finished updating denormalized data.");
    } catch (denormalizationError) {
      console.error(
        "[Feedback API] Error updating denormalized data:",
        denormalizationError
      );
    }
    // --- END: Update Denormalized Data & Redis Publish ---

    return NextResponse.json({ success: true, feedback: newFeedback });
  } catch (error) {
    console.error(
      "[Feedback API] Error in PATCH /api/orders/[order_id]/add-feedback:",
      error
    );
    // Ensure Redis disconnects if an error occurred *during* publishing in the loop
    if (redisClient?.isOpen) {
      try {
        await redisClient.disconnect();
      } catch (e) {
        /* ignore */
      }
    }
    return NextResponse.json(
      { error: "Internal server error adding feedback" },
      { status: 500 }
    );
  }
}
