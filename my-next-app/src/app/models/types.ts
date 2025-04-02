// User Types
export type UserRole = "customer" | "admin" | "rider";

export type ShopType = "self-service" | "pickup&delivery";

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  customer_id: number;
}

export interface Customer extends User {
  customer_id: number;
  address: string;
}

export interface Admin extends User {
  admin_id: number;
  shop_id: number;
  shop_type: ShopType;
}

export interface Rider extends User {
  rider_id: number;
  current_orders?: number[];
}

export interface Order {
  order_id: number;
  customer_id: number;
  order_type: "self-service" | "pickup&delivery";
  service_ids: number[];
  machine_id?: number;
  payment_status: "pending" | "paid" | "failed";
  order_status: "pending" | "in-progress" | "completed" | "cancelled";
  total_weight: number;
  total_price: number;
  date_placed: Date;
  date_completed?: Date;
  address: string;
}

export interface Service {
  service_id: number;
  name: string;
  price_per_kg: number | null;
  description: string | null;
}
