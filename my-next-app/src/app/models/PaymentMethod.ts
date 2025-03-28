import mongoose, { Schema, Document } from "mongoose";

interface Payment {
  payment_id: number;
  customer_id: number;
  order_id: number;
  amount: number;
  payment_date: Date;
  status: string;
  screenshot?: string | null;
  created_at: Date;
}

interface PaymentDocument extends Document {
  _id: string;
  method_id: number;
  name: string;
  account_number: string | null;
  status: string;
  payments: Payment[];
}

const PaymentSchema = new Schema<Payment>({
  payment_id: { type: Number, required: true },
  customer_id: { type: Number, required: true },
  order_id: { type: Number, required: true },
  amount: { type: Number, required: true },
  payment_date: { type: Date, required: true },
  status: { type: String, required: true },
  screenshot: { type: String, required: false },
  created_at: { type: Date, default: Date.now },
});

const PaymentMethodSchema = new Schema<PaymentDocument>({
  method_id: { type: Number, required: true },
  name: { type: String, required: true },
  account_number: { type: String, required: false },
  status: { type: String, required: true },
  payments: [PaymentSchema],
});

export const PaymentMethod =
  mongoose.models.PaymentMethod ||
  mongoose.model<PaymentDocument>("PaymentMethod", PaymentMethodSchema);
