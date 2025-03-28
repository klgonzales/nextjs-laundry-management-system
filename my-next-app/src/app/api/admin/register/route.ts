import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/app/lib/mongodb";
import { Admin } from "@/app/models/Admin";
import { Shop } from "@/app/models/Shop";
import { PaymentMethod } from "@/app/models/PaymentMethod";

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
      payment_methods, // Array of selected payment methods (e.g., ["cash", "credit-card"])
    } = await request.json();

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    // Check if shop already exists
    const existingShop = await Shop.findOne({ shop_id });
    if (existingShop) {
      return NextResponse.json(
        { error: "Shop ID already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin ID (you might want to use a more sophisticated method)
    const admin_id = Math.floor(Math.random() * 1000000);

    // Create PaymentMethod documents for each selected payment method
    const paymentMethodDocs = await Promise.all(
      payment_methods.map(async (method: any, index: any) => {
        return await PaymentMethod.create({
          method_id: index + 1, // Generate a unique ID for each method
          name: method, // Set the name to the selected payment method (e.g., "cash")
          account_number: "1", // You can set this dynamically if needed
          status: "active", // Default status
          payments: [], // Initialize with an empty array
        });
      })
    );

    // Create new shop in the shops collection
    const newShop = await Shop.create({
      shop_id,
      type: shop_type,
      name: shop_name,
      phone: shop_phone,
      email: shop_email,
      address: shop_address,
      services,
      orders: [],
      payment_methods: paymentMethodDocs, // Associate the created PaymentMethod documents
    });

    // Create new admin
    const admin = await Admin.create({
      name,
      email,
      password: hashedPassword,
      admin_id,
      shops: [newShop],
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
