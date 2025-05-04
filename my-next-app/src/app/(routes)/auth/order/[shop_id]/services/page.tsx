"use client";

import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { usePusher } from "@/app/context/PusherContext"; // Add this import
import { useEffect, useState, useRef } from "react"; // Add useRef
import Home from "@/app/components/common/Home";
import {
  FiMapPin,
  FiPhone,
  FiMail,
  FiClock,
  FiTruck,
  FiDollarSign,
  FiHome,
  FiSearch,
  FiFilter,
  FiCheckCircle,
  FiStar,
  FiCreditCard,
  FiShoppingBag,
  FiCheck,
  FiSpeaker,
} from "react-icons/fi";

export default function ChooseService() {
  const router = useRouter();
  const { shop_id } = useParams() as { shop_id: string }; // Explicitly type shop_id
  const { user } = useAuth(); // Get current user
  const { pusher, isConnected } = usePusher(); // Add Pusher hook
  const channelRef = useRef<any>(null); // For keeping track of subscriptions
  // Add a loading state to track button click status
  const [isProceedingToServices, setIsProceedingToServices] = useState(false);
  const [loading, setLoading] = useState(true);

  interface Shop {
    name: string;
    services: Service[];
    type: string;
  }

  interface Service {
    name: string;
    description: string;
    price_per_kg: number;
    service_id: string;
  }

  const [shop, setShop] = useState<Shop | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [hasNewServices, setHasNewServices] = useState(false); // State to track new services

  useEffect(() => {
    const fetchShopDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/shops/${shop_id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch shop details");
        }
        const data = await response.json();
        setShop(data.shop); // Assuming the API returns { shop: {...} }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching shop details:", error);
        setLoading(false);
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

  // Set up Pusher subscription for service updates
  useEffect(() => {
    if (!pusher || !isConnected || !user?.customer_id) {
      return;
    }

    // Subscribe to personal channel for this customer
    const privateChannelName = `private-client-${user.customer_id}`;
    console.log(`[Services] Setting up subscription to ${privateChannelName}`);

    // Clean up existing subscription
    if (channelRef.current) {
      channelRef.current.unbind_all();
      pusher.unsubscribe(channelRef.current.name);
    }

    try {
      // Subscribe to private customer channel
      const privateChannel = pusher.subscribe(privateChannelName);
      channelRef.current = privateChannel;

      // Listen for new service added events
      privateChannel.bind("new-service-added", (data: any) => {
        console.log("[Services] Received new service notification:", data);

        // Only process if it's from the current shop
        if (data.shop_id === shop_id) {
          // Add the new service to the shop's services
          if (shop) {
            setShop({
              ...shop,
              services: [...shop.services, data.service],
            });

            // Visual indicator that new services were added
            setHasNewServices(true);

            // Could also highlight the new service with animation
            setTimeout(() => setHasNewServices(false), 5000);
          }
        }
      });

      // Also subscribe to the global new services channel
      const publicChannel = pusher.subscribe("new-services");

      publicChannel.bind("service-added", (data: any) => {
        console.log("[Services] Received global service update:", data);
      });
    } catch (error) {
      console.error("[Services] Error setting up Pusher:", error);
    }

    return () => {
      // Clean up subscriptions
      if (channelRef.current) {
        channelRef.current.unbind_all();
        pusher.unsubscribe(privateChannelName);
      }
      pusher.unsubscribe("new-services");
    };
  }, [pusher, isConnected, user?.customer_id, shop_id]);

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
        setIsProceedingToServices(true);
        router.push(
          `/auth/order/${shop_id}/machine?services=${encodeURIComponent(selectedServices.join(","))}`
        );
      } else {
        // Navigate to the quantity page for other shop types
        setIsProceedingToServices(true);
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 w-full">
      {/* Header */}
      <div className="bg-white shadow-sm w-full px-0 mx-0">
        <Home href="/auth/order" />
      </div>

      {/* Order Progress Bar */}
      <div className="bg-white pt-6 pb-4 px-4 shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">
            Choose Your Services
          </h2>

          {/* Progress steps with properly positioned connecting line */}
          <div className="relative">
            {/* Connecting line - positioned in the middle of the circles */}
            <div className="absolute top-4 left-0 right-0 flex items-center">
              <div className="h-0.5 bg-gray-200 w-full" />
              <div
                className="absolute h-0.5 bg-[#F468BB] transition-all duration-300"
                style={{ width: "25%" }}
              />
            </div>

            {/* Steps display */}
            <div className="relative flex items-center justify-between mb-2">
              {/* Step 1: Choose Shop - completed */}
              <div className="flex flex-col items-center relative z-10">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#F468BB] text-white">
                  <span>
                    {" "}
                    <FiCheckCircle />{" "}
                  </span>
                </div>
                <span className="text-xs mt-2 text-[#F468BB] font-medium">
                  Select Shop
                </span>
              </div>
              {/* Step 2: Choose Services - active */}
              <div className="flex flex-col items-center relative z-10">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#F468BB] text-white">
                  <span>2</span>
                </div>
                <span className="text-xs mt-2 text-[#F468BB] font-medium">
                  Select Services
                </span>
              </div>
              {/* Step 3: Schedule - pending */}
              <div className="flex flex-col items-center relative z-10">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white border border-gray-200 text-gray-400">
                  <span>3</span>
                </div>
                <span className="text-xs mt-2 text-gray-500">
                  {shop?.type === "self-service"
                    ? "Select Machine"
                    : "Input your Clothes"}
                </span>
              </div>
              {/* Step 4: Payment - pending */}
              {shop?.type === "pickup-delivery" && (
                <div className="flex flex-col items-center relative z-10">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white border border-gray-200 text-gray-400">
                    <span>4</span>
                  </div>
                  <span className="text-xs mt-2 text-gray-500">
                    Schedule & Payment
                  </span>
                </div>
              )}
              {/* Step 5: Review - pending */}
              <div className="flex flex-col items-center relative z-10">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white border border-gray-200 text-gray-400">
                  <span>5</span>
                </div>
                <span className="text-xs mt-2 text-gray-500">
                  Order Summary
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 w-full py-8 px-4 max-w-5xl mx-auto">
        {loading ? (
          <>
            {/* Main Content Skeleton */}
            <div className="flex-1 w-full py-8 px-4 max-w-5xl mx-auto">
              <div className="bg-white shadow rounded-lg overflow-hidden">
                {/* Shop Info Skeleton */}
                <div className="p-4 bg-gray-100 border-b border-gray-200">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-lg bg-gray-200 animate-pulse"></div>
                    <div className="ml-3 space-y-2">
                      <div className="h-5 w-40 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 w-28 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>

                {/* Services Selection Skeleton */}
                <div className="p-6">
                  <div className="mb-6">
                    <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
                  </div>

                  {/* Service Cards Skeleton */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((placeholder) => (
                      <div
                        key={placeholder}
                        className="border border-gray-200 rounded-lg p-4 animate-pulse"
                      >
                        <div className="flex justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center">
                              <div className="h-5 w-24 bg-gray-200 rounded"></div>
                              <div className="ml-2 h-5 w-20 bg-gray-200 rounded"></div>
                            </div>
                            <div className="h-4 w-full bg-gray-200 rounded"></div>
                          </div>
                          <div className="ml-4 w-6 h-6 rounded-full bg-gray-200"></div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Navigation Buttons Skeleton */}
                  <div className="mt-8 flex space-x-4 justify-end">
                    <div className="h-10 w-20 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-10 w-36 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {/* Shop Info Summary */}
            <div
              className={`p-4 ${shop?.type === "pickup-delivery" ? "bg-blue-50" : "bg-purple-50"} border-b border-gray-200`}
            >
              <div className="flex items-center">
                <div
                  className={`p-2 rounded-lg ${
                    shop?.type === "pickup-delivery"
                      ? "bg-blue-100"
                      : "bg-purple-100"
                  }`}
                >
                  {shop?.type === "pickup-delivery" ? <FiTruck /> : <FiHome />}
                </div>
                <div className="flex items-center ml-3">
                  <span>
                    <h3 className="text-lg font-medium text-gray-900">
                      {shop?.name}
                    </h3>
                  </span>
                  <span>
                    <p className="text-sm text-gray-600">
                      (
                      {shop?.type === "pickup-delivery"
                        ? "Pickup & Delivery"
                        : "Self-Service"}
                      )
                    </p>
                  </span>
                </div>
              </div>
            </div>

            {/* Services Selection */}
            <div className="p-6">
              <div className="mb-6">
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  Available Services
                </h4>
                <p className="text-sm text-gray-600">
                  Select one or more services for your laundry order.
                  {hasNewServices && (
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full animate-pulse">
                      New services added!
                    </span>
                  )}
                </p>
              </div>

              {/* Service Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {shop?.services.map((service, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg overflow-hidden transition-all hover:shadow-md ${
                      selectedServices.includes(service.name)
                        ? "border-[#F468BB] bg-pink-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => handleServiceSelection(service.name)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          {/* Improved layout with proper spacing */}

                          <div className="flex items-center">
                            <h5 className="font-medium text-gray-900 mb-1">
                              {service.name}-
                            </h5>
                            <span className="text-[#F468BB] font-medium">
                              ₱{service.price_per_kg} per kg
                            </span>
                            <span className="text-gray-500 text-sm ml-1"></span>
                          </div>
                          {service.description && (
                            <p className="mt-2 text-sm text-gray-600">
                              {service.description}
                            </p>
                          )}
                        </div>
                        <div className="ml-4">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                              selectedServices.includes(service.name)
                                ? "border-[#F468BB] bg-[#F468BB]"
                                : "border-gray-300"
                            }`}
                          >
                            {selectedServices.includes(service.name) && (
                              <FiCheck className="text-white" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Navigation Buttons */}
              <div className="mt-8 flex space-x-4 justify-end">
                <button
                  onClick={handleCancel}
                  className="btn btn-neutral w-50 "
                >
                  Back
                </button>
                <button
                  onClick={handleProceed}
                  disabled={
                    selectedServices.length === 0 || isProceedingToServices
                  }
                  className={`px-6 py-2.5 bg-[#F468BB] text-white rounded-lg hover:bg-opacity-90 transition-colors flex items-center justify-center ${
                    selectedServices.length === 0 || isProceedingToServices
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  {isProceedingToServices ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Loading...
                    </>
                  ) : shop?.type === "self-service" ? (
                    "Move to Machine"
                  ) : (
                    "Move to Clothes"
                  )}
                </button>
              </div>

              {/* Help Text */}
              {/* {selectedServices.length === 0 && (
              <p className="text-center text-sm text-gray-500 mt-4">
                Please select at least one service to continue.
              </p>
            )} */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
