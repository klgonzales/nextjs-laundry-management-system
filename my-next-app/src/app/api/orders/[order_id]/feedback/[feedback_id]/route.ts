// DELETE /api/orders/:order_id/delete-feedback/:feedback_id
import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Order } from "@/app/models/Orders";
import { Shop } from "@/app/models/Shop";
import { Admin } from "@/app/models/Admin";
import { Customer } from "@/app/models/Customer";
import { pusherServer } from "@/app/lib/pusherServer";

export async function DELETE(request: Request, context: { params: any }) {
  const { order_id, feedback_id } = context.params;

  try {
    await dbConnect();

    // Store the order before modifying it to get the shop_id
    const order = await Order.findById(order_id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    // Store the feedback before deletion for notification
    const feedbackToDelete = order.feedbacks.find(
      (fb: any) => fb.feedback_id === feedback_id
    );
    if (!feedbackToDelete) {
      return NextResponse.json(
        { error: "Feedback not found" },
        { status: 404 }
      );
    }

    // Get the shop_id from the order
    const shop_id = order.shop;
    console.log("Shop ID for deleted feedback:", shop_id);

    // Store original feedback for notification
    const deletedFeedbackData = {
      feedback_id,
      order_id,
      customer_id: feedbackToDelete.customer_id,
      rating: feedbackToDelete.rating,
      shop_id: shop_id,
      order_number: order.order_id || order_id,
    };

    const removeFeedback = (entityOrders: any[]) => {
      for (const order of entityOrders) {
        if (
          order._id.toString() === order_id &&
          Array.isArray(order.feedbacks)
        ) {
          const originalLength = order.feedbacks.length;
          order.feedbacks = order.feedbacks.filter(
            (fb: any) => fb.feedback_id !== feedback_id
          );
          if (order.feedbacks.length !== originalLength) return true;
        }
      }
      return false;
    };

    // Orders
    //const order = await Order.findById(order_id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    order.feedbacks = order.feedbacks.filter(
      (fb: any) => fb.feedback_id !== feedback_id
    );
    await order.save();

    // Shops
    const shops = await Shop.find();
    for (const shop of shops) {
      if (removeFeedback(shop.orders)) {
        shop.markModified("orders");
        await shop.save();
      }
    }

    // Admins
    const admins = await Admin.find();
    let adminToNotify = null;

    for (const admin of admins) {
      for (const shop of admin.shops) {
        if (removeFeedback(shop.orders)) {
          adminToNotify = admin;
          admin.markModified("shops");
          break;
        }
      }
      await admin.save();
    }

    // Customers
    const customers = await Customer.find();
    for (const customer of customers) {
      if (removeFeedback(customer.orders)) {
        customer.markModified("orders");
        await customer.save();
      }
    }

    // Send Pusher notification if we found the admin
    if (adminToNotify && adminToNotify.admin_id) {
      const adminId = adminToNotify.admin_id;
      const adminChannel = `private-admin-${adminId}`;

      try {
        // Send delete-feedback event
        await pusherServer.trigger(adminChannel, "delete-feedback", {
          ...deletedFeedbackData,
          deleted: true,
        });
        console.log(
          `[API] Pusher: 'delete-feedback' triggered on ${adminChannel}`
        );

        // Optional: Create a notification for the admin
        const notificationMessage = `Feedback deleted for Order #${order.order_id || order_id}`;

        // You can uncomment this if you have notifications set up
        /*
        const notification = await Notification.create({
          message: notificationMessage,
          recipient_id: adminId,
          recipient_type: "admin",
          related_order_id: order_id,
          read: false,
          timestamp: new Date()
        });
        
        // Trigger notification event
        await pusherServer.trigger(
          adminChannel,
          "new-notification",
          notification.toObject()
        );
        */
      } catch (pusherError) {
        console.error("[API] Error triggering Pusher event:", pusherError);
        // Continue anyway since the feedback was deleted successfully
      }
    }

    return NextResponse.json({ success: true, message: "Feedback deleted" });
  } catch (error) {
    console.error("Error deleting feedback:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
