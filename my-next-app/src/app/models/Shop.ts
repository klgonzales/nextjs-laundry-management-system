import mongoose, { Schema, Document } from "mongoose";

// Service Interface and Schema
interface Service {
  service_id: number;
  name: string;
  price_per_kg: number | null;
  description: string | null;
}

const ServiceSchema = new Schema<Service>({
  service_id: { type: Number, required: true },
  name: { type: String, required: true },
  price_per_kg: { type: Number, required: false },
  description: { type: String, required: false },
});

// ClothingType Interface and Schema
interface ClothingType {
  type: string; // Type of clothing (e.g., "Shirt", "Pants", "Jacket")
  price: number; // Price for this type of clothing
}

const ClothingTypeSchema = new Schema<ClothingType>({
  type: { type: String, required: true },
  price: { type: Number, required: true },
});

// OpeningHours Interface and Schema
interface OpeningHours {
  day: string; // Single day (e.g., "Monday")
  open: string; // Opening time (e.g., "09:00")
  close: string; // Closing time (e.g., "17:00")
}

const OpeningHoursSchema = new Schema<OpeningHours>({
  day: { type: String, required: true },
  open: { type: String, required: true },
  close: { type: String, required: true },
});

// PaymentMethod Interface and Schema
interface PaymentMethod {
  method_id: number;
  name: string;
  account_number: string;
  status: string;
  payments: string[]; // Optional: If you want to track payments
}

const PaymentMethodSchema = new Schema<PaymentMethod>({
  method_id: { type: Number, required: true },
  name: { type: String, required: true },
  account_number: { type: String, required: false },
  status: { type: String, required: true },
  payments: { type: [String], required: true },
});

// Shop Interface and Schema
interface ShopDocument extends Document {
  shop_id: string;
  type: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  services: Service[];
  clothing_types: ClothingType[];
  orders: mongoose.Types.ObjectId[]; // Reference to Orders collection
  payment_methods: PaymentMethod[]; // Embedded payment methods
  delivery_fee: boolean;
  feedbacks: string[];
  opening_hours: OpeningHours[];
}

const ShopSchema = new Schema<ShopDocument>({
  shop_id: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  address: { type: String, required: true },
  services: { type: [ServiceSchema], required: true },
  clothing_types: { type: [ClothingTypeSchema], required: true },
  orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
  payment_methods: { type: [PaymentMethodSchema], default: [] }, // Embedded payment methods
  delivery_fee: { type: Boolean, required: true },
  feedbacks: { type: [String], default: [] },
  opening_hours: { type: [OpeningHoursSchema], default: [] },
});

export const Shop =
  mongoose.models.Shop || mongoose.model<ShopDocument>("Shop", ShopSchema);
