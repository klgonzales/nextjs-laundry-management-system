"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Home from "@/app/components/common/Home";
import {
  FiCheckCircle,
  FiClock,
  FiCalendar,
  FiMapPin,
  FiPackage,
  FiCreditCard,
  FiInfo,
  FiList,
  FiBriefcase,
  FiSpeaker,
  FiTag,
  FiToggleRight,
} from "react-icons/fi";

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
  const order_id = searchParams?.get("order_id") || "";

  // State for order details
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [shopName, setShopName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  interface clothesItem {
    type: string;
    quantity: number;
  }

  interface OrderDetails {
    date: string;
    shop_name: string;
    shop_type: string; // Add shop_type to differentiate between self-service and other types
    services: string[];
    clothes: clothesItem[] | undefined; // Allow clothes to be undefined
    total: string | null;
    order_status: string;
    payment_status: string;
    payment_method: string;
    pickup_address: string;
    delivery_instructions: string;
    shop: string;
    address: string;
    machine_id?: string; // For self-service shops
    time_range?: { start: string; end: string }[] | undefined; // For self-service shops
    customer_id?: string; // For self-service shops
    order_type: string;
    pickup_date?: string; // For pickup-delivery shops
    pickup_time?: string[]; // For pickup-delivery shops
    total_price?: number;
    total_weight?: number;
    date_placed?: string; // For order date
  }

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        // Fetch order details
        const response = await fetch(`/api/orders/${order_id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch order details");
        }
        const data = await response.json();
        setOrderDetails(data);

        // Fetch shop details
        if (data.shop) {
          const shopResponse = await fetch(`/api/shops/${data.shop}`);
          if (!shopResponse.ok) {
            throw new Error("Failed to fetch shop details");
          }
          const shopData = await shopResponse.json();
          setShopName(shopData.shop.name);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error fetching details:", error);
        setError("Failed to load order information. Please try again.");
        setLoading(false);
      }
    };

    if (order_id) {
      fetchOrderDetails();
    }
  }, [order_id]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 w-full">
        <div className="bg-white shadow-sm w-full">
          <div className="max-w-5xl mx-auto px-4">
            <Home href="/auth/dashboard" />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-md max-w-md">
            <h2 className="text-xl font-bold text-red-600 mb-3">Error</h2>
            <p className="text-gray-700">{error}</p>
            <button
              onClick={() => router.push("/auth/dashboard")}
              className="mt-4 bg-[#F468BB] text-white px-4 py-2 rounded-md hover:bg-opacity-90"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC", // Important: use UTC to avoid timezone shifting
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 w-full">
      {/* Header */}
      <div className="bg-white shadow-sm w-full">
        <div className="max-w-5xl mx-auto px-4">
          <Home href="/auth/dashboard" />
        </div>
      </div>

      {/* Order Progress Bar */}
      <div className="bg-white pt-6 pb-4 px-4 shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">
            Order Confirmation
          </h2>

          {/* Progress steps with properly positioned connecting line */}
          <div className="relative">
            {/* Connecting line - positioned in the middle of the circles */}
            <div className="absolute top-4 left-0 right-0 flex items-center">
              <div className="h-0.5 bg-gray-200 w-full" />
              <div
                className="absolute h-0.5 bg-[#F468BB] transition-all duration-300"
                style={{ width: "100%" }}
              />
            </div>

            {/* Steps display */}
            <div className="relative flex items-center justify-between mb-2">
              {/* All steps completed */}
              {[
                "Select Shop",
                "Select Services",
                orderDetails?.order_type === "self-service"
                  ? "Select Machine"
                  : "Input your Clothes",
                orderDetails?.order_type === "pickup-delivery"
                  ? "Schedule & Payment"
                  : "Order Summary",
              ].map((step, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center relative z-10"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#F468BB] text-white">
                    {index < 4 ? <FiCheckCircle /> : "5"}
                  </div>
                  <span className="text-xs mt-2 text-[#F468BB] font-medium">
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full py-8 px-4">
        {loading ? (
          <div className="min-h-screen flex flex-col bg-gray-50 w-full">
            {/* Header */}
            <div className="bg-white shadow-sm w-full">
              <div className="max-w-5xl mx-auto px-4">
                <Home href="/auth/dashboard" />
              </div>
            </div>

            {/* Main Content - Skeleton Loading */}
            <div className="flex-1 w-full py-8 px-4">
              <div className="max-w-3xl mx-auto">
                {/* Success Message Skeleton */}
                <div className="bg-green-50 border border-green-100 rounded-lg p-6 mb-6 text-center">
                  <div className="flex justify-center mb-4">
                    <div className="h-16 w-16 bg-green-100 rounded-full animate-pulse"></div>
                  </div>
                  <div className="h-7 w-64 bg-gray-200 rounded-lg mx-auto animate-pulse mb-3"></div>
                  <div className="h-5 w-96 max-w-full bg-gray-200 rounded-lg mx-auto animate-pulse"></div>
                </div>

                {/* Order Details Card Skeleton */}
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                  <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                    <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
                  </div>

                  <div className="p-6">
                    {/* Shop & Service Information Skeleton */}
                    <div className="mb-6">
                      <div className="h-4 w-40 bg-gray-200 rounded animate-pulse mb-3"></div>
                      <div className="space-y-4">
                        {/* Shop Name */}
                        <div className="flex items-start">
                          <div className="h-5 w-5 bg-gray-200 rounded-full flex-shrink-0 mt-0.5"></div>
                          <div className="ml-3">
                            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-1"></div>
                            <div className="h-4 w-40 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        </div>
                        {/* Order Type */}
                        <div className="flex items-start">
                          <div className="h-5 w-5 bg-gray-200 rounded-full flex-shrink-0 mt-0.5"></div>
                          <div className="ml-3">
                            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-1"></div>
                            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        </div>
                        {/* Services */}
                        <div className="flex items-start">
                          <div className="h-5 w-5 bg-gray-200 rounded-full flex-shrink-0 mt-0.5"></div>
                          <div className="ml-3">
                            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-1"></div>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {[1, 2, 3].map((i) => (
                                <div
                                  key={i}
                                  className="h-5 w-16 bg-gray-200 rounded-full animate-pulse"
                                ></div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Pickup/Delivery Information Skeleton */}
                    <div className="mb-6">
                      <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mb-3"></div>
                      <div className="space-y-4">
                        {/* Clothing Items */}
                        <div className="flex items-start">
                          <div className="h-5 w-5 bg-gray-200 rounded-full flex-shrink-0 mt-0.5"></div>
                          <div className="ml-3">
                            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mt-2">
                              {[1, 2, 3, 4].map((i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between"
                                >
                                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                                  <div className="h-4 w-8 bg-gray-200 rounded animate-pulse"></div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        {/* Pickup Date */}
                        <div className="flex items-start">
                          <div className="h-5 w-5 bg-gray-200 rounded-full flex-shrink-0 mt-0.5"></div>
                          <div className="ml-3">
                            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-1"></div>
                            <div className="h-4 w-36 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        </div>
                        {/* Pickup Time */}
                        <div className="flex items-start">
                          <div className="h-5 w-5 bg-gray-200 rounded-full flex-shrink-0 mt-0.5"></div>
                          <div className="ml-3">
                            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-1"></div>
                            <div className="h-4 w-28 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        </div>
                        {/* Delivery Address */}
                        <div className="flex items-start">
                          <div className="h-5 w-5 bg-gray-200 rounded-full flex-shrink-0 mt-0.5"></div>
                          <div className="ml-3">
                            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-1"></div>
                            <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
                            <div className="mt-1">
                              <div className="h-3 w-24 bg-gray-200 rounded animate-pulse mb-1"></div>
                              <div className="h-3 w-56 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Payment Information Skeleton */}
                    <div className="mb-6 border-t border-gray-200 pt-4 mt-4">
                      <div className="h-4 w-40 bg-gray-200 rounded animate-pulse mb-3"></div>
                      <div className="space-y-4">
                        {/* Payment Method */}
                        <div className="flex items-start">
                          <div className="h-5 w-5 bg-gray-200 rounded-full flex-shrink-0 mt-0.5"></div>
                          <div className="ml-3">
                            <div className="h-4 w-28 bg-gray-200 rounded animate-pulse mb-1"></div>
                            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        </div>
                        {/* Total */}
                        <div className="flex items-start">
                          <div className="h-5 w-5 bg-gray-200 rounded-full flex-shrink-0 mt-0.5"></div>
                          <div className="ml-3">
                            <div className="h-4 w-12 bg-gray-200 rounded animate-pulse mb-1"></div>
                            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        </div>
                        {/* Order Status */}
                        <div className="flex items-start">
                          <div className="h-5 w-5 bg-gray-200 rounded-full flex-shrink-0 mt-0.5"></div>
                          <div className="ml-3">
                            <div className="flex items-center">
                              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                              <div className="ml-2 h-5 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                            </div>
                          </div>
                        </div>
                        {/* Payment Status */}
                        <div className="flex items-start">
                          <div className="h-5 w-5 bg-gray-200 rounded-full flex-shrink-0 mt-0.5"></div>
                          <div className="ml-3">
                            <div className="flex items-center">
                              <div className="h-4 w-28 bg-gray-200 rounded animate-pulse"></div>
                              <div className="ml-2 h-5 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Order Date Skeleton */}
                    <div className="text-sm border-t border-gray-200 pt-4 mt-4">
                      <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>

                {/* Action Button Skeleton */}
                <div className="mt-6 flex justify-center">
                  <div className="h-10 w-48 bg-gray-200 rounded animate-pulse"></div>
                </div>

                {/* Help Text Skeleton */}
                <div className="text-center mt-4">
                  <div className="h-4 w-72 bg-gray-200 rounded mx-auto animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {/* Success Message */}
            <div className="bg-green-50 border border-green-100 rounded-lg p-6 mb-6 text-center">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                  <FiCheckCircle className="h-10 w-10 text-green-500" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-[#3D4EB0] mb-2">
                Your Order Was Successfully Placed!
              </h3>
              <p className="text-gray-600">
                Thank you for placing your order. Your order ID is{" "}
                <span className="font-mono bg-gray-100 px-2 py-1 rounded text-[#F468BB]">
                  {order_id}
                </span>
              </p>
            </div>

            {/* Order Summary Card */}
            {orderDetails && (
              <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Order Details
                  </h3>
                </div>

                <div className="p-6">
                  {/* Shop & Service Information */}
                  <div className="">
                    <div className="mb-6">
                      <h4 className="text-sm font-medium uppercase text-gray-500 mb-3">
                        Shop & Services
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-start">
                          <FiInfo className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">
                              Shop Name
                            </p>
                            <p className="text-sm text-gray-600">
                              {shopName || "Not available"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start">
                          <FiPackage className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">
                              Order Type
                            </p>
                            <p className="text-sm text-gray-600">
                              {orderDetails.order_type
                                ? orderDetails.order_type
                                    .charAt(0)
                                    .toUpperCase() +
                                  orderDetails.order_type.slice(1)
                                : "Not specified"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start">
                          <FiList className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">
                              Services
                            </p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {orderDetails.services &&
                              orderDetails.services.length > 0 ? (
                                orderDetails.services.map(
                                  (service: string, index: number) => (
                                    <span
                                      key={index}
                                      className="px-2.5 py-0.5 rounded-full text-xs bg-[#F468BB] bg-opacity-10 text-white"
                                    >
                                      {service}
                                    </span>
                                  )
                                )
                              ) : (
                                <span className="text-sm text-gray-500">
                                  No services specified
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Pickup/Delivery Information */}
                    {orderDetails.order_type === "pickup-delivery" && (
                      <div className="mb-6">
                        <h4 className="text-sm font-medium uppercase text-gray-500 mb-3">
                          Pickup & Delivery
                        </h4>
                        <div className="space-y-3">
                          {/* Clothing Items - updated for clothes array structure */}
                          <div className="flex items-start">
                            <FiBriefcase className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">
                                Clothing Items
                              </p>

                              {/* Handle clothes array structure */}
                              {orderDetails.clothes &&
                              orderDetails.clothes.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mt-2">
                                  {orderDetails.clothes
                                    .filter((item: any) => item.quantity > 0)
                                    .map((item: any, index: number) => (
                                      <div
                                        key={`item-${index}`}
                                        className="flex items-center justify-between text-sm"
                                      >
                                        <span className="text-gray-700 capitalize">
                                          {item.type}:
                                        </span>
                                        <span className="font-medium text-gray-900">
                                          {item.quantity}
                                        </span>
                                      </div>
                                    ))}

                                  {/* If no items with quantity > 0 are found */}
                                  {orderDetails.clothes.filter(
                                    (item: any) => item.quantity > 0
                                  ).length === 0 && (
                                    <p className="text-sm text-gray-500 col-span-2">
                                      No clothing items with quantity
                                    </p>
                                  )}
                                </div>
                              ) : /* Handle case where clothing object structure is used instead */
                              orderDetails.clothing ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mt-2">
                                  {Object.entries(orderDetails.clothing)
                                    .filter(
                                      ([key, value]) =>
                                        typeof value === "number" &&
                                        value > 0 &&
                                        key !== "customClothing"
                                    )
                                    .map(
                                      (
                                        [type, quantity]: [string, unknown],
                                        index
                                      ) => (
                                        <div
                                          key={index}
                                          className="flex items-center justify-between text-sm"
                                        >
                                          <span className="text-gray-700 capitalize">
                                            {type}
                                          </span>
                                          <span className="font-medium text-gray-900">
                                            {String(quantity)}
                                          </span>
                                        </div>
                                      )
                                    )}
                                  {orderDetails.clothing.customClothing &&
                                    orderDetails.clothing.customClothing
                                      .length > 0 &&
                                    orderDetails.clothing.customClothing
                                      .filter((item: any) => item.quantity > 0)
                                      .map((item: any, index: number) => (
                                        <div
                                          key={`custom-${index}`}
                                          className="flex items-center justify-between text-sm"
                                        >
                                          <span className="text-gray-700 capitalize">
                                            {item.type}
                                          </span>
                                          <span className="font-medium text-gray-900">
                                            {item.quantity}
                                          </span>
                                        </div>
                                      ))}
                                  {Object.entries(orderDetails.clothing).filter(
                                    ([key, value]) =>
                                      typeof value === "number" &&
                                      value > 0 &&
                                      key !== "customClothing"
                                  ).length === 0 &&
                                    (!orderDetails.clothing.customClothing ||
                                      orderDetails.clothing.customClothing.filter(
                                        (item: any) => item.quantity > 0
                                      ).length === 0) && (
                                      <p className="text-sm text-gray-500 col-span-2">
                                        No clothing items specified
                                      </p>
                                    )}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500 mt-1">
                                  No clothing items specified
                                </p>
                              )}

                              {/* Total items count */}
                              {((orderDetails.clothes &&
                                orderDetails.clothes.filter(
                                  (item: any) => item.quantity > 0
                                ).length > 0) ||
                                (orderDetails.clothing &&
                                  (Object.values(orderDetails.clothing).some(
                                    (value) =>
                                      typeof value === "number" && value > 0
                                  ) ||
                                    (orderDetails.clothing.customClothing &&
                                      orderDetails.clothing.customClothing.some(
                                        (item: any) => item.quantity > 0
                                      ))))) && (
                                <p className="text-xs text-[#F468BB] font-medium mt-2">
                                  {orderDetails.clothes
                                    ? `Total items: ${orderDetails.clothes.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)}`
                                    : `Total items: ${
                                        Object.entries(orderDetails.clothing)
                                          .filter(
                                            ([key]) => key !== "customClothing"
                                          )
                                          .reduce(
                                            (sum, [_, value]) =>
                                              sum +
                                              (typeof value === "number"
                                                ? value
                                                : 0),
                                            0
                                          ) +
                                        (orderDetails.clothing.customClothing
                                          ? orderDetails.clothing.customClothing.reduce(
                                              (sum: number, item: any) =>
                                                sum + (item.quantity || 0),
                                              0
                                            )
                                          : 0)
                                      }`}
                                </p>
                              )}
                            </div>
                          </div>
                          {/* Existing Date Information */}
                          <div className="flex items-start">
                            <FiCalendar className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">
                                Pickup Date
                              </p>
                              <p className="text-sm text-gray-600">
                                {orderDetails.pickup_date
                                  ? formatDate(orderDetails.pickup_date)
                                  : "Not specified"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <FiClock className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">
                                Pickup Time
                              </p>
                              <p className="text-sm text-gray-600">
                                {orderDetails.pickup_time &&
                                orderDetails.pickup_time.length > 0
                                  ? orderDetails.pickup_time.join(", ")
                                  : "Not specified"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <FiMapPin className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">
                                Delivery Address
                              </p>
                              <p className="text-sm text-gray-600">
                                {orderDetails.address || "Not specified"}
                              </p>
                              {orderDetails.delivery_instructions && (
                                <div className="mt-1">
                                  <p className="text-xs font-medium text-gray-700">
                                    Instructions:
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {orderDetails.delivery_instructions}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Self-Service Information */}
                    {orderDetails.order_type === "self-service" && (
                      <div className="mb-6">
                        <h4 className="text-sm font-medium uppercase text-gray-500 mb-3">
                          Self-Service Details
                        </h4>
                        <div className="space-y-3">
                          <div className="flex items-start">
                            <FiSpeaker className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />

                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">
                                Machine ID
                              </p>
                              <p className="text-sm text-gray-600">
                                {orderDetails.machine_id || "Not assigned yet"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <FiCalendar className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />

                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">
                                Appointment Date
                              </p>
                              <p className="text-sm text-gray-600">
                                {orderDetails.date
                                  ? formatDate(orderDetails.date)
                                  : "Not assigned yet"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <FiClock className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">
                                Time Range
                              </p>
                              <p className="text-sm text-gray-600">
                                {orderDetails.time_range &&
                                orderDetails.time_range.length > 0
                                  ? orderDetails.time_range
                                      .map(
                                        (range: any) =>
                                          `${range.start} - ${range.end}`
                                      )
                                      .join(", ")
                                  : "Not specified"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Payment Information */}
                  <div className="mb-6 border-t border-gray-200 pt-4 mt-4">
                    <h4 className="text-sm font-medium uppercase text-gray-500 mb-3">
                      Payment Information
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <FiCreditCard className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            Payment Method
                          </p>
                          <p className="text-sm text-gray-600">
                            {orderDetails.payment_method
                              ? orderDetails.payment_method
                                  .charAt(0)
                                  .toUpperCase() +
                                orderDetails.payment_method.slice(1)
                              : "Not specified"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <FiTag className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            Total Price (Tentative)
                          </p>
                          <p className="text-sm text-gray-600">
                            {orderDetails.total_price
                              ? `₱${orderDetails.total_price}`
                              : "To be calculated"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <FiSpeaker className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            Total Weight (Tentative)
                          </p>
                          <p className="text-sm text-gray-600">
                            {orderDetails.total_weight
                              ? `₱${orderDetails.total_weight}`
                              : "To be calculated"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <FiToggleRight className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="ml-3">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-900">
                              Order Status
                            </p>
                            <span
                              className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${
                              orderDetails.order_status === "pending"
                                ? "bg-yellow-100 text-yellow-500"
                                : orderDetails.order_status === "processing"
                                  ? "bg-blue-100 text-blue-500"
                                  : orderDetails.order_status === "completed"
                                    ? "bg-green-100 text-green-500"
                                    : "bg-gray-100 text-gray-500"
                            }`}
                            >
                              {orderDetails.order_status
                                ? orderDetails.order_status
                                    .charAt(0)
                                    .toUpperCase() +
                                  orderDetails.order_status.slice(1)
                                : "Unknown"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <FiCreditCard className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="ml-3">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-900">
                              Payment Status
                            </p>
                            <span
                              className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${
                              orderDetails.payment_status === "pending"
                                ? "bg-yellow-100 text-yellow-500"
                                : orderDetails.payment_status === "processing"
                                  ? "bg-blue-100 text-blue-500"
                                  : orderDetails.payment_status === "completed"
                                    ? "bg-green-100 text-green-500"
                                    : "bg-gray-100 text-gray-500"
                            }`}
                            >
                              {orderDetails.payment_status
                                ? orderDetails.payment_status
                                    .charAt(0)
                                    .toUpperCase() +
                                  orderDetails.payment_status.slice(1)
                                : "Unknown"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Order Date */}
                  <div className="text-sm text-gray-500 border-t border-gray-200 pt-4 mt-4">
                    <p>
                      Order placed on{" "}
                      {orderDetails.date
                        ? formatDate(orderDetails.date_placed) +
                          " at " +
                          formatTime(orderDetails.date_placed)
                        : "Unknown date"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => router.push("/auth/dashboard")}
                className="btn btn-primary w-50"
              >
                Return to Dashboard
              </button>
            </div>

            {/* Help Text */}
            <div className="text-center mt-4">
              <p className="text-sm text-gray-500">
                You can track your order status from the dashboard or orders
                page.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
