// User Types
export type UserRole = "customer" | "admin" | "rider";

export type ShopType = "self-service" | "pickup&delivery";

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  customer_id: string;
}

export interface Customer extends User {
  customer_id: string;
  address: string;
}

export interface Admin extends User {
  admin_id: number;
  shop_id: string;
  shop_type: ShopType;
  role: "admin";
}

export interface Rider extends User {
  rider_id: number;
  current_orders?: number[];
}

export interface Order {
  order_id: number;
  customer_id: string;
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

// New OpeningHours Interface
export interface OpeningHours {
  day: string; // e.g., "Monday"
  open: string; // e.g., "09:00"
  close: string; // e.g., "17:00"
}

// Updated Shop Interface
export interface Shop {
  shop_id: string;
  type: ShopType;
  name: string;
  phone: string;
  email: string;
  address: string;
  services: Service[];
  clothing_types: ClothingType[];
  orders: string[]; // Array of Order IDs
  payment_methods: string[]; // Array of PaymentMethod IDs
  delivery_fee: boolean;
  feedbacks: string[];
  opening_hours: OpeningHours[]; // Array of OpeningHours
}

// ClothingType Interface (if applicable)
export interface ClothingType {
  type_id: number;
  name: string;
  price_per_item: number;
}
