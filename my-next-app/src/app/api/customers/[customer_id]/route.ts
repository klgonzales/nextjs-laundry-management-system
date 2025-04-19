import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Customer } from "@/app/models/Customer";

export async function GET(request: NextRequest, context: any) {
  const { customer_id } = context.params;

  try {
    await dbConnect();
    const customer = await Customer.findOne({ customer_id }).lean();

    if (!customer) {
      return NextResponse.json(
        { customer: null, error: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ customer });
  } catch (error) {
    console.error("Error fetching customer details:", error);
    return NextResponse.json(
      { customer: null, error: "Failed to fetch customer details" },
      { status: 500 }
    );
  }
}
