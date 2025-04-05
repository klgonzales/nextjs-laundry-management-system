import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/app/lib/mongodb";
import { Admin } from "../../../models/Admin";

export async function POST(request: Request) {
  try {
    await dbConnect();
    const { email, password } = await request.json();

    // Find admin by email
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Password is valid - return admin data (excluding password)
    const adminData = {
      id: admin._id,
      email: admin.email,
      admin_id: admin.admin_id,
      role: admin.role,
    };

    return NextResponse.json({
      message: "Login successful",
      admin: {
        admin_id: admin.admin_id,
        shops: admin.shops, // Include shops in the response
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
