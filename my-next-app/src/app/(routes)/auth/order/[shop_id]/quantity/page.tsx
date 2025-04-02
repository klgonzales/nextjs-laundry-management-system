"use client";

import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import Home from "@/app/components/common/Home";

export default function InputQuantity() {
  const router = useRouter();
  const { shop_id } = useParams(); // Extract shop_id from the URL path
  const searchParams = useSearchParams();
  const services = searchParams.get("services")?.split(",") || []; // Get selected services from query params

  const [quantities, setQuantities] = useState({
    shirt: 0,
    jacket: 0,
    shorts: 0,
    pants: 0,
    socks: 0,
    bedsheets: 0,
    blankets: 0,
    pillowcases: 0,
  });

  const [customClothing, setCustomClothing] = useState<
    { type: string; quantity: number }[]
  >([]);

  const handleQuantityChange = (type: string, value: number) => {
    setQuantities((prev) => ({
      ...prev,
      [type]: value,
    }));
  };

  const handleAddCustomClothing = () => {
    setCustomClothing([...customClothing, { type: "", quantity: 0 }]);
  };

  const handleCustomClothingChange = (
    index: number,
    field: string,
    value: string | number
  ) => {
    const updatedCustomClothing = [...customClothing];
    updatedCustomClothing[index] = {
      ...updatedCustomClothing[index],
      [field]: value,
    };
    setCustomClothing(updatedCustomClothing);
  };

  const handleProceed = () => {
    if (!shop_id) {
      console.error("shop_id is null or undefined");
      return;
    }

    const allClothing = {
      ...quantities,
      customClothing,
    };

    const queryParams = new URLSearchParams({
      services: services.join(","),
      clothing: JSON.stringify(allClothing),
    }).toString();

    router.push(`/auth/order/${shop_id}/pickup?${queryParams}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="max-w-3xl w-full bg-white shadow rounded-lg p-6">
        <Home href="/auth/services" />
        <h2 className="text-2xl font-bold mb-4">
          Step 3: Input Clothing Quantities
        </h2>
        <p className="text-gray-600 mb-6">
          Enter the quantity for each clothing type.
        </p>

        {/* Predefined Clothing Types */}
        <div className="space-y-4">
          {Object.keys(quantities).map((type) => (
            <div key={type} className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700 capitalize">
                {type}
              </label>
              <input
                type="number"
                min="0"
                value={quantities[type as keyof typeof quantities]}
                onChange={(e) =>
                  handleQuantityChange(type, parseInt(e.target.value, 10))
                }
                className="w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          ))}
        </div>

        {/* Custom Clothing Types */}
        <div className="mt-6">
          <h3 className="text-lg font-bold mb-2">Custom Clothing</h3>
          {customClothing.map((item, index) => (
            <div key={index} className="flex items-center space-x-4 mb-2">
              <input
                type="text"
                placeholder="Clothing Type"
                value={item.type}
                onChange={(e) =>
                  handleCustomClothingChange(index, "type", e.target.value)
                }
                className="w-40 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              <input
                type="number"
                min="0"
                placeholder="Quantity"
                value={item.quantity}
                onChange={(e) =>
                  handleCustomClothingChange(
                    index,
                    "quantity",
                    parseInt(e.target.value, 10)
                  )
                }
                className="w-20 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          ))}
          <button
            onClick={handleAddCustomClothing}
            className="mt-2 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
          >
            Add Custom Clothing
          </button>
        </div>

        {/* Navigation Buttons */}
        <div className="flex space-x-4 mt-8">
          <button
            onClick={() => router.back()}
            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleProceed}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
