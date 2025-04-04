import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/app/lib/mongodb";
import { Admin } from "@/app/models/Admin";
import { Shop } from "@/app/models/Shop";
import { PaymentMethod } from "@/app/models/PaymentMethod";

function convertOpeningHours(
  openingHours: Record<string, { start: string; end: string }>
) {
  return Object.entries(openingHours).map(([day, hours]) => ({
    day,
    open: hours.start,
    close: hours.end,
  }));
}

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
      payment_methods,
      opening_hours, // Opening hours object from the frontend
      delivery_fee,
    } = await request.json();

    // Convert opening_hours to the array format
    const convertedOpeningHours = convertOpeningHours(opening_hours);

    // Validate services array
    const validatedServices = services.map((service: any) => {
      if (!service.description || service.description.trim() === "") {
        service.description = `${service.name} service`; // Add default description
      }
      return service;
    });

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

    // Create new shop in the shops collection
    const newShop = await Shop.create({
      shop_id,
      type: shop_type,
      name: shop_name,
      phone: shop_phone,
      email: shop_email,
      address: shop_address,
      services: validatedServices,
      orders: [],
      payment_methods: payment_methods.map((method: any, index: number) => ({
        method_id: index + 1,
        name: method,
        account_number: "1", // Default account number
        status: "active", // Default status
        payments: [], // Initialize with an empty array
      })),
      opening_hours: convertedOpeningHours, // Use the converted format
      delivery_fee,
    });

    // Create new admin
    const admin = await Admin.create({
      name,
      email,
      password: hashedPassword,
      admin_id: Math.floor(Math.random() * 1000000),
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
