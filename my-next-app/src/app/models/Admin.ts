import mongoose, { Schema, Document } from "mongoose";

interface AdminDocument extends Document {
  admin_id: number;
  name: string;
  email: string;
  password: string;
  shops: mongoose.Types.ObjectId[]; // Reference to Shop collection
  orders: mongoose.Types.ObjectId[]; // Reference to Order collection
}

const AdminSchema = new Schema<AdminDocument>({
  admin_id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  shops: [{ type: mongoose.Schema.Types.ObjectId, ref: "Shop" }], // Reference to Shop
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }], // Reference to Order
});

export const Admin =
  mongoose.models.Admin || mongoose.model<AdminDocument>("Admin", AdminSchema);
