"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext"; // Import the AuthContext
import Home from "../../../components/common/Home";
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
  FiStar,
  FiCreditCard,
  FiShoppingBag,
  FiSpeaker,
} from "react-icons/fi";
import { set } from "mongoose";

export default function Order() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OrderContent />
    </Suspense>
  );
}

function OrderContent() {
  const { user } = useAuth(); // Retrieve the authenticated user
  const customer_id = user?.id; // Assume `id` is the customer_id

  const router = useRouter();
  const searchParams = useSearchParams();
  const initialShopType = searchParams?.get("shopType") || ""; // Get shopType from query params

  // Add this loading state
  const [loading, setLoading] = useState(true);
  interface Feedback {
    customer_name?: string;
    rating: number;
    date: string | Date; // Accept both string and Date types
    comment?: string;
  }
  interface Shop {
    shop_id: string;
    name: string;
    address: string;
    type: string;
    services: { name: string; price_per_kg: number }[];
    payment_methods: { name: string }[];
    phone?: string;
    email?: string;
    delivery_fee?: boolean;
    opening_hours?: {
      [day: string]: { start: string; end: string };
    };
    // feedbacks?: {
    //   customer_name?: string;
    //   rating: number;
    //   date: string;
    //   comment?: string;
    // }[];
    feedbacks?: Feedback[]; // Array of feedback objects
    machines?: {
      machine_id: string;
      type: string;
      price_per_minimum_kg: number;
      minimum_kg: number;
      minimum_minutes: number;
      customer_id?: string; // ID of the customer using the machine
    }[];
    avgRating?: number; // Pre-calculated average rating
  }

  // Filter states
  // const [shopType, setShopType] = useState("");
  const [shopType, setShopType] = useState(initialShopType); // Initialize with query param
  const [shops, setShops] = useState<Shop[]>([]);
  const [shop, setShop] = useState<Shop | null>(null);
  const [filteredShops, setFilteredShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<string | null>(null);

  const [priceRange, setPriceRange] = useState([0, 100]); // Default price range
  const [paymentMethod, setPaymentMethod] = useState("");
  const [service, setService] = useState("");
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  // Add a loading state to track button click status
  const [isProceedingToServices, setIsProceedingToServices] = useState(false);
  // First add a new state to track which shop's reviews are being viewed
  const [location, setLocation] = useState("");
  const [minRating, setMinRating] = useState(0); // 0 means no filter
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);
  const [selectedShopForReviews, setSelectedShopForReviews] =
    useState<Shop | null>(null);

  // Add this function to open the reviews modal
  const openReviewsModal = (shop: Shop, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedShopForReviews(shop);
    setReviewsModalOpen(true);
  };

  const navigateBackToDashboard = () => {
    router.push("/auth/dashboard");
  };

  const handleProceed = () => {
    if (selectedShop) {
      setIsProceedingToServices(true);
      router.push(`/auth/order/${selectedShop}/services`);
    } else {
      alert("Please select a shop to proceed.");
    }
  };

  // Replace your fetchShops function (lines 78-109)

  useEffect(() => {
    const fetchShops = async () => {
      try {
        setLoading(true); // Set loading to true before fetching
        const response = await fetch("/api/shops");
        if (!response.ok) {
          throw new Error("Failed to fetch shops");
        }
        const data = await response.json();

        // Get all shops first
        const allShops = data.shops;

        // Fetch ratings for each shop in parallel
        const shopsWithRatingsPromises = allShops.map(async (shop: Shop) => {
          try {
            // Use the dedicated feedbacks API endpoint to get all shop feedbacks
            const feedbackResponse = await fetch(
              `/api/shops/${shop.shop_id}/feedbacks`
            );

            if (!feedbackResponse.ok) {
              console.warn(`Couldn't fetch feedbacks for shop ${shop.shop_id}`);
              return { ...shop, avgRating: 0 };
            }

            const feedbackData = await feedbackResponse.json();
            const rawFeedbacks = feedbackData.feedbacks || [];

            // Process feedbacks to ensure all fields are standardized
            const processedFeedbacks = rawFeedbacks.map((fb: any) => {
              return {
                // Use appropriate field names with fallbacks
                customer_name: fb.customer_name || fb.name || "Anonymous User",
                rating: Number(fb.rating || 0),
                // Handle different possible field names for comments
                comment: fb.comment || fb.comments || fb.feedback_text || "",
                // Handle date formatting with fallbacks
                date:
                  fb.date ||
                  fb.created_at ||
                  fb.date_submitted ||
                  new Date().toISOString(),
              };
            });

            // Calculate average rating
            let avgRating = 0;
            if (processedFeedbacks.length > 0) {
              const sum = processedFeedbacks.reduce(
                (acc: number, fb: any) => acc + fb.rating,
                0
              );
              avgRating = parseFloat(
                (sum / processedFeedbacks.length).toFixed(1)
              );
            }

            console.log(
              `Shop ${shop.name} processed feedbacks:`,
              processedFeedbacks
            );

            // Return shop with calculated average rating and processed feedbacks
            return {
              ...shop,
              feedbacks: processedFeedbacks,
              avgRating: avgRating,
            };
          } catch (error) {
            console.error(
              `Error fetching feedbacks for shop ${shop.shop_id}:`,
              error
            );
            return { ...shop, avgRating: 0 };
          }
        });

        // Wait for all feedback requests to complete
        const shopsWithRatings = await Promise.all(shopsWithRatingsPromises);

        setShops(shopsWithRatings);
        setFilteredShops(shopsWithRatings);
        setLoading(false); // Set loading to false after data is loaded
      } catch (error) {
        console.error("Error fetching shops:", error);
        setLoading(false); // Set loading to false after data is loaded
      }
    };

    fetchShops();
  }, []);

  // Update the getAverageRating function to use the pre-calculated average
  const getAverageRating = (shop: Shop) => {
    // If avgRating has been pre-calculated, use that value
    if (typeof shop.avgRating === "number") {
      return shop.avgRating;
    }

    // Fallback calculation if avgRating isn't available
    if (!shop.feedbacks || shop.feedbacks.length === 0) return 0;

    const totalRating = shop.feedbacks.reduce(
      (sum, feedback) => sum + parseFloat(feedback.rating.toString() || "0"),
      0
    );

    return parseFloat((totalRating / shop.feedbacks.length).toFixed(1));
  };

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

      // Location filter - NEW
      const matchesLocation = location
        ? shop.address.toLowerCase().includes(location.toLowerCase())
        : true;

      // Rating filter - NEW
      const avgRating = getAverageRating(shop);
      const matchesRating = minRating > 0 ? avgRating >= minRating : true;

      return (
        matchesType &&
        matchesPrice &&
        matchesPayment &&
        matchesService &&
        matchesLocation &&
        matchesRating
      );
    });

    setFilteredShops(filtered);
  }, [
    shopType,
    priceRange,
    paymentMethod,
    service,
    shops,
    location,
    minRating,
  ]);

  const formatOperatingHours = (shop: Shop) => {
    if (
      !shop.opening_hours ||
      !Array.isArray(shop.opening_hours) ||
      shop.opening_hours.length === 0
    ) {
      return "No hours specified";
    }

    // Sort days in correct order (Monday first)
    const daysOrder = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    const sortedHours = [...shop.opening_hours].sort((a, b) => {
      return daysOrder.indexOf(a.day) - daysOrder.indexOf(b.day);
    });

    // Group consecutive days with same hours
    const groups: { days: string[]; hours: string }[] = [];
    let currentGroup: { days: string[]; hours: string } | null = null;

    sortedHours.forEach((daySchedule) => {
      const hours = `${daySchedule.open} - ${daySchedule.close}`;

      if (!currentGroup) {
        // First day
        currentGroup = { days: [daySchedule.day], hours };
      } else if (
        currentGroup.hours === hours &&
        daysOrder.indexOf(daySchedule.day) ===
          daysOrder.indexOf(currentGroup.days[currentGroup.days.length - 1]) + 1
      ) {
        // Consecutive day with same hours
        currentGroup.days.push(daySchedule.day);
      } else {
        // Different hours or non-consecutive day
        groups.push(currentGroup);
        currentGroup = { days: [daySchedule.day], hours };
      }
    });
    // Add the last group
    if (currentGroup) {
      groups.push(currentGroup);
    }

    // Format the groups
    return groups
      .map((group) => {
        if (group.days.length === 1) {
          return `${group.days[0]}: ${group.hours}`;
        } else {
          return `${group.days[0]} - ${group.days[group.days.length - 1]}: ${group.hours}`;
        }
      })
      .join("\n");
  };

  // Render stars for ratings
  const renderStars = (rating: number) => {
    const roundedRating = Math.round(rating * 2) / 2; // Round to nearest 0.5
    const stars = [];

    for (let i = 1; i <= 5; i++) {
      if (i <= roundedRating) {
        // Full star
        stars.push(
          <FiStar key={i} className="w-4 h-4 text-yellow-400 fill-current" />
        );
      } else if (i - 0.5 === roundedRating) {
        // Half star - you might need a special icon for this
        stars.push(
          <FiStar
            key={i}
            className="w-4 h-4 text-yellow-400 fill-[url(#half)]"
          />
        );
      } else {
        // Empty star
        stars.push(<FiStar key={i} className="w-4 h-4 text-gray-300" />);
      }
    }
    return (
      <div className="flex items-center">
        {stars}
        <span className="ml-1 text-sm text-gray-600">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 w-full">
      {/* Header */}
      <div className="bg-white shadow-sm w-full px-0 mx-0">
        <Home href="/auth/dashboard" />
      </div>

      {/* Order Progress Bar */}
      <div className="bg-white pt-6 pb-4 px-4 shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">
            Select a Shop
          </h2>

          {/* Progress steps with properly positioned connecting line */}
          <div className="relative">
            {/* Connecting line - positioned in the middle of the circles */}
            <div className="absolute top-4 left-0 right-0 flex items-center">
              <div className="h-0.5 bg-gray-200 w-full" />
              <div
                className="absolute h-0.5 bg-[#F468BB] transition-all duration-300"
                style={{ width: "10%" }}
              />
            </div>

            {/* Steps display */}
            <div className="relative flex items-center justify-between mb-2">
              {/* Step 1: Choose Shop */}
              <div className="flex flex-col items-center relative z-10">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#F468BB] text-white">
                  <span>1</span>
                </div>
                <span className="text-xs mt-2 text-[#F468BB] font-medium">
                  Select Shop
                </span>
              </div>
              {/* Step 2: Choose Services */}
              <div className="flex flex-col items-center relative z-10">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white border border-gray-200 text-gray-400">
                  <span>2</span>
                </div>
                <span className="text-xs mt-2 text-gray-500">
                  Select Services
                </span>
              </div>
              {/* Step 3: Schedule */}
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

              <div className="flex flex-col items-center relative z-10">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white border border-gray-200 text-gray-400">
                  <span>4</span>
                </div>
                <span className="text-xs mt-2 text-gray-500">
                  Schedule & Payment
                </span>
              </div>
              {/* Step 5: Review */}
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
      <div className="flex-1 w-full py-8 px-0 md:px-4 max-w-7xl mx-auto">
        {/* Filters Section */}
        <div className="bg-white shadow rounded-lg p-6 mb-8 w-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-medium text-gray-900 flex items-center">
              <FiFilter className="mr-2" /> Filters
            </h2>
            <button
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className="text-[#F468BB] hover:text-[#d44f9e] text-sm font-medium"
            >
              {isFilterExpanded ? "Show Less" : "Show More"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Shop Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shop Type
              </label>
              <div className="relative">
                <select
                  value={shopType}
                  onChange={(e) => setShopType(e.target.value)}
                  className="text-sm block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-[#F468BB] focus:border-[#F468BB] rounded-md"
                >
                  <option value="">All Types</option>
                  <option value="pickup-delivery">Pickup & Delivery</option>
                  <option value="self-service">Self-Service</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  {/* <svg
                    className="h-5 w-5 text-gray-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg> */}
                </div>
              </div>
            </div>

            {/* Payment Method Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <div className="relative">
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="text-sm block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-[#F468BB] focus:border-[#F468BB] rounded-md"
                >
                  <option value="">All Payment Methods</option>
                  <option value="Cash">Cash</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Gcash">Gcash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  {/* <svg
                    className="h-5 w-5 text-gray-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg> */}
                </div>
              </div>
            </div>

            {/* Price Range Filter */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price Range (₱/kg)
              </label>
              <div className="flex items-center space-x-4">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">₱</span>
                  </div>
                  <input
                    type="number"
                    value={priceRange[0]}
                    onChange={(e) =>
                      setPriceRange([+e.target.value, priceRange[1]])
                    }
                    className="text-sm pl-7 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#F468BB] focus:border-[#F468BB]"
                    placeholder="Min"
                  />
                </div>
                <span className="text-gray-500">to</span>
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">₱</span>
                  </div>
                  <input
                    type="number"
                    value={priceRange[1]}
                    onChange={(e) =>
                      setPriceRange([priceRange[0], +e.target.value])
                    }
                    className="text-sm pl-7 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#F468BB] focus:border-[#F468BB]"
                    placeholder="Max"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Additional filters */}
          {/* Additional filters */}
          {isFilterExpanded && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              {/* Service Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="text-sm pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#F468BB] focus:border-[#F468BB]"
                    placeholder="Search for a service (e.g., Wash, Iron, Fold)"
                  />
                </div>
              </div>

              {/* Location Filter - NEW */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiMapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="text-sm pl-10 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#F468BB] focus:border-[#F468BB]"
                    placeholder="Search by area or address"
                  />
                </div>
              </div>

              {/* Rating Filter - NEW */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Rating
                </label>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() =>
                        setMinRating(rating === minRating ? 0 : rating)
                      }
                      className="focus:outline-none"
                      aria-label={`${rating} stars`}
                    >
                      <FiStar
                        className={`w-6 h-6 ${
                          rating <= minRating
                            ? "text-yellow-400 fill-current"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                  {minRating > 0 && (
                    <button
                      onClick={() => setMinRating(0)}
                      className="ml-2 text-xs text-gray-500 hover:text-gray-700"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Shop Results - Cards Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            // Loading state - shows 3 placeholder cards
            <>
              {[1, 2, 3].map((placeholder) => (
                <div
                  key={placeholder}
                  className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse"
                >
                  {/* Shop Header Placeholder */}
                  <div className="p-4 bg-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-lg bg-gray-200"></div>
                        <div className="ml-3 h-5 w-36 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center">
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <div
                            key={star}
                            className="w-4 h-4 bg-gray-200 rounded-full"
                          ></div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Shop Body Placeholder */}
                  <div className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <div className="w-4 h-4 bg-gray-200 rounded-full flex-shrink-0 mt-0.5"></div>
                        <div className="ml-2 h-4 w-full bg-gray-200 rounded"></div>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
                        <div className="ml-2 h-4 w-32 bg-gray-200 rounded"></div>
                      </div>
                    </div>

                    {/* Services Placeholder */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="mb-3">
                        <div className="flex items-center mb-2">
                          <div className="w-3 h-3 bg-gray-200 rounded-full mr-1"></div>
                          <div className="h-3 w-20 bg-gray-200 rounded"></div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {[1, 2, 3].map((s) => (
                            <div
                              key={s}
                              className="h-6 w-20 bg-gray-200 rounded-full"
                            ></div>
                          ))}
                        </div>
                      </div>

                      {/* Payment Methods Placeholder */}
                      <div>
                        <div className="flex items-center mb-2">
                          <div className="w-3 h-3 bg-gray-200 rounded-full mr-1"></div>
                          <div className="h-3 w-24 bg-gray-200 rounded"></div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {[1, 2].map((p) => (
                            <div
                              key={p}
                              className="h-6 w-16 bg-gray-200 rounded-full"
                            ></div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : filteredShops.length > 0 ? (
            filteredShops.map((shop) => (
              <div
                key={shop.shop_id}
                className={`bg-white rounded-xl shadow-sm overflow-hidden transition-shadow hover:shadow-md ${
                  selectedShop === shop.shop_id ? "ring-2 ring-[#F468BB]" : ""
                }`}
              >
                {/* Shop Header */}
                <div
                  className={`p-4 ${shop.type === "pickup-delivery" ? "bg-blue-50" : "bg-purple-50"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div
                        className={`p-2 rounded-lg ${
                          shop.type === "pickup-delivery"
                            ? "bg-blue-100"
                            : "bg-purple-100"
                        }`}
                      >
                        {shop.type === "pickup-delivery" ? (
                          <FiTruck className="w-5 h-5 text-blue-600" />
                        ) : (
                          <FiHome className="w-5 h-5 text-purple-600" />
                        )}
                      </div>
                      <h3 className="ml-3 text-lg font-medium text-gray-900">
                        {shop.name}
                      </h3>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id={`shop-${shop.shop_id}`}
                        name="selectedShop"
                        value={shop.shop_id}
                        checked={selectedShop === shop.shop_id}
                        onChange={() => setSelectedShop(shop.shop_id)}
                        className="h-4 w-4 text-[#F468BB] border-gray-300 focus:ring-[#F468BB]"
                      />
                    </div>
                  </div>
                  <div
                    className="mt-2 flex items-center cursor-pointer hover:text-[#F468BB]"
                    onClick={(e) => openReviewsModal(shop, e)}
                  >
                    {renderStars(getAverageRating(shop))}
                    <span className="ml-2 text-xs text-gray-500 hover:text-[#F468BB]">
                      ({shop.feedbacks ? shop.feedbacks.length : 0} reviews) -
                      Click to view
                    </span>
                  </div>
                </div>

                {/* Shop Body */}
                <div className="p-4">
                  <div className="space-y-3">
                    {/* Address */}
                    <div className="flex items-start">
                      <FiMapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <p className="ml-2 text-sm text-gray-600">
                        {shop.address}
                      </p>
                    </div>

                    {/* Phone */}
                    {shop.phone && (
                      <div className="flex items-center">
                        <FiPhone className="w-4 h-4 text-gray-400" />
                        <p className="ml-2 text-sm text-gray-600">
                          {shop.phone}
                        </p>
                      </div>
                    )}

                    {/* Email */}
                    {shop.email && (
                      <div className="flex items-center">
                        <FiMail className="w-4 h-4 text-gray-400" />
                        <p className="ml-2 text-sm text-gray-600">
                          {shop.email}
                        </p>
                      </div>
                    )}

                    {/* Opening Hours */}
                    {shop.opening_hours &&
                      Array.isArray(shop.opening_hours) &&
                      shop.opening_hours.length > 0 && (
                        <div className="flex items-start">
                          <FiClock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="ml-2">
                            <p className="text-xs font-medium text-gray-600">
                              Opening Hours:
                            </p>
                            <p className="text-xs text-gray-600 whitespace-pre-line">
                              {formatOperatingHours(shop)}
                            </p>
                          </div>
                        </div>
                      )}

                    {/* Delivery Fee */}
                    {shop.type === "pickup-delivery" && (
                      <div className="flex items-center">
                        <FiTruck className="w-4 h-4 text-gray-400" />
                        <p className="ml-2 text-sm text-gray-600">
                          {shop.delivery_fee === true
                            ? "Free Delivery"
                            : "Delivery Fee Applies"}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Services and Payment Methods */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="mb-3">
                      <h4 className="text-xs font-medium text-gray-500 flex items-center mb-2">
                        <FiShoppingBag className="w-3 h-3 mr-1" /> SERVICES
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {shop.services.map((service, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800"
                          >
                            {service.name} - ₱{service.price_per_kg}/kg
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      {shop.type === "self-service" && (
                        <div className="mb-3">
                          <h4 className="text-xs font-medium text-gray-500 flex items-center mb-2">
                            <FiSpeaker className="w-3 h-3 mr-1" /> MACHINES
                          </h4>

                          {shop.machines && shop.machines.length > 0 ? (
                            <div className="grid grid-cols-2 gap-1">
                              {shop.machines.map((machine, idx) => (
                                <div
                                  key={idx}
                                  className={`inline-flex items-center px-2 py-1.5 rounded text-xs ${
                                    machine.customer_id
                                      ? "bg-gray-100 text-gray-500"
                                      : "bg-green-50 text-green-700"
                                  }`}
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      {machine.machine_id} ({machine.type})
                                    </span>
                                    <div className="flex items-center justify-between text-xs">
                                      <span>
                                        ₱{machine.price_per_minimum_kg}/
                                        {machine.minimum_kg}kg -{" "}
                                        {machine.minimum_minutes} min
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500">
                              No machine information available
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-xs font-medium text-gray-500 flex items-center mb-2">
                        <FiCreditCard className="w-3 h-3 mr-1" /> PAYMENT
                        METHODS
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {shop.payment_methods.map((method, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800"
                          >
                            {method.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FiSearch className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                No shops found
              </h3>
              <p className="text-gray-600">
                Try adjusting your filters or search criteria
              </p>
              <button
                onClick={() => {
                  setShopType("");
                  setPaymentMethod("");
                  setService("");
                  setPriceRange([0, 100]);
                }}
                className="mt-4 text-[#F468BB] hover:underline font-medium"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="mt-8 flex space-x-4 justify-end">
          <button
            onClick={() => router.push("/auth/dashboard")}
            className="btn btn-neutral w-50"
          >
            Cancel
          </button>
          <button
            onClick={handleProceed}
            disabled={!selectedShop || isProceedingToServices}
            className={`px-6 py-2.5 bg-[#F468BB] text-white rounded-lg hover:bg-opacity-90 transition-colors flex items-center justify-center ${
              !selectedShop || isProceedingToServices
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
            ) : (
              "Move to Services"
            )}
          </button>
        </div>
      </div>

      {/* Reviews Modal - Moved outside the shop mapping loop */}
      {reviewsModalOpen && selectedShopForReviews && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity"
              onClick={() => setReviewsModalOpen(false)}
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen"></span>
            &#8203;
            <div
              className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-headline"
            >
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-500"
                  onClick={() => setReviewsModalOpen(false)}
                >
                  <span className="sr-only">Close</span>
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div>
                <div className="mt-3 text-center sm:mt-0 sm:text-left">
                  <h3
                    className="text-lg leading-6 font-medium text-gray-900"
                    id="modal-headline"
                  >
                    Reviews for {selectedShopForReviews.name}
                  </h3>

                  <div className="mt-4 flex items-center mb-4">
                    {renderStars(getAverageRating(selectedShopForReviews))}
                    <span className="ml-2 text-sm text-gray-600">
                      (
                      {selectedShopForReviews.feedbacks
                        ? selectedShopForReviews.feedbacks.length
                        : 0}{" "}
                      reviews)
                    </span>
                  </div>
                  <div className="mt-2 max-h-96 overflow-y-auto">
                    {selectedShopForReviews.feedbacks &&
                    selectedShopForReviews.feedbacks.length > 0 ? (
                      <ul className="divide-y divide-gray-200">
                        {selectedShopForReviews.feedbacks.map(
                          (feedback: any, index: number) => (
                            <li key={index} className="py-4">
                              <div className="flex items-start">
                                <div className="mr-3 flex-shrink-0">
                                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                                    <span className="text-purple-800 font-medium">
                                      {feedback.customer_name
                                        ? feedback.customer_name
                                            .charAt(0)
                                            .toUpperCase()
                                        : "U"}
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {feedback.customer_name || "User"}
                                  </p>
                                  <div className="flex items-center mt-1">
                                    <div className="flex">
                                      {Array.from({ length: 5 }, (_, i) => (
                                        <FiStar
                                          key={i}
                                          className={`w-4 h-4 ${
                                            i < Number(feedback.rating)
                                              ? "text-yellow-400 fill-current"
                                              : "text-gray-300"
                                          }`}
                                        />
                                      ))}
                                    </div>
                                    <span className="ml-1 text-xs text-gray-500">
                                      {new Date(
                                        feedback.date
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="mt-2 text-sm text-gray-600">
                                    {feedback.comment || "No comment provided."}
                                  </p>
                                </div>
                              </div>
                            </li>
                          )
                        )}
                      </ul>
                    ) : (
                      <div className="text-center py-10">
                        <p className="text-gray-500">
                          No reviews yet for this shop.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Add a close button at the bottom */}
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#F468BB] text-base font-medium text-white hover:bg-opacity-90 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setReviewsModalOpen(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
