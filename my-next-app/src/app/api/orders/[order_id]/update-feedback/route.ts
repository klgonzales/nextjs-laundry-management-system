// PUT /api/orders/:order_id/update-feedback
import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Order } from "@/app/models/Orders";
import { Shop } from "@/app/models/Shop";
import { Admin } from "@/app/models/Admin";
import { Customer } from "@/app/models/Customer";
import { pusherServer } from "@/app/lib/pusherServer";
import { Notification } from "@/app/models/Notification"; // Add if you want notifications

export async function PUT(request: Request, context: { params: any }) {
  const { order_id } = context.params;

  try {
    await dbConnect();
    const { feedback_id, rating, comments, date_submitted } =
      await request.json();

    const updateFeedback = (entityOrders: any[]) => {
      let modified = false;
      for (const order of entityOrders) {
        if (
          order._id.toString() === order_id &&
          Array.isArray(order.feedbacks)
        ) {
          const feedback = order.feedbacks.find(
            (fb: any) => fb.feedback_id === feedback_id
          );
          if (feedback) {
            feedback.rating = rating;
            feedback.comments = comments;
            feedback.date_submitted = date_submitted;
            modified = true;
          }
        }
      }
      return modified;
    };

    // Update in Order
    const order = await Order.findById(order_id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    const targetFeedback = order.feedbacks.find(
      (fb: any) => fb.feedback_id === feedback_id
    );
    if (!targetFeedback) {
      return NextResponse.json(
        { error: "Feedback not found" },
        { status: 404 }
      );
    }

    // Get shop_id before updating
    const shop_id = order.shop;
    console.log("Shop ID:", shop_id);

    targetFeedback.rating = rating;
    targetFeedback.comments = comments;
    targetFeedback.date_submitted = date_submitted;
    await order.save();

    // Update in Shops
    const shops = await Shop.find();
    for (const shop of shops) {
      if (updateFeedback(shop.orders)) {
        shop.markModified("orders");
        await shop.save();
      }
    }

    // Update in Admins
    const admins = await Admin.find();
    let adminToNotify = null;

    for (const admin of admins) {
      for (const shop of admin.shops) {
        if (updateFeedback(shop.orders)) {
          adminToNotify = admin;
          admin.markModified("shops");
          break;
        }
      }
      await admin.save();
    }

    // Update in Customers
    const customers = await Customer.find();
    for (const customer of customers) {
      if (updateFeedback(customer.orders)) {
        customer.markModified("orders");
        await customer.save();
      }
    }

    console.log("Feedback updated:", targetFeedback);
    console.log("sdsafdsdsad");
    console.log("Feedback updated:", targetFeedback.admin_id);
    // Send Pusher notification if we found the admin
    if (adminToNotify && adminToNotify.admin_id) {
      const adminId = adminToNotify.admin_id;
      const adminChannel = `private-admin-${adminId}`;

      // Prepare the updated feedback data
      const updatedFeedbackData = {
        feedback_id,
        order_id: order_id,
        shop_id: shop_id,
        customer_id: targetFeedback.customer_id,
        rating,
        comments,
        date_submitted,
        order_number: order.order_id || order_id,
        updated: true, // Flag to indicate this is an update, not new feedback
      };

      try {
        // 1. Trigger update-feedback event
        await pusherServer.trigger(
          adminChannel,
          "update-feedback",
          updatedFeedbackData
        );
        console.log(
          `[API] Pusher: 'update-feedback' triggered on ${adminChannel}`
        );

        // 2. Create notification (optional)
        const notificationMessage = `Feedback updated for Order #${order.order_id || order_id} - New rating: ${rating}/5`;
        const notification = await Notification.create({
          message: notificationMessage,
          recipient_id: adminId,
          recipient_type: "admin",
          related_order_id: order_id,
          read: false,
          timestamp: new Date(),
        });

        // 3. Trigger notification
        await pusherServer.trigger(
          adminChannel,
          "new-notification",
          notification.toObject()
        );
        console.log(
          `[API] Pusher: 'new-notification' triggered on ${adminChannel}`
        );
      } catch (pusherError) {
        console.error("[API] Error triggering Pusher event:", pusherError);
      }
    }

    return NextResponse.json({ success: true, message: "Feedback updated" });
  } catch (error) {
    console.error("Error updating feedback:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
