import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Shop } from "@/app/models/Shop";

// Define interfaces for better type safety
interface PaymentProof {
  amount_paid?: number;
  payment_date: Date;
  reference_number?: string;
  payment_method: string;
}

interface OrderWithPayment {
  _id: any;
  order_id: string;
  customer_id: string;
  payment_status: string;
  total_price: number;
  date_placed: Date;
  payment_method: string;
  proof_of_payment?: PaymentProof;
}

interface ShopWithOrders {
  orders?: OrderWithPayment[];
}

export async function GET(request: Request, context: { params: any }) {
  try {
    await dbConnect();

    const { shop_id } = context.params;

    // Find shop with orders that have payments
    const shop = (await Shop.findOne({ shop_id })
      .select("orders")
      .lean()) as ShopWithOrders;

    if (!shop) {
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 }
      );
    }

    // Check if shop has orders
    if (!shop.orders || !Array.isArray(shop.orders)) {
      return NextResponse.json({
        success: true,
        payments: [],
        message: "No orders found for this shop",
      });
    }

    // Extract orders with proof_of_payment
    const payments = shop.orders
      .filter((order) => order.proof_of_payment && order.payment_status)
      .map((order) => {
        // Return a formatted payment object with essential data
        return {
          _id: order._id,
          order_id: order.order_id,
          customer_id: order.customer_id,
          payment_status: order.payment_status,
          total_price: order.total_price,
          date_placed: order.date_placed,
          payment_method: order.payment_method,
          proof_of_payment: [
            {
              amount_paid: order.proof_of_payment?.amount_paid || 0,
              payment_date: order.proof_of_payment?.payment_date,
              reference_number: order.proof_of_payment?.reference_number || "",
              payment_method:
                order.proof_of_payment?.payment_method || "unknown",
            },
          ],
          shop_id: shop_id,
        };
      })
      .sort((a, b) => {
        // Sort by payment date descending
        const dateA = a.proof_of_payment[0]?.payment_date
          ? new Date(a.proof_of_payment[0].payment_date).getTime()
          : 0;
        const dateB = b.proof_of_payment[0]?.payment_date
          ? new Date(b.proof_of_payment[0].payment_date).getTime()
          : 0;
        return dateB - dateA;
      });

    return NextResponse.json({
      success: true,
      payments,
    });
  } catch (error) {
    console.error("Error fetching payment analytics:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch payment data" },
      { status: 500 }
    );
  }
}
