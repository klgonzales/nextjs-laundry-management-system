"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation"; // Import useRouter from next/navigation for App Router
import { Order, Service } from "../models/types"; // Assuming types are correctly defined

// ... (User interface, AuthContextType interface, createContext) ...
interface User {
  id: string; // User ID
  name: string;
  email: string;
  customer_id?: string; // Optional for customers
  phone?: number; // Optional for customers
  address?: string; // Optional for customers
  admin_id?: string; // Optional for admins
  orders?: string[]; // Optional for admins
  role: "customer" | "admin";
  shops?: {
    payment_methods: any;
    address: string;
    email: string;
    phone: string;
    name: string;
    services?: Service[];
    shop_id: string;
    orders?: Order[];
    type: string;
    opening_hours?: { date: string; open: string; close: string }[];
    machines?: {
      machine_id: string;
      minimum_kg: number | null;
      type: string;
      minimum_minutes: number | null;
      availability: { date: string; open: string; close: string }[];
      price_per_minimum_kg: number | null;
      customer_id: string | null;
      appointments: { date: string; time: string; customer_id: string }[];
    }[];
  }[];
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter(); // Initialize the router

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse user data from localStorage:", error);
        setUser(null);
        localStorage.removeItem("user"); // Clear invalid data
      }
    }
  }, []);

  const login = (userData: User) => {
    // ... (existing login logic) ...
    if (userData.role === "customer" || userData.role === "admin") {
      console.log("Logging in user:", userData);
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
    } else {
      console.error("Invalid user role:", userData.role);
    }
  };

  const logout = () => {
    console.log("Logging out user with role:", user?.role); // Debugging
    setUser(null); // Clear user state
    localStorage.removeItem("user"); // Remove user from localStorage

    // --- ADD REDIRECTION ---
    // Redirect to the homepage or login page immediately after clearing state
    router.push("/"); // Or use '/auth/login' or another appropriate route
    // --- END REDIRECTION ---
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// ... (useAuth hook remains the same) ...
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
