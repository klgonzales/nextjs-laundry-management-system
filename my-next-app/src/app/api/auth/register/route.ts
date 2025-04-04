import { NextResponse } from "next/server";
import dbConnect from "../../../lib/mongodb";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Test database connection
export async function GET() {
  try {
    await dbConnect();
    const isConnected = mongoose.connection.readyState === 1;
    const databaseName = mongoose.connection.db?.databaseName;

    return NextResponse.json({
      status: isConnected ? "success" : "error",
      connection: {
        state: isConnected ? "Connected" : "Disconnected",
        database: databaseName || "Not connected",
        message: isConnected
          ? `Successfully connected to ${databaseName} database`
          : "Not connected to database",
      },
    });
  } catch (error) {
    console.error("Database connection error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Failed to connect to database",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Handle user registration
export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { name, email, password, phone, address } = body;

    // Check if user exists
    const existingUser = await mongoose.connection.db
      ?.collection("customers")
      .findOne({ email });

    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    await mongoose.connection.db?.collection("customers").insertOne({
      name,
      email,
      password: hashedPassword,
      phone,
      address,
      role: "customer",
      customer_id: Math.floor(Date.now()).toString(),
    });

    return NextResponse.json(
      { message: "User registered successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { message: "Error registering user" },
      { status: 500 }
    );
  }
}
