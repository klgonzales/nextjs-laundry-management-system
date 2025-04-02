import { NextResponse } from "next/server";
import { Customer } from "@/app/models/Customer";
import dbConnect from "@/app/lib/mongodb";

export async function GET(
  request: Request,
  { params }: { params: { customer_id: string } }
) {
  try {
    await dbConnect();

    // Fetch the customer by ID
    const customer = await Customer.findById(params.customer_id);

    if (!customer) {
      return NextResponse.json(
        { error: "customer not found" },
        { status: 404 }
      );
    }

    console.log("customer fetched", customer);
    return NextResponse.json(customer);
  } catch (error) {
    console.error("Error fetching customer:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
