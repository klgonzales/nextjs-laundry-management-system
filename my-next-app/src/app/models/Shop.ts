import mongoose, { Schema, Document } from "mongoose";

interface Service {
  service_id: number;
  name: string;
  price_per_kg: number;
  description: string;
}

interface Order {
  order_id: number;
  customer_id: number;
  order_type: string;
  service_ids: number[];
  machine_id?: number;
  payment_status: string;
  order_status: string;
  total_weight: number;
  total_price: number;
  date_placed: Date;
  date_completed?: Date | null;
}

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

interface PaymentMethod {
  _id: string;
  method_id: number;
  name: string;
  account_number: string | null;
  status: string;
  payments: Payment[];
}

interface ShopDocument extends Document {
  shop_id: number;
  type: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  services: Service[];
  orders: Order[];
  payment_methods: PaymentMethod[];
}

const ServiceSchema = new Schema<Service>({
  service_id: { type: Number, required: true },
  name: { type: String, required: true },
  price_per_kg: { type: Number, required: true },
  description: { type: String, required: true },
});

const OrderSchema = new Schema<Order>({
  order_id: { type: Number, required: true },
  customer_id: { type: Number, required: true },
  order_type: { type: String, required: true },
  service_ids: { type: [Number], required: true },
  machine_id: { type: Number, required: false },
  payment_status: { type: String, required: true },
  order_status: { type: String, required: true },
  total_weight: { type: Number, required: true },
  total_price: { type: Number, required: true },
  date_placed: { type: Date, required: true },
  date_completed: { type: Date, required: false },
});

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

const PaymentMethodSchema = new Schema<PaymentMethod>({
  method_id: { type: Number, required: true },
  name: { type: String, required: true },
  account_number: { type: String, required: false },
  status: { type: String, required: true },
  payments: { type: [PaymentSchema], required: false },
});

const ShopSchema = new Schema<ShopDocument>({
  shop_id: { type: Number, required: true, unique: true },
  type: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  address: { type: String, required: true },
  services: { type: [ServiceSchema], required: true },
  orders: { type: [OrderSchema], required: true },
  payment_methods: { type: [PaymentMethodSchema], required: true },
});

export const Shop =
  mongoose.models.Shop || mongoose.model<ShopDocument>("Shop", ShopSchema);
