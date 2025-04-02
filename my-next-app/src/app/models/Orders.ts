import mongoose, { Schema, Document } from "mongoose";

interface ClothingItem {
  type: string; // Type of clothing (e.g., "Shirt", "Pants", "Jacket")
  quantity: number; // Quantity of this type of clothing
}

export interface OrderDocument extends Document {
  order_id: number;
  customer_id: number;
  order_type: string | null; // Type of order (e.g., "self-service", "pickup&delivery")
  service_id: number[];
  machine_id: number | null;
  payment_status: string;
  order_status: string;
  total_weight: number;
  total_price: number;
  date_placed: Date;
  date_completed: Date | null;
  clothes: ClothingItem[]; // Array of clothing items with type and quantity
  date: Date | null;
  delivery_instructions: string;
  feedbacks: string[];
  payment_method: string;
  services: string[];
  soap: boolean | null;
  time_range: {
    t: number | null;
    i: number | null;
  };
  shop: { type: String; required: true }; // Reference to Shop
  address: string | null; // Address for pickup/delivery
}

const ClothingItemSchema = new Schema<ClothingItem>({
  type: { type: String, required: true }, // Type of clothing
  quantity: { type: Number, required: true }, // Quantity of clothing
});

const OrderSchema = new Schema<OrderDocument>({
  order_id: { type: Number, required: true, unique: true },
  customer_id: { type: Number, required: true },
  order_type: { type: String, default: null },
  service_id: { type: [Number], required: true },
  machine_id: { type: Number, default: null },
  payment_status: { type: String, required: true, enum: ["pending", "paid"] },
  order_status: {
    type: String,
    required: true,
    enum: ["pending", "in progress", "completed", "cancelled"],
  },
  total_weight: { type: Number, required: true },
  total_price: { type: Number, required: true },
  date_placed: { type: Date, required: true },
  date_completed: { type: Date, default: null },
  clothes: { type: [ClothingItemSchema], default: [] }, // Array of clothing items
  date: { type: Date, default: null }, // Date of order placement
  delivery_instructions: { type: String, default: "" },
  feedbacks: { type: [String], default: [] },
  payment_method: { type: String, default: "" },
  services: { type: [String], default: [] },
  soap: { type: Boolean, default: null }, // Indicates if soap is included
  time_range: {
    t: { type: Number, default: null }, // Time range for pickup/delivery
    i: { type: Number, default: null },
  },
  shop: { type: String, required: true }, // Reference to Shop
  address: { type: String, default: null }, // Address for pickup/delivery
});

export const Order =
  mongoose.models.Order || mongoose.model<OrderDocument>("Order", OrderSchema);
