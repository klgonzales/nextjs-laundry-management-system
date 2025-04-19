import { NextResponse, NextRequest } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Order } from "@/app/models/Orders";
import { Shop } from "@/app/models/Shop";
import { Admin } from "@/app/models/Admin";
import { Customer } from "@/app/models/Customer";

export async function PATCH(request: NextRequest, context: any) {
  const { order_id } = context.params;
  const orderId = order_id;

  try {
    await dbConnect();
    const { feedback_id, customer_id, rating, comments, date_submitted } =
      await request.json();

    const newFeedback = {
      feedback_id: feedback_id,
      customer_id: customer_id,
      order_id: orderId,
      rating: rating,
      comments: comments,
      date_submitted: date_submitted,
    };

    console.log("Adding feedback to order:", orderId);

    // Update Orders collection
    const orders = await Order.find();
    const updatedOrder = orders.find(
      (order) => order._id.toString() === orderId
    );

    if (!updatedOrder) {
      console.error("Order not found in Orders collection:", orderId);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    updatedOrder.feedbacks = updatedOrder.feedbacks || [];
    updatedOrder.feedbacks.push(newFeedback);
    await updatedOrder.save();

    // Update feedbacks in Shops
    const shops = await Shop.find();
    for (const shop of shops) {
      let modified = false;

      shop.orders.forEach(
        (order: {
          _id: { toString: () => string };
          feedbacks: {
            feedback_id: string;
            customer_id: any;
            order_id: string;
            rating: any;
            comments: any;
            date_submitted: string;
          }[];
        }) => {
          if (order._id.toString() === orderId) {
            order.feedbacks = order.feedbacks || [];
            order.feedbacks.push(newFeedback);
            modified = true;
          }
        }
      );

      if (modified) {
        shop.markModified("orders");
        await shop.save();
        console.log("Shop updated:", shop._id);
      }
    }

    // Update feedbacks in Admins
    const admins = await Admin.find();
    for (const admin of admins) {
      let modified = false;

      admin.shops.forEach((shop: { orders: any[] }) => {
        shop.orders.forEach((order) => {
          if (order._id.toString() === orderId) {
            order.feedbacks = order.feedbacks || [];
            order.feedbacks.push(newFeedback);
            modified = true;
          }
        });
      });

      if (modified) {
        admin.markModified("shops");
        await admin.save();
        console.log("Admin updated:", admin._id);
      }
    }

    // Update feedbacks in Customers
    const customers = await Customer.find();
    for (const customer of customers) {
      let modified = false;

      customer.orders.forEach(
        (order: {
          _id: { toString: () => string };
          feedbacks: {
            feedback_id: string;
            customer_id: any;
            order_id: string;
            rating: any;
            comments: any;
            date_submitted: string;
          }[];
        }) => {
          if (order._id.toString() === orderId) {
            order.feedbacks = order.feedbacks || [];
            order.feedbacks.push(newFeedback);
            modified = true;
          }
        }
      );

      if (modified) {
        customer.markModified("orders");
        await customer.save();
        console.log("Customer updated:", customer._id);
      }
    }

    return NextResponse.json({ success: true, newFeedback });
  } catch (error) {
    console.error("Error adding feedback:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
