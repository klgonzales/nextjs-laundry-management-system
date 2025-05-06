"use client";

import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { useState, useEffect } from "react";
import Home from "@/app/components/common/Home";
import {
  FiFileText,
  FiMapPin,
  FiServer,
  FiCheckCircle,
  FiCheck,
} from "react-icons/fi";

export default function PickupDetails() {
  interface Shop {
    name: string;
    type: string;
  }

  const router = useRouter();
  const { user } = useAuth(); // Get the logged-in user from AuthContext
  const params = useParams();
  const [shop, setShop] = useState<Shop | null>(null);
  const shop_id = params?.shop_id as string; // Safely extract shop_id and cast it to string
  const searchParams = useSearchParams();
  // Add this loading state variable near your other state declarations
  const [loading, setLoading] = useState(true);

  const services = searchParams?.get("services")?.split(",") || []; // Get services from query params
  const clothing = searchParams
    ? JSON.parse(searchParams.get("clothing") || "{}")
    : {}; // Safely parse clothing from query params

  // console.log(clothing);
  const [openingHours, setOpeningHours] = useState<
    { day: string; open: string; close: string }[]
  >([]);
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [availableTimes, setAvailableTimes] = useState<string[]>([]); // List of available times
  const [isProceedingToConfirmation, setIsProceedingToConfirm] =
    useState(false);
  const [paymentMethods, setPaymentMethods] = useState<
    {
      method_id: number;
      name: string;
      account_number: string;
      status: string;
    }[]
  >([]); // List of payment methods
  const [payment_method, setPaymentMethod] = useState("");

  useEffect(() => {
    const fetchShopData = async () => {
      try {
        const response = await fetch(`/api/shops/${shop_id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch shop data");
        }
        const data = await response.json();
        setPaymentMethods(data.shop.payment_methods || []); // Set payment methods from the API response
      } catch (error) {
        console.error("Error fetching shop data:", error);
      }
    };

    fetchShopData();
  }, [shop_id]);

  const [customerAddress, setAddress] = useState("");
  const [suggestedAddresses, setSuggestedAddresses] = useState<string>(""); // Single suggested address
  const [showSuggestions, setShowSuggestions] = useState(false); // Toggle dropdown visibility

  useEffect(() => {
    // Fetch customer's saved addresses (mocked here, replace with API call if needed)
    const fetchAddresses = async () => {
      try {
        setLoading(true); // Set loading to true before fetching
        const response = await fetch(`/api/customers/${user?.customer_id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch addresses");
        }
        const data = await response.json();
        setSuggestedAddresses(data.customer.address || ""); // Set the single address
        setLoading(false); // Set loading to false after data is loaded
      } catch (error) {
        console.error("Error fetching addresses:", error);
        setLoading(false); // Set loading to false after data is loaded
      }
    };

    if (user?.customer_id) {
      fetchAddresses();
    }
  }, [user?.customer_id]);

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddress(value);

    // Show suggestions if input matches any saved address
    if (value.trim() !== "") {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleAddressSelect = (address: string) => {
    setAddress(address); // Set the selected address
    setShowSuggestions(false); // Hide the suggestions dropdown
  };

  const [deliveryInstructions, setDeliveryInstructions] = useState(""); // New state for delivery instructions
  const customer_id = user?.customer_id;
  const soap = searchParams?.get("soap") === "true"; // Convert the string to a boolean

  useEffect(() => {
    const fetchShopData = async () => {
      try {
        const response = await fetch(`/api/shops/${shop_id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch shop data");
        }
        const data = await response.json();
        setOpeningHours(data.shop.opening_hours); // Set opening_hours from the API response
      } catch (error) {
        console.error("Error fetching shop data:", error);
      }
    };

    fetchShopData();
  }, [shop_id]);

  // Helper function to check if a date is within the shop's opening days and not in the past
  const isDayAvailable = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set time to midnight for accurate comparison
    const dayName = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
    }).format(date);

    return (
      date >= today && // Ensure the date is not in the past
      openingHours.some((day: any) => day.day === dayName)
    );
  };

  // Helper function to get the opening and closing times for a specific day
  const getOpeningHoursForDay = (date: Date) => {
    const dayName = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
    }).format(date);
    const day = openingHours.find((day) => day.day === dayName);
    return day ? { open: day.open, close: day.close } : null;
  };

  // Generate time slots based on opening and closing times
  const generateTimeSlots = (open: string, close: string) => {
    const slots: string[] = [];
    let currentTime = new Date(`1970-01-01T${open}:00`);
    const endTime = new Date(`1970-01-01T${close}:00`);

    while (currentTime < endTime) {
      slots.push(currentTime.toTimeString().slice(0, 5)); // Format HH:mm
      currentTime.setMinutes(currentTime.getMinutes() + 30); // Increment by 30 minutes
    }

    return slots;
  };

  // Update available times when the pickup date changes
  useEffect(() => {
    if (pickupDate) {
      const openingHours = getOpeningHoursForDay(new Date(pickupDate));
      if (openingHours) {
        const times = generateTimeSlots(openingHours.open, openingHours.close);
        setAvailableTimes(times);
      } else {
        setAvailableTimes([]);
      }
    }
  }, [pickupDate]);

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
    setIsProceedingToConfirm(true);
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
          notes: "",
          order_type: "pickup-delivery",
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
  // Replace the entire return statement at the bottom of your component

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 w-full">
      {/* Header */}
      <div className="bg-white shadow-sm w-full px-0 mx-0">
        <Home href={`/auth/order/${shop_id}/quantity`} />
      </div>

      {/* Order Progress Bar */}
      <div className="bg-white pt-6 pb-4 px-4 shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">
            Schedule & Payment
          </h2>

          {/* Progress steps with properly positioned connecting line */}
          <div className="relative">
            {/* Connecting line - positioned in the middle of the circles */}
            <div className="absolute top-4 left-0 right-0 flex items-center">
              <div className="h-0.5 bg-gray-200 w-full" />
              <div
                className="absolute h-0.5 bg-[#F468BB] transition-all duration-300"
                style={{ width: "75%" }}
              />
            </div>

            {/* Steps display */}
            <div className="relative flex items-center justify-between mb-2">
              {/* Step 1: Choose Shop - completed */}
              <div className="flex flex-col items-center relative z-10">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#F468BB] text-white">
                  <span>
                    {" "}
                    <FiCheckCircle />
                  </span>
                </div>
                <span className="text-xs mt-2 text-[#F468BB] font-medium">
                  Select Shop
                </span>
              </div>

              {/* Step 2: Choose Services - completed */}
              <div className="flex flex-col items-center relative z-10">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#F468BB] text-white">
                  <span>
                    {" "}
                    <FiCheckCircle />
                  </span>
                </div>
                <span className="text-xs mt-2 text-[#F468BB] font-medium">
                  Select Services
                </span>
              </div>

              {/* Step 3: Clothes - completed */}
              <div className="flex flex-col items-center relative z-10">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#F468BB] text-white">
                  <span>
                    {" "}
                    <FiCheckCircle />
                  </span>
                </div>
                <span className="text-xs mt-2 text-[#F468BB] font-medium">
                  {shop?.type === "self-service"
                    ? "Select Machine"
                    : "Input your Clothes"}
                </span>
              </div>

              {/* Step 4: Schedule - active */}
              <div className="flex flex-col items-center relative z-10">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#F468BB] text-white">
                  <span>4</span>
                </div>
                <span className="text-xs mt-2 text-[#F468BB] font-medium">
                  Schedule & Payment
                </span>
              </div>

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
      <div className="flex-1 w-full py-8 px-4 max-w-3xl mx-auto">
        {loading ? (
          // Skeletal loading UI
          <div className="bg-white shadow rounded-lg overflow-hidden animate-pulse">
            {/* Services Summary Skeleton */}
            <div className="bg-blue-50 p-4 border-b border-gray-200">
              <div className="flex items-center mb-2">
                <div className="h-5 w-5 bg-gray-200 rounded mr-2"></div>
                <div className="h-5 w-36 bg-gray-200 rounded"></div>
              </div>

              <div className="flex flex-wrap gap-2 mb-2">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-6 w-20 bg-gray-200 rounded-full"
                  ></div>
                ))}
              </div>

              <div className="h-6 w-48 bg-gray-200 rounded-full"></div>
            </div>
            <div className="p-6 space-y-6">
              {/* Pickup Date and Time Section Skeleton */}
              <div>
                <div className="h-6 w-40 bg-gray-200 rounded mb-4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="h-5 w-24 bg-gray-200 rounded mb-1"></div>
                    <div className="h-10 w-full bg-gray-200 rounded-md"></div>
                  </div>
                  <div>
                    <div className="h-5 w-24 bg-gray-200 rounded mb-1"></div>
                    <div className="h-10 w-full bg-gray-200 rounded-md"></div>
                  </div>
                </div>
              </div>

              {/* Delivery Details Section Skeleton */}
              <div className="pt-4 border-t border-gray-200">
                <div className="h-6 w-36 bg-gray-200 rounded mb-4"></div>

                <div className="mb-4">
                  <div className="h-5 w-32 bg-gray-200 rounded mb-1"></div>
                  <div className="h-10 w-full bg-gray-200 rounded-md"></div>
                </div>
                <div className="mb-4">
                  <div className="h-5 w-40 bg-gray-200 rounded mb-1"></div>
                  <div className="h-10 w-full bg-gray-200 rounded-md"></div>
                </div>
              </div>

              {/* Payment Method Section Skeleton */}
              <div className="pt-4 border-t border-gray-200">
                <div className="h-6 w-44 bg-gray-200 rounded mb-4"></div>

                <div className="mb-4">
                  <div className="h-5 w-40 bg-gray-200 rounded mb-2"></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {[1, 2, 3].map((method) => (
                      <div
                        key={method}
                        className="border border-gray-200 rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="h-5 w-5 bg-gray-200 rounded-full mr-2"></div>
                            <div className="h-5 w-16 bg-gray-200 rounded"></div>
                          </div>
                          <div className="w-4 h-4 rounded-full border border-gray-200"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Navigation Buttons Skeleton */}
              <div className="pt-6 border-t border-gray-200">
                <div className="flex justify-end space-x-4">
                  <div className="h-10 w-20 bg-gray-200 rounded"></div>
                  <div className="h-10 w-36 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {/* Services Summary */}
            <div className="bg-blue-50 p-4 border-b border-gray-200">
              <div className="flex items-center mb-2">
                <FiServer />
                <h3 className="font-medium text-gray-900">Order Summary</h3>
              </div>

              <div className="flex flex-wrap gap-2 mb-2">
                {services.map((service, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-[#F468BB] bg-opacity-20 text-white"
                  >
                    {service}
                  </span>
                ))}
              </div>

              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-[#F468BB] bg-opacity-20 text-white">
                <span className="font-medium">
                  {
                    Object.values(clothing).filter(
                      (q) => typeof q === "number" && q > 0
                    ).length
                  }{" "}
                  different types
                </span>{" "}
                of clothing items selected
                {soap && (
                  <span className="ml-2 text-green-200">• Using own soap</span>
                )}
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Pickup Date and Time Section */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  Pickup Schedule
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Pickup Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pickup Date
                    </label>
                    <input
                      type="date"
                      value={pickupDate}
                      onChange={(e) => {
                        const selectedDate = new Date(e.target.value);
                        if (isDayAvailable(selectedDate)) {
                          setPickupDate(e.target.value);
                        } else {
                          alert(
                            "The shop is either closed on this day or the date is in the past."
                          );
                        }
                      }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#F468BB] focus:ring-[#F468BB] sm:text-sm px-3 py-2"
                      min={new Date().toISOString().split("T")[0]} // Disable past dates
                    />
                  </div>

                  {/* Pickup Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pickup Time
                    </label>
                    <select
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#F468BB] focus:ring-[#F468BB] sm:text-sm px-3 py-2"
                      disabled={!pickupDate}
                    >
                      <option value="" disabled>
                        {pickupDate ? "Select a time" : "Select a date first"}
                      </option>
                      {availableTimes.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Delivery Instructions Section */}
              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  Delivery Details
                </h4>

                {/* Address Input with Suggestions */}
                <div className="mb-4 relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Address
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiMapPin />
                    </div>
                    <input
                      type="text"
                      value={customerAddress}
                      onChange={handleAddressChange}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() =>
                        setTimeout(() => setShowSuggestions(false), 200)
                      }
                      className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#F468BB] focus:ring-[#F468BB] sm:text-sm px-3 py-2"
                      placeholder="Enter your address"
                    />
                  </div>
                  {showSuggestions && suggestedAddresses && (
                    <ul className="absolute z-10 bg-white border border-gray-300 rounded-md shadow-lg mt-1 w-full overflow-auto max-h-40">
                      <li
                        onClick={() => handleAddressSelect(suggestedAddresses)}
                        className="px-4 py-2 cursor-pointer hover:bg-blue-50 text-sm"
                      >
                        {suggestedAddresses}
                      </li>
                    </ul>
                  )}
                </div>

                {/* Delivery Instructions */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Instructions
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiFileText />
                    </div>
                    <input
                      type="text"
                      value={deliveryInstructions}
                      onChange={(e) => setDeliveryInstructions(e.target.value)}
                      className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#F468BB] focus:ring-[#F468BB] sm:text-sm px-3 py-2"
                      placeholder="Special instructions for delivery (optional)"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method Section */}
              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  Payment Information
                </h4>

                {/* Payment Method */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Payment Method
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {paymentMethods.map((method) => (
                      <div
                        key={method.method_id}
                        className={`border rounded-lg p-3 cursor-pointer transition-all ${
                          payment_method === method.name
                            ? "border-[#F468BB] bg-pink-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => setPaymentMethod(method.name)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            {method.name.toLowerCase().includes("cash") ? (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 text-green-500 mr-2"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            ) : method.name.toLowerCase().includes("card") ? (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 text-red-500 mr-2"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                                <path
                                  fillRule="evenodd"
                                  d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            ) : (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 text-blue-500 mr-2"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                              </svg>
                            )}
                            <span className="text-sm font-medium">
                              {method.name.charAt(0).toUpperCase() +
                                method.name.slice(1)}
                            </span>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-full border ${
                              payment_method === method.name
                                ? "border-[#F468BB] bg-[#F468BB]"
                                : "border-gray-300"
                            }`}
                          >
                            {payment_method === method.name && (
                              <div className="w-2 h-2 rounded-full bg-[#F468BB] mx-auto mt-0.5 "></div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="pt-6 border-t border-gray-200">
                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => router.back()}
                    className="btn btn-neutral w-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={
                      !pickupDate ||
                      !pickupTime ||
                      !customerAddress ||
                      !payment_method ||
                      isProceedingToConfirmation
                    }
                    className={`px-6 py-2.5 bg-[#F468BB] text-white rounded-lg hover:bg-opacity-90 transition-colors flex items-center justify-center ${
                      !pickupDate ||
                      !pickupTime ||
                      !customerAddress ||
                      !payment_method ||
                      isProceedingToConfirmation
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {isProceedingToConfirmation ? (
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
                    ) : (
                      "Complete Order"
                    )}
                  </button>
                </div>
                {(!pickupDate ||
                  !pickupTime ||
                  !customerAddress ||
                  !payment_method) && (
                  <p className="text-center text-sm text-gray-500 mt-4">
                    Please fill in all required fields to proceed.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
