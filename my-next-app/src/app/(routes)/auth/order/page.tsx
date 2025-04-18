"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext"; // Import the AuthContext

import Home from "../../../components/common/Home";
import Footer from "../../../components/common/Footer";

export default function Order() {
  const { user } = useAuth(); // Retrieve the authenticated user
  const customer_id = user?.id; // Assume `id` is the customer_id

  const router = useRouter();
  const searchParams = useSearchParams();
  const initialShopType = searchParams?.get("shopType") || ""; // Get shopType from query params

  interface Shop {
    shop_id: string;
    name: string;
    address: string;
    type: string;
    services: { name: string; price_per_kg: number }[];
    payment_methods: { name: string }[];
  }

  // Filter states
  // const [shopType, setShopType] = useState("");
  const [shopType, setShopType] = useState(initialShopType); // Initialize with query param
  const [shops, setShops] = useState<Shop[]>([]);
  const [filteredShops, setFilteredShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<string | null>(null);

  const [priceRange, setPriceRange] = useState([0, 100]); // Default price range
  const [paymentMethod, setPaymentMethod] = useState("");
  const [service, setService] = useState("");

  const navigateBackToDashboard = () => {
    router.push("/auth/dashboard");
  };

  const handleProceed = () => {
    if (selectedShop) {
      router.push(`/auth/order/${selectedShop}/services`);
    } else {
      alert("Please select a shop to proceed.");
    }
  };

  useEffect(() => {
    const fetchShops = async () => {
      try {
        const response = await fetch("/api/shops");
        if (!response.ok) {
          throw new Error("Failed to fetch shops");
        }
        const data = await response.json();
        // console.log("Fetched Shops:", data.shops); // Debugging
        setShops(data.shops);
        setFilteredShops(data.shops); // Initialize filtered shops
      } catch (error) {
        // console.error("Error fetching shops:", error);
      }
    };

    fetchShops();
  }, []);

  // Filter shops based on selected filters
  useEffect(() => {
    const filtered = shops.filter((shop) => {
      const matchesType = shopType ? shop.type === shopType : true;
      const matchesPrice = shop.services.some(
        (service) =>
          service.price_per_kg >= priceRange[0] &&
          service.price_per_kg <= priceRange[1]
      );
      const matchesPayment = paymentMethod
        ? shop.payment_methods.some((method) =>
            method.name.toLowerCase().includes(paymentMethod.toLowerCase())
          ) ||
          shop.name.toLowerCase().includes("wash") ||
          shop.name.toLowerCase().includes("cash")
        : true;
      const matchesService = service
        ? shop.services.some((s) =>
            s.name.toLowerCase().includes(service.toLowerCase())
          ) || shop.name.toLowerCase().includes(service.toLowerCase())
        : true;

      return matchesType && matchesPrice && matchesPayment && matchesService;
    });

    setFilteredShops(filtered);
  }, [shopType, priceRange, paymentMethod, service, shops]);

  return (
    <div className="min-h-screen flex">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Home href="/auth/dashboard" />
        <main className="flex-1 container mx-auto px-4 py-20">
          <h2 className="text-2xl font-bold mb-4">Step 1: Select a Shop</h2>
          <p className="text-gray-600 mb-6">
            Below are the available shops. Please select one to proceed.
          </p>

          {/* Filters */}
          <div className="bg-white shadow rounded-lg p-4 mb-6">
            <h3 className="text-lg font-bold mb-4">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Shop Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Shop Type
                </label>
                <select
                  value={shopType} // Use shopType state here
                  onChange={(e) => setShopType(e.target.value)} // Update shopType state on change
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">All</option>
                  <option value="pickup-delivery">Pickup & Delivery</option>
                  <option value="self-service">Self-Service</option>
                </select>
              </div>

              {/* Price Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Price Range (₱/kg)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={priceRange[0]}
                    onChange={(e) =>
                      setPriceRange([+e.target.value, priceRange[1]])
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Min"
                  />
                  <span>-</span>
                  <input
                    type="number"
                    value={priceRange[1]}
                    onChange={(e) =>
                      setPriceRange([priceRange[0], +e.target.value])
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="Max"
                  />
                </div>
              </div>

              {/* Payment Method Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">All</option>
                  <option value="Cash">Cash</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Gcash">Gcash</option>
                </select>
              </div>

              {/* Service Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Service
                </label>
                <input
                  type="text"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="e.g., Washing"
                />
              </div>
            </div>
          </div>

          {/* Display Shops */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredShops.length > 0 ? (
              filteredShops.map((shop) => (
                <div
                  key={shop.shop_id}
                  className={`bg-white shadow rounded-lg p-4 border ${
                    selectedShop === shop.shop_id ? "border-blue-500" : ""
                  }`}
                >
                  <div className="flex items-center mb-4">
                    <input
                      type="radio"
                      id={`shop-${shop.shop_id}`}
                      name="selectedShop"
                      value={shop.shop_id}
                      checked={selectedShop === shop.shop_id}
                      onChange={() => setSelectedShop(shop.shop_id)}
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <label
                      htmlFor={`shop-${shop.shop_id}`}
                      className="ml-2 text-lg font-bold text-gray-900"
                    >
                      {shop.name}
                    </label>
                  </div>
                  <p className="text-sm text-gray-600">{shop.address}</p>
                  <p className="text-sm text-gray-600">{shop.type}</p>

                  <div className="mt-4">
                    <h4 className="text-md font-semibold text-gray-800">
                      Services:
                    </h4>
                    <ul className="list-disc list-inside text-sm text-gray-600">
                      {shop.services.map((service, index) => (
                        <li key={index}>
                          {service.name} - ₱{service.price_per_kg}/kg
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-4">
                    <h4 className="text-md font-semibold text-gray-800">
                      Payment Methods:
                    </h4>
                    <ul className="list-disc list-inside text-sm text-gray-600">
                      {shop.payment_methods.map((method, index) => (
                        <li key={index}>{method.name}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600">No shops available.</p>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex space-x-4 mt-8">
            <button
              onClick={() => router.push("/auth/dashboard")}
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
        </main>
      </div>
    </div>
  );
}
