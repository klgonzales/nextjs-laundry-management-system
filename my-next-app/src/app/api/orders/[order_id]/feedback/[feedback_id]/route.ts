// DELETE /api/orders/:order_id/delete-feedback/:feedback_id
import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Order } from "@/app/models/Orders";
import { Shop } from "@/app/models/Shop";
import { Admin } from "@/app/models/Admin";
import { Customer } from "@/app/models/Customer";

export async function DELETE(request: Request, context: { params: any }) {
  const { order_id, feedback_id } = context.params;

  try {
    await dbConnect();

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
    const order = await Order.findById(order_id);
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
    for (const admin of admins) {
      for (const shop of admin.shops) {
        if (removeFeedback(shop.orders)) {
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

    return NextResponse.json({ success: true, message: "Feedback deleted" });
  } catch (error) {
    console.error("Error deleting feedback:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
