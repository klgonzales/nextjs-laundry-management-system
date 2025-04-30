import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Shop } from "@/app/models/Shop";

export async function GET(
  request: NextRequest,
  { params }: { params: { shop_id: string } }
) {
  try {
    await dbConnect();

    const shop_id = params.shop_id;

    // Find shop with orders that have payments
    const shop = await Shop.findOne<{ orders: any[] }>({ shop_id })
      .select("orders")
      .lean();

    if (!shop) {
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 }
      );
    }

    // Extract orders with proof_of_payment
    const payments = shop.orders
      .filter((order: any) => order.proof_of_payment && order.payment_status)
      .map((order: any) => {
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
              amount_paid: order.proof_of_payment.amount_paid || 0,
              payment_date: order.proof_of_payment.payment_date,
              reference_number: order.proof_of_payment.reference_number || "",
              payment_method: order.proof_of_payment.payment_method,
            },
          ],
          shop_id: shop_id,
        };
      })
      .sort((a: any, b: any) => {
        // Sort by payment date descending
        const dateA = new Date(
          a.proof_of_payment[0].payment_date || 0
        ).getTime();
        const dateB = new Date(
          b.proof_of_payment[0].payment_date || 0
        ).getTime();
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
