import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/app/lib/mongodb";
import { Admin } from "../../../models/Admin";

export async function POST(request: Request) {
  try {
    await dbConnect();

    const { email: rawEmail, password: rawPassword } = await request.json();
    const email = rawEmail.trim();
    const password = rawPassword.trim();

    console.log(`Login attempt for: ${email}`);

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
    // For debugging only - remove in production
    console.log(`Raw password input: ${password}`);
    console.log(
      `Stored hashed password: ${admin.password.substring(0, 10)}...`
    );
    console.log(`Password check for ${email}: ${isPasswordValid}`);

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
        id: admin._id.toString(), // Convert ObjectId to string
        name: admin.name, // Add name
        email: admin.email, // Add email
        admin_id: admin.admin_id,
        shops: admin.shops,
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
