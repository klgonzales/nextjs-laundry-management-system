import mongoose, { Schema, Document } from "mongoose";

export interface CustomerDocument extends Document {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  role: string;
  customer_id: string; // Ensure this is a string
  shops: Record<string, any>[]; // Array of full shop objects
  orders: Record<string, any>[]; // Array of full shop objects
  messages: mongoose.Types.ObjectId[]; // Array of message IDs
}

const CustomerSchema = new Schema<CustomerDocument>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  role: { type: String, required: true, enum: ["customer", "admin"] },
  customer_id: { type: String, required: true }, // Ensure this is a string
  shops: [{ type: Object }], // Store full shop objects
  orders: [{ type: Object }], // Store full shop objects
  messages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Message" }], // Reference Message model
});

export const Customer =
  mongoose.models.Customer ||
  mongoose.model<CustomerDocument>("Customer", CustomerSchema);
