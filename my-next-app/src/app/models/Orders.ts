import mongoose, { Schema, Document } from "mongoose";

interface ClothingItem {
  type: string; // Type of clothing (e.g., "Shirt", "Pants", "Jacket")
  quantity: number; // Quantity of this type of clothing
}

export interface OrderDocument extends Document {
  order_id: string;
  customer_id: string;
  order_type: string | null; // Type of order (e.g., "self-service", "pickup&delivery")
  service_id: number[];
  machine_id: string | null;
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
  time_range: string[];
  shop: { type: String; required: true }; // Reference to Shop
  address: string | null; // Address for pickup/delivery
  pickup_date: Date | null; // Pickup date
  pickup_time: string[] | null; // Pickup time
}

const ClothingItemSchema = new Schema<ClothingItem>({
  type: { type: String, required: true }, // Type of clothing
  quantity: { type: Number, required: true }, // Quantity of clothing
});

const OrderSchema = new Schema<OrderDocument>({
  order_id: { type: String, required: true, unique: true },
  customer_id: { type: String, required: true }, // Customer ID
  order_type: { type: String, default: null },
  service_id: { type: [Number], required: true },
  machine_id: { type: String, default: null },
  payment_status: {
    type: String,
    required: true,
    enum: ["pending", "paid", "cancelled"],
  },
  order_status: {
    type: String,
    required: true,
    enum: [
      "pending",
      "in progress",
      "to be picked up",
      "sorting",
      "washing",
      "drying",
      "folding",
      "to be delivered",
      "completed",
      "cancelled",
    ],
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
  time_range: [
    {
      start: { type: String, required: true },
      end: { type: String, required: true },
    },
  ], // Update time_range to accept an array of objects
  shop: { type: String, required: true }, // Reference to Shop
  address: { type: String, default: null }, // Address for pickup/delivery
  pickup_time: { type: [String], default: null }, // Pickup time
  pickup_date: { type: Date, default: null }, // Pickup date
});

export const Order =
  mongoose.models.Order || mongoose.model<OrderDocument>("Order", OrderSchema);
