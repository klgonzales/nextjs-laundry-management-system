import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  admin_id: { type: String, required: true, unique: true },
  shop_id: { type: Number, required: true },
  shop_type: { type: String, required: true },
});

export const Admin =
  mongoose.models.Admin || mongoose.model("Admin", adminSchema);
