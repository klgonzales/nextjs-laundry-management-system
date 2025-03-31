"use client";

import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useState } from "react";

export default function PickupDetails() {
  const router = useRouter();
  const { shop_id } = useParams(); // Extract shop_id from the URL path
  const searchParams = useSearchParams();
  const services = searchParams.get("services")?.split(",") || []; // Get services from query params
  const clothing = JSON.parse(searchParams.get("clothing") || "{}"); // Parse clothing from query params

  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [address, setAddress] = useState("");

  console.log("shop_id:", shop_id); // This should now correctly log the shop_id

  const handleSubmit = async () => {
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shop_id, // Use shop_id from the URL path
          services,
          clothing,
          pickupDate,
          pickupTime,
          paymentMethod,
          address,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save order");
      }

      const data = await response.json();
      alert("Order successfully placed!");
      router.push("/auth/dashboard");
    } catch (error) {
      console.error("Error saving order:", error);
      alert("Failed to save order. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="max-w-3xl w-full bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Step 4: Pickup Details</h2>
        <p className="text-gray-600 mb-6">Enter the pickup details below.</p>

        {/* Pickup Date */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Pickup Date
          </label>
          <input
            type="date"
            value={pickupDate}
            onChange={(e) => setPickupDate(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        {/* Pickup Time */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Pickup Time
          </label>
          <input
            type="time"
            value={pickupTime}
            onChange={(e) => setPickupTime(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        {/* Payment Method */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Payment Method
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">Select Payment Method</option>
            <option value="cash">Cash</option>
            <option value="credit_card">Credit Card</option>
            <option value="gcash">GCash</option>
          </select>
        </div>

        {/* Address */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Dorm Address
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        {/* Submit Button */}
        <div className="flex space-x-4 mt-8">
          <button
            onClick={() => router.back()}
            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
