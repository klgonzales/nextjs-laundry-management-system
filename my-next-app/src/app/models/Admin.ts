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
  machine_id: number;
  payment_status: string;
  order_status: string;
  total_weight: number;
  total_price: number;
  date_placed: Date;
  date_completed: Date | null;
}

interface Shop {
  shop_id: number;
  type: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  services: Service[];
  orders: Order[];
}

interface AdminDocument extends Document {
  admin_id: number;
  name: string;
  email: string;
  password: string;
  shops: Shop[];
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
  machine_id: { type: Number, required: true },
  payment_status: { type: String, required: true },
  order_status: { type: String, required: true },
  total_weight: { type: Number, required: true },
  total_price: { type: Number, required: true },
  date_placed: { type: Date, required: true },
  date_completed: { type: Date, default: null },
});

const ShopSchema = new Schema<Shop>({
  shop_id: { type: Number, required: true },
  type: { type: String, required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  address: { type: String, required: true },
  services: { type: [ServiceSchema], required: true },
  orders: { type: [OrderSchema], required: true },
});

const AdminSchema = new Schema<AdminDocument>({
  admin_id: { type: Number, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  shops: { type: [ShopSchema], required: true },
});

export const Admin =
  mongoose.models.Admin || mongoose.model<AdminDocument>("Admin", AdminSchema);
