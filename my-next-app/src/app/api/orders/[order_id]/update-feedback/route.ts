// PUT /api/orders/:order_id/update-feedback
import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Order } from "@/app/models/Orders";
import { Shop } from "@/app/models/Shop";
import { Admin } from "@/app/models/Admin";
import { Customer } from "@/app/models/Customer";

export async function PUT(
  request: Request,
  context: { params: { order_id: string } }
) {
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
    for (const admin of admins) {
      for (const shop of admin.shops) {
        if (updateFeedback(shop.orders)) {
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

    return NextResponse.json({ success: true, message: "Feedback updated" });
  } catch (error) {
    console.error("Error updating feedback:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
