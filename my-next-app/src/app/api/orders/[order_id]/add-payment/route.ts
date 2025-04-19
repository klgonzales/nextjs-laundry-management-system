import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Order } from "@/app/models/Orders";
import { Shop } from "@/app/models/Shop";
import { Admin } from "@/app/models/Admin";
import { Customer } from "@/app/models/Customer";

export async function PATCH(request: Request, context: { params: any }) {
  const { params } = context;
  const orderId = params.order_id;

  try {
    await dbConnect();
    const {
      payment_id,
      customer_id,
      order_id,
      shop_id,
      amount_sent,
      amount_paid,
      screenshot,
      reference_number,
      paid_the_driver,
      payment_method,
      payment_date,
    } = await request.json();

    const newProofOfPayment = {
      payment_id,
      customer_id,
      order_id,
      shop_id,
      amount_sent,
      amount_paid,
      screenshot,
      reference_number,
      paid_the_driver,
      payment_method,
      payment_date,
    };

    console.log("Adding proof of payment to order:", orderId);

    // Update Orders collection
    const orders = await Order.find();
    const updatedOrder = orders.find(
      (order) => order._id.toString() === orderId
    );

    if (!updatedOrder) {
      console.error("Order not found in Orders collection:", orderId);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    updatedOrder.proof_of_payment = newProofOfPayment;
    await updatedOrder.save();

    // Update proof_of_payment in Shops
    const shops = await Shop.find();
    for (const shop of shops) {
      let modified = false;

      shop.orders.forEach((order: any) => {
        if (order._id.toString() === orderId) {
          order.proof_of_payment = newProofOfPayment;
          modified = true;
        }
      });

      if (modified) {
        shop.markModified("orders");
        await shop.save();
        console.log("Shop updated:", shop._id);
      }
    }

    // Update proof_of_payment in Admins
    const admins = await Admin.find();
    for (const admin of admins) {
      let modified = false;

      admin.shops.forEach((shop: any) => {
        shop.orders.forEach((order: any) => {
          if (order._id.toString() === orderId) {
            order.proof_of_payment = newProofOfPayment;
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

    // Update proof_of_payment in Customers
    const customers = await Customer.find();
    for (const customer of customers) {
      let modified = false;

      customer.orders.forEach((order: any) => {
        if (order._id.toString() === orderId) {
          order.proof_of_payment = newProofOfPayment;
          modified = true;
        }
      });

      if (modified) {
        customer.markModified("orders");
        await customer.save();
        console.log("Customer updated:", customer._id);
      }
    }

    return NextResponse.json({ success: true, newProofOfPayment });
  } catch (error) {
    console.error("Error saving proof of payment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
