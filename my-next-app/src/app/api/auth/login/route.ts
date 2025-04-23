import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "../../../lib/mongodb";
import { Customer } from "../../../models/Customer";

export async function POST(request: Request) {
  try {
    await dbConnect();

    const { email, password } = await request.json();

    // Find user by email
    const user = await Customer.findOne({ email }).select(
      "name email customer_id role phone address password"
    );

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Password is valid - return user data (excluding password)
    const userData = {
      name: user.name,
      email: user.email,
      customer_id: user.customer_id,
      role: user.role,
      phone: user.phone,
      address: user.address,
    };

    console.log("User logged in:", userData);

    return NextResponse.json({
      message: "Login successful",
      user: userData,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
