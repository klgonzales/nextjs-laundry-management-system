import { NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Customer } from "@/app/models/Customer";

interface RequestParams {
  params: {
    customer_id: string;
  };
}

interface CustomerResponse {
  customer: Record<string, any> | null;
  error?: string;
}
export async function GET(request: Request, { params }: RequestParams) {
  const { customer_id } = params;

  try {
    await dbConnect();

    console.log("Querying customer_id:", customer_id); // Log the customer_id being queried

    const customer = await Customer.findOne({ customer_id }).lean();

    console.log("Query result:", customer); // Log the query result

    if (!customer) {
      return NextResponse.json(
        { customer: null, error: "customer not found" },
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
