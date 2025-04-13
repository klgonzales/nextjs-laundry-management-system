import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Order } from "@/app/models/Orders";
import { Shop } from "@/app/models/Shop";
import { Admin } from "@/app/models/Admin";
import { Customer } from "@/app/models/Customer";

export async function PATCH(
  request: Request,
  context: { params: { order_id: string } }
) {
  const { params } = context;
  const orderId = params.order_id;

  try {
    await dbConnect();
    const { newStatus } = await request.json();

    console.log("Updating order:", orderId);
    console.log("New status:", newStatus);

    // Check all orders in the Orders collection to find a match by _id
    const orders = await Order.find(); // Fetch all orders
    const updatedOrder = orders.find(
      (order) => order._id.toString() === orderId
    );

    if (!updatedOrder) {
      console.error("Order not found in Orders collection:", orderId);
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update the order status if a match is found
    updatedOrder.order_status = newStatus;
    await updatedOrder.save();

    console.log("Order updated in Orders collection:");

    // Update the order status in all Shops' orders arrays
    const shops = await Shop.find(); // Fetch all shops
    for (const shop of shops) {
      shop.orders.forEach(
        (order: { _id: { toString: () => string }; order_status: any }) => {
          if (order._id.toString() === orderId) {
            order.order_status = newStatus; // Update the order_status if _id matches
          }
        }
      );
      const shopUpdateResult = await shop.save(); // Save the updated shop document
      console.log("Shop update result for shop:");
    }

    // Update the order status in the Admin's shops array
    const admins = await Admin.find({ "shops.orders._id": orderId }); // Find all admins containing the order
    for (const admin of admins) {
      admin.shops.forEach((shop: { orders: any[] }) => {
        shop.orders.forEach(
          (order: { _id: { toString: () => string }; order_status: any }) => {
            if (order._id.toString() === orderId) {
              order.order_status = newStatus; // Update the order_status if _id matches
            }
          }
        );
      });
      const adminUpdateResult = await admin.save(); // Save the updated admin document
      console.log("Admin update result:");
    }

    // Update the order status in the Customer's orders array
    const customers = await Customer.find({ "orders._id": orderId }); // Find all customers containing the order
    for (const customer of customers) {
      customer.orders.forEach(
        (order: { _id: { toString: () => string }; order_status: any }) => {
          if (order._id.toString() === orderId) {
            order.order_status = newStatus; // Update the order_status if _id matches
          }
        }
      );
      const customerUpdateResult = await customer.save(); // Save the updated customer document
      console.log("Customer update result:");
    }

    return NextResponse.json({ success: true, updatedOrder });
  } catch (error) {
    console.error("Error updating order status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
