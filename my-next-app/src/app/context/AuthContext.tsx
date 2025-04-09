"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Order, Service } from "../models/types";

interface User {
  id: string; // User ID
  name: string;
  email: string;
  customer_id?: string; // Optional for customers
  phone?: number; // Optional for customers
  address?: string; // Optional for customers
  admin_id?: string; // Optional for admins
  //shops?: string[]; // Optional for admins
  orders?: string[]; // Optional for admins
  role: "customer" | "admin";
  shops?: {
    name: string;
    services?: Service[]; // Define services as an optional array of Service objects
    shop_id: string;
    orders?: Order[]; // Optional for admins
    type: string;
    machines?: {
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
    }[]; // Define machines as an array of objects with machine_id and other properties
  }[]; // Define shops as an array of objects with a name property and optional services
  // other properties
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  // Simulate fetching user data (e.g., from localStorage or an API)
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(storedUser ? JSON.parse(storedUser) : null);
      } catch (error) {
        console.error("Failed to parse user data from localStorage:", error);
        setUser(null);
      }
    }
  }, []);

  const login = (userData: User) => {
    if (userData.role === "customer" || userData.role === "admin") {
      console.log("Logging in customer:", userData); // Debugging
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
    } else {
      console.error("Invalid user role:", userData.role); // Debugging
    }
  };

  const logout = () => {
    console.log("Logging out user with role:", user?.role); // Debugging
    setUser(null);
    localStorage.removeItem("user"); // Remove user from localStorage
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
