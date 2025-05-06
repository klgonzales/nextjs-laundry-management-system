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
  admin_id: string;
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
  machine_id?: string;
  payment_status: "pending" | "for review" | "paid" | "failed" | "cancelled";
  order_status:
    | "pending"
    | "in-progress"
    | "scheduled"
    | "to be picked up"
    | "sorting"
    | "washing"
    | "drying"
    | "folding"
    | "to be delivered"
    | "completed"
    | "cancelled";
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

// Machine Interface
export interface Machine {
  machine_id: string; // Unique identifier for the machine
  minimum_kg: number | null; // Minimum weight the machine can handle
  type: string;
  minimum_minutes: number | null; // Optional: Minimum minutes for the machine
  availability: {
    date: string; // Date when the machine is available
    open: string; // Time when the machine is available
    close: string; // Time when the machine is available
  }[]; // Array of availability slots
  price_per_minimum_kg: number | null; // Price for the minimum weight
  customer_id: string | null; // Customer ID if the machine is booked
  appointments: {
    date: string; // Date of the appointment
    time: string; // Time of the appointment
    customer_id: string; // Customer ID for the appointment
  }[]; // Array of appointments
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
  machines: Machine[]; // Array of Machine objects
}

// ClothingType Interface (if applicable)
export interface ClothingType {
  type_id: number;
  name: string;
  price_per_item: number;
}
