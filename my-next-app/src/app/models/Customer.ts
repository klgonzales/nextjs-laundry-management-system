import mongoose, { Schema, Document } from "mongoose";

interface customerDocument extends Document {
  name: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  role: string;
  customer_id: string;
}

const customerSchema = new Schema<customerDocument>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  role: { type: String, required: true, enum: ["customer", "admin"] },
  customer_id: { type: String, required: true },
});

export const Customer =
  mongoose.models.Customer ||
  mongoose.model<customerDocument>("Customer", customerSchema);
