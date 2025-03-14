"use client";

import { useRouter } from "next/navigation";
import Sidebar from "../../../components/common/Sidebar";
import Header from "../../../components/common/Header";
import Footer from "../../../components/common/Footer";

export default function Dashboard() {
  const router = useRouter();

  const handleLogout = () => {
    // For now, just redirect to login page
    // Later we can add session management
    router.push("/auth/login");
  };

  const navigateToSelfService = () => {
    router.push("/auth/order-pickup-delivery");
  };

  const navigateToPickupDelivery = () => {
    router.push("/auth/order-self-service");
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar userType="client" />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-6">
          <div className="px-4 py-6 sm:px-0">
            <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 p-4">
              <h2 className="text-2xl font-bold mb-4">
                Welcome to your Dashboard
              </h2>
              <p className="text-gray-600">
                This is a simple dashboard. You can add more features here like:
              </p>
              <ul className="list-disc list-inside mt-2 text-gray-600">
                <li>Order History</li>
                <li>Current Orders</li>
                <li>Profile Settings</li>
                <li>Payment Methods</li>
              </ul>
              <div className="mt-6 space-x-4">
                <button
                  onClick={navigateToSelfService}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                >
                  Self-Service
                </button>
                <button
                  onClick={navigateToPickupDelivery}
                  className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
                >
                  Pickup & Delivery
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
      <Footer />
    </div>
  );
}
