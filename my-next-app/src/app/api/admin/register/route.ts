import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/app/lib/mongodb";
import { Admin } from "@/app/models/Admin";

export async function POST(request: Request) {
  try {
    await dbConnect();
    const {
      name,
      email,
      password,
      shop_id,
      shop_type,
      shop_name,
      shop_phone,
      shop_email,
      shop_address,
      services,
      orders,
      payment_methods,
    } = await request.json();

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin ID (you might want to use a more sophisticated method)
    const admin_id = Math.floor(Math.random() * 1000000);

    // Create new admin
    const admin = await Admin.create({
      name,
      email,
      password: hashedPassword,
      admin_id,
      shops: [
        {
          shop_id,
          type: shop_type,
          name: shop_name,
          phone: shop_phone,
          email: shop_email,
          address: shop_address,
          services,
          orders: [],
          payment_methods,
        },
      ],
    });

    return NextResponse.json({
      message: "Admin registered successfully",
      admin: {
        id: admin._id,
        email: admin.email,
        admin_id: admin.admin_id,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
