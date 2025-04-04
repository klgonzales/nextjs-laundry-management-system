"use client";

import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { useState } from "react";
import Home from "@/app/components/common/Home";

export default function PickupDetails() {
  const router = useRouter();
  const { user } = useAuth(); // Get the logged-in user from AuthContext
  const { shop_id } = useParams(); // Extract shop_id from the URL path
  const searchParams = useSearchParams();
  const services = searchParams.get("services")?.split(",") || []; // Get services from query params
  const clothing = JSON.parse(searchParams.get("clothing") || "{}"); // Parse clothing from query params

  // console.log(clothing);
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [payment_method, setPaymentMethod] = useState("");
  const [customerAddress, setAddress] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState(""); // New state for delivery instructions
  const customer_id = user?.customer_id;
  const soap = searchParams.get("soap") === "true"; // Convert the string to a boolean

  const clothingArray = Object.entries(clothing)
    .filter(([type, quantity]) => type !== "customClothing") // Exclude customClothing for now
    .map(([type, quantity]) => ({
      type,
      quantity: Number(quantity), // Ensure quantity is a number
    }));

  // Add custom clothing items to the array
  const customClothingArray = clothing.customClothing || [];
  const finalClothingArray = [...clothingArray, ...customClothingArray];

  // console.log(finalClothingArray);
  const handleSubmit = async () => {
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_id,
          shop_id,
          services,
          clothing: finalClothingArray,
          pickupDate,
          pickupTime,
          payment_method,
          address: customerAddress,
          delivery_instructions: deliveryInstructions, // Include delivery instructions
          soap,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save order");
      }

      const data = await response.json();

      console.log("WAASDFDSHFHDSHFDSH");
      console.log(payment_method);

      // Navigate to the confirmation page
      router.push(`/auth/order/confirmation?order_id=${data.order_id}`);
    } catch (error) {
      alert("Failed to save order. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="max-w-3xl w-full bg-white shadow rounded-lg p-6">
        <Home href="/auth/quantity" />
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
            value={payment_method}
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
            value={customerAddress}
            onChange={(e) => setAddress(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        {/* Delivery Instructions */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Delivery Instructions
          </label>
          <input
            type="text"
            value={deliveryInstructions} // Bind to deliveryInstructions state
            onChange={(e) => setDeliveryInstructions(e.target.value)} // Update state on change
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
