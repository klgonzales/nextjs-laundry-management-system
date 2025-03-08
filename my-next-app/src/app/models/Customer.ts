import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  customer_id: { type: String, required: true, unique: true },
  role: { type: String, default: "customer" },
});

export const Customer =
  mongoose.models.Customer || mongoose.model("Customer", customerSchema);
