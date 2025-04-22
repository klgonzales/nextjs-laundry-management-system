import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/app/lib/mongodb";
import { Customer } from "@/app/models/Customer"; // Assuming your model is named Customer

// --- Existing GET Handler ---
export async function GET(request: NextRequest, context: any) {
  const { customer_id } = context.params;

  try {
    await dbConnect();
    // Use lean() for read-only operations if you don't need Mongoose documents
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

// --- NEW PUT Handler for Updates ---
export async function PUT(request: NextRequest, context: any) {
  const { customer_id } = context.params;
  let updateData;

  try {
    // Parse the request body to get the data to update
    updateData = await request.json();
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  // Validate incoming data (basic example)
  if (!updateData || typeof updateData !== "object") {
    return NextResponse.json(
      { success: false, error: "Invalid update data format" },
      { status: 400 }
    );
  }

  // Select only the fields allowed for update (exclude email, _id, customer_id etc.)
  const allowedUpdates: { name?: string; phone?: string; address?: string } =
    {};
  if (updateData.name !== undefined) allowedUpdates.name = updateData.name;
  if (updateData.phone !== undefined) allowedUpdates.phone = updateData.phone;
  if (updateData.address !== undefined)
    allowedUpdates.address = updateData.address;

  // Check if there's anything to update
  if (Object.keys(allowedUpdates).length === 0) {
    return NextResponse.json(
      { success: false, error: "No valid fields provided for update" },
      { status: 400 }
    );
  }

  try {
    await dbConnect();

    // Find the customer by customer_id and update it
    // { new: true } returns the updated document
    const updatedCustomer = await Customer.findOneAndUpdate(
      { customer_id }, // Find condition
      { $set: allowedUpdates }, // Use $set to update only specified fields
      { new: true, runValidators: true } // Options: return updated doc, run schema validators
    );

    if (!updatedCustomer) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }

    // Return the updated customer data
    return NextResponse.json({ success: true, customer: updatedCustomer });
  } catch (error: any) {
    console.error("Error updating customer:", error);
    // Handle potential validation errors from Mongoose
    if (error.name === "ValidationError") {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to update customer" },
      { status: 500 }
    );
  }
}
