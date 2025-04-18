"use client";

import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { useEffect, useState } from "react";
import Home from "@/app/components/common/Home";

export default function ChooseService() {
  const router = useRouter();
  const { shop_id } = useParams() as { shop_id: string }; // Explicitly type shop_id
  interface Shop {
    name: string;
    services: Service[];
    type: string;
  }

  const [shop, setShop] = useState<Shop | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  useEffect(() => {
    const fetchShopDetails = async () => {
      try {
        const response = await fetch(`/api/shops/${shop_id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch shop details");
        }
        const data = await response.json();
        setShop(data.shop); // Assuming the API returns { shop: {...} }
      } catch (error) {
        console.error("Error fetching shop details:", error);
      }
    };

    if (shop_id) {
      fetchShopDetails();
    }
  }, [shop_id]);

  interface Service {
    name: string;
    description: string;
    price_per_kg: number;
  }

  const handleServiceSelection = (serviceName: string): void => {
    if (selectedServices.includes(serviceName)) {
      // Remove service if already selected
      setSelectedServices(
        selectedServices.filter((service: string) => service !== serviceName)
      );
    } else {
      // Add service if not already selected
      setSelectedServices([...selectedServices, serviceName]);
    }
  };

  const handleProceed = () => {
    if (selectedServices.length > 0) {
      if (shop?.type === "self-service") {
        // Navigate to the machine page for self-service shops
        router.push(
          `/auth/order/${shop_id}/machine?services=${encodeURIComponent(selectedServices.join(","))}`
        );
      } else {
        // Navigate to the quantity page for other shop types
        router.push(
          `/auth/order/${shop_id}/quantity?services=${encodeURIComponent(selectedServices.join(","))}`
        );
      }
    } else {
      alert("Please select at least one service to proceed.");
    }
  };

  const handleCancel = () => {
    router.push("/auth/order"); // Navigate back to the shop selection page
  };

  if (!shop) {
    return <p>Loading...</p>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="max-w-3xl w-full bg-white shadow rounded-lg p-6">
        <Home href="/auth/order" />
        <h2 className="text-2xl font-bold mb-4">Step 2: Choose Your Service</h2>
        <p className="text-gray-600 mb-6">
          Select the services you want from <strong>{shop.name}</strong>.
        </p>

        {/* Services List */}
        <div className="space-y-4">
          {shop.services.map((service, index) => (
            <div key={index} className="flex items-center">
              <input
                type="checkbox"
                id={`service-${index}`}
                value={service.name}
                checked={selectedServices.includes(service.name)}
                onChange={() => handleServiceSelection(service.name)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label
                htmlFor={`service-${index}`}
                className="ml-2 text-sm text-gray-700"
              >
                {service.name} - ₱{service.price_per_kg}/kg
              </label>
            </div>
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="flex space-x-4 mt-8">
          <button
            onClick={handleCancel}
            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
          >
            Cancel
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
