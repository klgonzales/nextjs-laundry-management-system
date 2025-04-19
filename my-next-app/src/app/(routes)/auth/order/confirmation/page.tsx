"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Home from "@/app/components/common/Home";

export default function OrderConfirmation() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OrderConfirmationContent />
    </Suspense>
  );
}

function OrderConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const order_id = searchParams?.get("order_id") || ""; // Get order_id from query params, default to an empty string if null

  const handleTrackOrder = () => {
    // Pass the order_id to the summary page
    router.push(`/auth/order/summary?order_id=${order_id}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="max-w-md w-full bg-white shadow rounded-lg p-6 text-center">
        <Home href="/auth/pickup" />
        <h2 className="text-2xl font-bold mb-4">Order Successfully Placed!</h2>
        <p className="text-gray-600 mb-6">
          Thank you for placing your order. Your order ID is{" "}
          <strong>{order_id}</strong>.
        </p>
        <div className="flex space-x-4">
          <button
            onClick={() => router.push("/auth/dashboard")} // Navigate back to the dashboard
            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleTrackOrder}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
          >
            Track Order
          </button>
        </div>
      </div>
    </div>
  );
}
