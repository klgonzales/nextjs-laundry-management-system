import mongoose, { Schema, Document } from "mongoose";

interface AdminDocument extends Document {
  admin_id: string;
  name: string;
  email: string;
  password: string;
  shops: Record<string, any>[]; // Array of full shop objects
  orders: Record<string, any>[]; // Array of full shop objects
  role: string; // Role of the admin (e.g., "admin")
}

const AdminSchema = new Schema<AdminDocument>({
  admin_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  shops: [{ type: Object }], // Store full shop objects
  orders: [{ type: Object }], // Store full shop objects
  role: { type: String, required: true, enum: ["admin"] }, // Role of the admin
});

export const Admin =
  mongoose.models.Admin || mongoose.model<AdminDocument>("Admin", AdminSchema);
