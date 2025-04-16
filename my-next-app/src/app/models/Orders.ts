import mongoose, { Schema, Document } from "mongoose";

interface ClothingItem {
  type: string; // Type of clothing (e.g., "Shirt", "Pants", "Jacket")
  quantity: number; // Quantity of this type of clothing
}
interface Feedback {
  feedback_id: string; // Unique identifier for the feedback
  customer_id: string; // ID of the customer providing feedback

  order_id: string; // ID of the order associated with the feedback
  rating: number; // Rating given by the customer (e.g., 1 to 5)
  comments: string; // Comments provided by the customer
  date_submitted: Date; // Date when the feedback was submitted
}

interface Payment {
  amount_sent: number; // Amount sent by the customer
  amount_paid: number; // Amount sent by the customer
  reference_number: string; // Reference number for the payment
  paid_the_driver: boolean; // Whether the driver was paid
  payment_method: string; // Payment method used (e.g., "cash", "credit card")
  payment_date: Date; // Date of the payment
  customer_id: string; // ID of the customer making the payment
  order_id: string; // ID of the associated order
  shop_id: string; // ID of the shop where the payment was made
  payment_id: string; // Unique identifier for the payment
  screenshot: string; // Optional screenshot of the payment
}

const PaymentSchema = new Schema<Payment>({
  amount_sent: { type: Number }, // Amount sent by the customer
  amount_paid: { type: Number }, // Amount sent by the customer
  reference_number: { type: String }, // Reference number for the payment
  paid_the_driver: { type: Boolean }, // Whether the driver was paid
  payment_method: { type: String, required: true }, // Payment method used (e.g., "cash", "credit card")
  payment_date: { type: Date, required: true }, // Date of the payment
  customer_id: { type: String, required: true }, // ID of the customer making the payment
  order_id: { type: String, required: true }, // ID of the associated order
  shop_id: { type: String, required: true }, // ID of the shop where the payment was made
  payment_id: { type: String, required: true }, // Unique identifier for the payment
  screenshot: { type: String }, // Optional screenshot of the payment
});

const FeedbackSchema = new Schema({
  feedback_id: { type: String, required: true },
  customer_id: { type: String, required: true },
  order_id: { type: String, required: true },
  rating: { type: Number, required: true },
  comments: { type: String },
  date_submitted: { type: Date, default: Date.now },
});

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
  feedbacks: Feedback[]; // Array of feedback objects
  payment_method: string;
  services: string[];
  soap: boolean | null;
  time_range: string[];
  shop: { type: String; required: true }; // Reference to Shop
  address: string | null; // Address for pickup/delivery
  pickup_date: Date | null; // Pickup date
  pickup_time: string[] | null; // Pickup time
  note: String | null; // Note for the order
  proof_of_payment: Payment[]; // Proof of payment
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
    enum: ["pending", "for review", "paid", "cancelled", "failed"],
  },
  order_status: {
    type: String,
    required: true,
    enum: [
      "pending",
      "scheduled",
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
  feedbacks: { type: [FeedbackSchema], default: [] },
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
  note: { type: String, default: null }, // Note for the order
  proof_of_payment: { type: [PaymentSchema], default: [] }, // Proof of payment
});

export const Order =
  mongoose.models.Order || mongoose.model<OrderDocument>("Order", OrderSchema);
