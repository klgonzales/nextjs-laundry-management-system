"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import Sidebar from "../../../components/common/Sidebar";
import Header from "../../../components/common/Header";
import Footer from "../../../components/common/Footer";

import Orders from "../orders/page";
import Payments from "../payments/page";

export default function Dashboard() {
  const router = useRouter();

  // Create refs for each section
  const ordersRef = useRef<HTMLDivElement>(null);
  const paymentsRef = useRef<HTMLDivElement>(null);

  const handleScroll = (section: string) => {
    switch (section) {
      case "orders":
        ordersRef.current?.scrollIntoView({ behavior: "smooth" });
        break;
      case "payments":
        paymentsRef.current?.scrollIntoView({ behavior: "smooth" });
        break;
      default:
        break;
    }
  };

  const handleLogout = () => {
    // For now, just redirect to login page
    // Later we can add session management
    router.push("/auth/login");
  };

  const navigateToOrder = (shopType: string) => {
    router.push(`/auth/order?shopType=${shopType}`);
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar userType="client" handleScroll={handleScroll} />
      <div className="flex-1 flex flex-col">
        <Header userType="client" />
        <main className="flex-1 container mx-auto px-4 py-6">
          <div className="px-4 py-6 sm:px-0">
            {/* Services Section */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Services
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Please choose one service you would like to purchase
                </p>
              </div>
              <div className="border-t border-gray-200">
                <div className="px-4 py-5 sm:p-6 text-center space-x-4">
                  <button
                    onClick={() => navigateToOrder("self-service")}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                  >
                    Self-Service
                  </button>
                  <button
                    onClick={() => navigateToOrder("pickup-delivery")}
                    className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
                  >
                    Pickup & Delivery
                  </button>
                  <button
                    onClick={() => navigateToOrder("")}
                    className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
                  >
                    Search
                  </button>
                </div>
              </div>
            </div>

            {/* Orders Section */}
            <div ref={ordersRef}>
              <Orders />
            </div>

            {/* Payments Section */}
            <div ref={paymentsRef}>
              <Payments />
            </div>
          </div>
        </main>
      </div>
      {/* Footer */}
      <Footer />
    </div>
  );
}
