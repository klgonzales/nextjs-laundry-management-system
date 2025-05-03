"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import Sidebar from "../../../components/common/Sidebar";
import Header from "../../../components/common/Header";
import Footer from "../../../components/common/Footer";
import { FiMapPin, FiSearch, FiWind, FiBox } from "react-icons/fi";

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
        <main className="flex-1 container mx-auto px-4 py-2">
          <div className="px-4 py-2 sm:px-0">
            {/* Services Section - Redesigned to match the image */}
            <div className="mb-6">
              {/* <h3 className="text-lg leading-6 font-medium text-gray-900">
                Services
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Please choose one service you would like to use
              </p> */}

              {/* Services Grid - 3 cards in a row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Pickup & Delivery Card */}
                <div
                  onClick={() => navigateToOrder("pickup-delivery")}
                  className="bg-[#faf7f2] rounded-xl shadow-sm hover:shadow-md transition-all p-6 cursor-pointer"
                >
                  <div className="w-16 h-16 flex items-center justify-center bg-blue-100 rounded-xl mb-4">
                    <FiMapPin className="w-8 h-8 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Pickup & Delivery
                  </h3>
                  <p className="text-gray-500 text-sm">
                    We'll pick up your laundry and deliver it back to your
                    doorstep
                  </p>
                </div>

                {/* Self-Service Card */}
                <div
                  onClick={() => navigateToOrder("self-service")}
                  className="bg-[#faf7f2] rounded-xl shadow-sm hover:shadow-md transition-all p-6 cursor-pointer"
                >
                  <div className="w-16 h-16 flex items-center justify-center bg-blue-100 rounded-xl mb-4">
                    <FiWind className="w-8 h-8 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Self-Service
                  </h3>
                  <p className="text-gray-500 text-sm">
                    Use our facilities to wash and dry your laundry yourself
                  </p>
                </div>

                {/* Search Card */}
                <div
                  onClick={() => navigateToOrder("")}
                  className="bg-[#f8f1fb] rounded-xl shadow-sm hover:shadow-md transition-all p-6 cursor-pointer"
                >
                  <div className="w-16 h-16 flex items-center justify-center bg-purple-100 rounded-xl mb-4">
                    <FiSearch className="w-8 h-8 text-purple-500" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Search
                  </h3>
                  <p className="text-gray-500 text-sm">
                    Find laundry shops near you with our search tool
                  </p>
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
    </div>
  );
}
