"use client";

import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { useState, useEffect } from "react";
import Home from "@/app/components/common/Home";

export default function PickupDetails() {
  const router = useRouter();
  const { user } = useAuth(); // Get the logged-in user from AuthContext
  const { shop_id } = useParams(); // Extract shop_id from the URL path
  const searchParams = useSearchParams();
  const services = searchParams.get("services")?.split(",") || []; // Get services from query params
  const clothing = JSON.parse(searchParams.get("clothing") || "{}"); // Parse clothing from query params

  // console.log(clothing);
  const [openingHours, setOpeningHours] = useState<
    { day: string; open: string; close: string }[]
  >([]);
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [availableTimes, setAvailableTimes] = useState<string[]>([]); // List of available times

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
        const response = await fetch(`/api/customers/${user?.customer_id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch addresses");
        }
        const data = await response.json();
        setSuggestedAddresses(data.customer.address || ""); // Set the single address
      } catch (error) {
        console.error("Error fetching addresses:", error);
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
  const soap = searchParams.get("soap") === "true"; // Convert the string to a boolean

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
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            min={new Date().toISOString().split("T")[0]} // Disable past dates
          />
        </div>

        {/* Pickup Time */}
        {pickupDate && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Pickup Time
            </label>
            <select
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="" disabled>
                Select a time
              </option>
              {availableTimes.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Address Input with Suggestions */}
        <div className="mb-4 relative">
          <label className="block text-sm font-medium text-gray-700">
            Dorm Address
          </label>
          <input
            type="text"
            value={customerAddress}
            onChange={handleAddressChange}
            onFocus={() => setShowSuggestions(true)} // Show suggestions on focus
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} // Hide suggestions on blur with a delay
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="Enter your address"
          />
          {showSuggestions && suggestedAddresses && (
            <ul className="absolute z-10 bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-40 w-full overflow-auto">
              <li
                onClick={() => handleAddressSelect(suggestedAddresses)}
                className="px-4 py-2 cursor-pointer hover:bg-blue-100"
              >
                {suggestedAddresses}
              </li>
            </ul>
          )}
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
            {paymentMethods.map((method) => (
              <option key={method.method_id} value={method.name}>
                {method.name.charAt(0).toUpperCase() + method.name.slice(1)}
              </option>
            ))}
          </select>
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
