import mongoose, { Schema, Document } from "mongoose";
import { OrderDocument } from "./Orders"; // Import the Orders model
import { PaymentMethod } from "./PaymentMethod"; // Import the PaymentMethod model

interface Service {
  service_id: number;
  name: string;
  price_per_kg: number | null;
  description: string | null;
}

interface ClothingType {
  type: string; // Type of clothing (e.g., "Shirt", "Pants", "Jacket")
  price: number; // Price for this type of clothing
}

interface OpeningHours {
  day: string[]; // Days of the week (e.g., ["Monday", "Saturday"])
  open: string; // Opening time (e.g., "09:00")
  close: string; // Closing time (e.g., "18:00")
}

interface ShopDocument extends Document {
  shop_id: string;
  type: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  services: Service[];
  clothing_types: ClothingType[]; // Array of clothing types and their prices
  orders: mongoose.Types.ObjectId[]; // Reference to Orders collection
  payment_methods: mongoose.Types.ObjectId[]; // Reference to PaymentMethod collection
  delivery_fee: boolean; // Indicates if delivery is available
  feedbacks: string[]; // Array of feedback strings
  opening_hours: OpeningHours[]; // Array of opening hours
}

const ServiceSchema = new Schema<Service>({
  service_id: { type: Number, required: true },
  name: { type: String, required: true },
  price_per_kg: { type: Number, required: false },
  description: { type: String, required: false },
});

const ClothingTypeSchema = new Schema<ClothingType>({
  type: { type: String, required: true }, // Type of clothing
  price: { type: Number, required: true }, // Price for this type of clothing
});

const OpeningHoursSchema = new Schema<OpeningHours>({
  day: { type: [String], required: true }, // Array of days
  open: { type: String, required: true }, // Opening time
  close: { type: String, required: true }, // Closing time
});

const ShopSchema = new Schema<ShopDocument>({
  shop_id: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  address: { type: String, required: true },
  services: { type: [ServiceSchema], required: true },
  clothing_types: { type: [ClothingTypeSchema], required: true }, // Array of clothing types
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }], // Reference to Orders
  payment_methods: [
    { type: mongoose.Schema.Types.ObjectId, ref: "PaymentMethod" },
  ], // Reference to PaymentMethod
  delivery_fee: { type: Boolean, required: true }, // Indicates if delivery is available
  feedbacks: { type: [String], default: [] }, // Array of feedback strings
  opening_hours: { type: [OpeningHoursSchema], default: [] }, // Array of opening hours
});

export const Shop =
  mongoose.models.Shop || mongoose.model<ShopDocument>("Shop", ShopSchema);
