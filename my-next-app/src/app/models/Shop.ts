import mongoose, { Schema, Document } from "mongoose";

// Service Interface and Schema
interface Service {
  service_id: number;
  name: string;
  price_per_kg: number | null;
  minimum_minutes: number | null; // Optional: Minimum minutes for the service
  description: string | null;
}

const ServiceSchema = new Schema<Service>({
  service_id: { type: Number, required: true },
  name: { type: String, required: true },
  price_per_kg: { type: Number, required: false },
  minimum_minutes: { type: Number, required: false }, // Optional: Minimum minutes for the service
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

// Machine Interface and Schema
interface Machine {
  machine_id: string; // Unique identifier for the machine
  minimum_kg: number | null; // Minimum weight the machine can handle
  minimum_minutes: number | null; // Optional: Minimum minutes for the machine
  availability: {
    date: string; // Date when the machine is available
    open: string; // Time when the machine is available
    close: string; // Time when the machine is available
  }[]; // Array of availability slots
  price_per_minimum_kg: number | null; // Price for the minimum weight
  customer_id: string | null; // Customer ID if the machine is booked
  appointments: {
    date: string;
    time: string;
    customer_id: string;
  }[]; // Array of appointments
}

const MachineSchema = new Schema<Machine>({
  machine_id: { type: String, required: true }, // Unique identifier for the machine
  minimum_kg: { type: Number, default: null }, // Minimum weight the machine can handle
  minimum_minutes: { type: Number, default: null }, // Optional: Minimum minutes for the machine
  availability: [
    {
      date: { type: String, required: true }, // Date when the machine is available
      open: { type: String, required: true }, // Time when the machine is available
      close: { type: String, required: true }, // Time when the machine is available
    },
  ],
  price_per_minimum_kg: { type: Number, default: null }, // Price for the minimum weight
  customer_id: { type: String, required: false }, // Customer ID if the machine is booked
  appointments: [
    {
      date: { type: String, required: true }, // Appointment date
      time: { type: String, required: true }, // Appointment time
      customer_id: { type: String, required: true }, // Customer ID for the appointment
    },
  ],
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
  orders: Record<string, any>[]; // Array of full shop objects
  payment_methods: PaymentMethod[]; // Embedded payment methods
  delivery_fee: boolean;
  feedbacks: string[];
  opening_hours: OpeningHours[];
  machines: Machine[]; // Array of machines
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
  orders: [{ type: Object }], // Store full shop objects
  payment_methods: { type: [PaymentMethodSchema], default: [] }, // Embedded payment methods
  delivery_fee: { type: Boolean, required: true },
  feedbacks: { type: [String], default: [] },
  opening_hours: { type: [OpeningHoursSchema], default: [] },
  machines: { type: [MachineSchema], default: [] }, // Embedded machines
});

export const Shop =
  mongoose.models.Shop || mongoose.model<ShopDocument>("Shop", ShopSchema);
