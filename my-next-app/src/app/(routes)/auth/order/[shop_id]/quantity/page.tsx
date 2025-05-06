"use client";

import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Home from "@/app/components/common/Home";
import {
  FiTrash2,
  FiPlus,
  FiMinus,
  FiCheck,
  FiCheckCircle,
} from "react-icons/fi";

export default function InputQuantity() {
  const router = useRouter();
  const params = useParams(); // Extract params from the URL path
  const shop_id = params?.shop_id as string | undefined; // Safely extract shop_id
  const searchParams = useSearchParams();
  const services = searchParams?.get("services")?.split(",") || []; // Get selected services from query params
  const total_weight = searchParams?.get("total_weight")
    ? parseFloat(searchParams.get("total_weight")!)
    : 0;

  const total_price = searchParams?.get("total_price")
    ? parseFloat(searchParams.get("total_price")!)
    : 0;
  const [isProceedingToSchedule, setIsProceedingToSchedule] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState({
    // Everyday Wear
    tshirts: 0,
    shirts: 0,
    pants: 0,
    shorts: 0,
    dresses: 0,

    // Outerwear
    jackets: 0,
    hoodies: 0,

    // Undergarments
    underwear: 0,
    socks: 0,

    // Bedding & Linens
    bedsheets: 0,
    pillowcases: 0,
    blankets: 0,
    towels: 0,

    // Formal Wear
    dressShirts: 0,
    suits: 0,

    // Miscellaneous
    uniforms: 0,
    curtains: 0,
  });

  const [customClothing, setCustomClothing] = useState<
    { type: string; quantity: number }[]
  >([]);

  const [soapProvided, setSoapProvided] = useState(false); // State for soap checkbox

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

  const handleRemoveCustomClothing = (index: number) => {
    setCustomClothing(customClothing.filter((_, i) => i !== index));
  };

  const handleProceed = () => {
    if (!shop_id) {
      console.error("shop_id is null or undefined");
      return;
    }
    setIsProceedingToSchedule(true); // Set loading state to true

    const allClothing = {
      ...quantities,
      customClothing,
    };

    const queryParams = new URLSearchParams({
      services: services.join(","),
      total_weight: total_weight.toString(),
      total_price: total_price.toString(),
      clothing: JSON.stringify(allClothing),
      soap: soapProvided.toString(), // Pass the soap state as a string
    }).toString();

    router.push(`/auth/order/${shop_id}/pickup?${queryParams}`);
  };

  // Check if at least one item has a quantity greater than 0
  const hasItems = () => {
    return (
      Object.values(quantities).some((q) => q > 0) ||
      customClothing.some((item) => item.quantity > 0)
    );
  };

  // Add this effect to simulate data loading (you can connect it to your actual data fetching later)
  useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 w-full">
      {/* Header */}
      <div className="bg-white shadow-sm w-full px-0 mx-0">
        <Home href={`/auth/order/${shop_id}/services`} />
      </div>

      {/* Order Progress Bar */}
      <div className="bg-white pt-6 pb-4 px-4 shadow-sm border-b border-gray-200">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">
            Input Your Clothes
          </h2>

          {/* Progress steps with properly positioned connecting line */}
          <div className="relative">
            {/* Connecting line - positioned in the middle of the circles */}
            <div className="absolute top-4 left-0 right-0 flex items-center">
              <div className="h-0.5 bg-gray-200 w-full" />
              <div
                className="absolute h-0.5 bg-[#F468BB] transition-all duration-300"
                style={{ width: "50%" }}
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

              {/* Step 3: Schedule - active */}
              <div className="flex flex-col items-center relative z-10">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#F468BB] text-white">
                  <span>3</span>
                </div>
                <span className="text-xs mt-2 text-[#F468BB] font-medium">
                  Input Your Clothes
                </span>
              </div>

              {/* Step 4: Payment - pending */}
              <div className="flex flex-col items-center relative z-10">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white border border-gray-200 text-gray-400">
                  <span>4</span>
                </div>
                <span className="text-xs mt-2 text-gray-500">
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

      <div className="flex-1 w-full py-8 px-4 max-w-5xl mx-auto">
        {/* Main Content */}
        {loading ? (
          <>
            <div className="min-h-screen flex flex-col bg-gray-50 w-full">
              {/* Main Content Skeleton */}
              <div className="flex-1 w-full py-8 px-4 max-w-5xl mx-auto">
                <div className="bg-white shadow rounded-lg overflow-hidden">
                  {/* Services Selected Skeleton */}
                  <div className="bg-gray-100 p-4 border-b border-gray-200">
                    <div className="h-5 w-36 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-6 w-20 bg-gray-200 rounded-full animate-pulse"
                        ></div>
                      ))}
                    </div>
                  </div>

                  <div className="p-6">
                    {/* Clothing Categories Skeleton */}
                    <div className="mb-6">
                      <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4"></div>

                      {/* Clothing Category Sections */}
                      {[1, 2, 3, 4, 5, 6].map((category) => (
                        <div key={category} className="mb-5">
                          <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-3"></div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[1, 2, 3, 4].map((item) => (
                              <div
                                key={`${category}-${item}`}
                                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50"
                              >
                                <div className="h-5 w-24 bg-gray-200 rounded animate-pulse"></div>
                                <div className="flex items-center">
                                  <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
                                  <div className="w-12 mx-2 h-6 bg-gray-200 rounded animate-pulse"></div>
                                  <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      {/* Soap Provision Skeleton */}
                      <div className="mt-8 mb-8">
                        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4"></div>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center">
                            <div className="w-6 h-6 rounded bg-gray-200 animate-pulse mr-3"></div>
                            <div className="h-5 w-64 bg-gray-200 rounded animate-pulse"></div>
                          </div>
                          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mt-2 ml-9"></div>
                        </div>
                      </div>

                      {/* Custom Items Skeleton */}
                      <div className="mt-8">
                        <div className="flex justify-between items-center mb-4">
                          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                        <div className="text-center py-6 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                          <div className="h-4 w-72 mx-auto bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      </div>

                      {/* Navigation Buttons Skeleton */}
                      <div className="mt-8 flex space-x-4 justify-end">
                        <div className="h-10 w-20 bg-gray-200 rounded animate-pulse"></div>
                        <div className="h-10 w-36 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {/* Services Selected */}
            <div className="bg-blue-50 p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-900 mb-2">
                Selected Services
              </h3>
              <div className="flex flex-wrap gap-2">
                {services.map((service, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-[#F468BB] bg-opacity-20 text-white"
                  >
                    {service}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-6">
              {/* Common Clothing Types */}
              {/* Categorized Clothing Types */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Clothing Items
                </h3>

                {/* Everyday Wear */}
                <div className="mb-5">
                  <h4 className="text-sm font-semibold text-[#F468BB] mb-3 flex items-center">
                    <span className="mr-2">👕</span> Everyday Wear
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {["tshirts", "shirts", "pants", "shorts", "dresses"].map(
                      (type) => (
                        <div
                          key={type}
                          className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50"
                        >
                          <label className="text-sm font-medium text-gray-800 capitalize">
                            {type === "tshirts" ? "T-Shirts" : type}
                          </label>
                          <div className="flex items-center">
                            <button
                              type="button"
                              onClick={() =>
                                handleQuantityChange(
                                  type,
                                  quantities[type as keyof typeof quantities] -
                                    1
                                )
                              }
                              disabled={
                                quantities[type as keyof typeof quantities] <= 0
                              }
                              className={`w-8 h-8 flex items-center justify-center rounded-full ${
                                quantities[type as keyof typeof quantities] <= 0
                                  ? "bg-gray-100 text-gray-400"
                                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                              }`}
                            >
                              <FiMinus className="w-4 h-4" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={
                                quantities[type as keyof typeof quantities]
                              }
                              onChange={(e) =>
                                handleQuantityChange(
                                  type,
                                  parseInt(e.target.value, 10) || 0
                                )
                              }
                              className="w-12 mx-2 text-center text-gray-900 font-medium border-none bg-transparent focus:outline-none focus:ring-0"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleQuantityChange(
                                  type,
                                  quantities[type as keyof typeof quantities] +
                                    1
                                )
                              }
                              className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F468BB] text-white hover:bg-opacity-90"
                            >
                              <FiPlus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Outerwear */}
                <div className="mb-5">
                  <h4 className="text-sm font-semibold text-[#F468BB] mb-3 flex items-center">
                    <span className="mr-2">🧥</span> Outerwear
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {["jackets", "hoodies"].map((type) => (
                      <div
                        key={type}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50"
                      >
                        <label className="text-sm font-medium text-gray-800 capitalize">
                          {type}
                        </label>
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() =>
                              handleQuantityChange(
                                type,
                                quantities[type as keyof typeof quantities] - 1
                              )
                            }
                            disabled={
                              quantities[type as keyof typeof quantities] <= 0
                            }
                            className={`w-8 h-8 flex items-center justify-center rounded-full ${
                              quantities[type as keyof typeof quantities] <= 0
                                ? "bg-gray-100 text-gray-400"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            <FiMinus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={quantities[type as keyof typeof quantities]}
                            onChange={(e) =>
                              handleQuantityChange(
                                type,
                                parseInt(e.target.value, 10) || 0
                              )
                            }
                            className="w-12 mx-2 text-center text-gray-900 font-medium border-none bg-transparent focus:outline-none focus:ring-0"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleQuantityChange(
                                type,
                                quantities[type as keyof typeof quantities] + 1
                              )
                            }
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F468BB] text-white hover:bg-opacity-90"
                          >
                            <FiPlus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Undergarments */}
                <div className="mb-5">
                  <h4 className="text-sm font-semibold text-[#F468BB] mb-3 flex items-center">
                    <span className="mr-2">🩲</span> Undergarments
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {["underwear", "socks"].map((type) => (
                      <div
                        key={type}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50"
                      >
                        <label className="text-sm font-medium text-gray-800 capitalize">
                          {type}
                        </label>
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() =>
                              handleQuantityChange(
                                type,
                                quantities[type as keyof typeof quantities] - 1
                              )
                            }
                            disabled={
                              quantities[type as keyof typeof quantities] <= 0
                            }
                            className={`w-8 h-8 flex items-center justify-center rounded-full ${
                              quantities[type as keyof typeof quantities] <= 0
                                ? "bg-gray-100 text-gray-400"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            <FiMinus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={quantities[type as keyof typeof quantities]}
                            onChange={(e) =>
                              handleQuantityChange(
                                type,
                                parseInt(e.target.value, 10) || 0
                              )
                            }
                            className="w-12 mx-2 text-center text-gray-900 font-medium border-none bg-transparent focus:outline-none focus:ring-0"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleQuantityChange(
                                type,
                                quantities[type as keyof typeof quantities] + 1
                              )
                            }
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F468BB] text-white hover:bg-opacity-90"
                          >
                            <FiPlus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bedding & Linens */}
                <div className="mb-5">
                  <h4 className="text-sm font-semibold text-[#F468BB] mb-3 flex items-center">
                    <span className="mr-2">🛌</span> Bedding & Linens
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {["bedsheets", "pillowcases", "blankets", "towels"].map(
                      (type) => (
                        <div
                          key={type}
                          className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50"
                        >
                          <label className="text-sm font-medium text-gray-800 capitalize">
                            {type}
                          </label>
                          <div className="flex items-center">
                            <button
                              type="button"
                              onClick={() =>
                                handleQuantityChange(
                                  type,
                                  quantities[type as keyof typeof quantities] -
                                    1
                                )
                              }
                              disabled={
                                quantities[type as keyof typeof quantities] <= 0
                              }
                              className={`w-8 h-8 flex items-center justify-center rounded-full ${
                                quantities[type as keyof typeof quantities] <= 0
                                  ? "bg-gray-100 text-gray-400"
                                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                              }`}
                            >
                              <FiMinus className="w-4 h-4" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={
                                quantities[type as keyof typeof quantities]
                              }
                              onChange={(e) =>
                                handleQuantityChange(
                                  type,
                                  parseInt(e.target.value, 10) || 0
                                )
                              }
                              className="w-12 mx-2 text-center text-gray-900 font-medium border-none bg-transparent focus:outline-none focus:ring-0"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleQuantityChange(
                                  type,
                                  quantities[type as keyof typeof quantities] +
                                    1
                                )
                              }
                              className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F468BB] text-white hover:bg-opacity-90"
                            >
                              <FiPlus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Formal Wear */}
                <div className="mb-5">
                  <h4 className="text-sm font-semibold text-[#F468BB] mb-3 flex items-center">
                    <span className="mr-2">👔</span> Formal Wear
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {["dressShirts", "suits"].map((type) => (
                      <div
                        key={type}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50"
                      >
                        <label className="text-sm font-medium text-gray-800 capitalize">
                          {type === "dressShirts" ? "Dress Shirts" : type}
                        </label>
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() =>
                              handleQuantityChange(
                                type,
                                quantities[type as keyof typeof quantities] - 1
                              )
                            }
                            disabled={
                              quantities[type as keyof typeof quantities] <= 0
                            }
                            className={`w-8 h-8 flex items-center justify-center rounded-full ${
                              quantities[type as keyof typeof quantities] <= 0
                                ? "bg-gray-100 text-gray-400"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            <FiMinus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={quantities[type as keyof typeof quantities]}
                            onChange={(e) =>
                              handleQuantityChange(
                                type,
                                parseInt(e.target.value, 10) || 0
                              )
                            }
                            className="w-12 mx-2 text-center text-gray-900 font-medium border-none bg-transparent focus:outline-none focus:ring-0"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleQuantityChange(
                                type,
                                quantities[type as keyof typeof quantities] + 1
                              )
                            }
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F468BB] text-white hover:bg-opacity-90"
                          >
                            <FiPlus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Miscellaneous Items */}
                <div>
                  <h4 className="text-sm font-semibold text-[#F468BB] mb-3 flex items-center">
                    <span className="mr-2">🧢</span> Miscellaneous Items
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {["uniforms", "curtains"].map((type) => (
                      <div
                        key={type}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50"
                      >
                        <label className="text-sm font-medium text-gray-800 capitalize">
                          {type}
                        </label>
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() =>
                              handleQuantityChange(
                                type,
                                quantities[type as keyof typeof quantities] - 1
                              )
                            }
                            disabled={
                              quantities[type as keyof typeof quantities] <= 0
                            }
                            className={`w-8 h-8 flex items-center justify-center rounded-full ${
                              quantities[type as keyof typeof quantities] <= 0
                                ? "bg-gray-100 text-gray-400"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            <FiMinus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={quantities[type as keyof typeof quantities]}
                            onChange={(e) =>
                              handleQuantityChange(
                                type,
                                parseInt(e.target.value, 10) || 0
                              )
                            }
                            className="w-12 mx-2 text-center text-gray-900 font-medium border-none bg-transparent focus:outline-none focus:ring-0"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleQuantityChange(
                                type,
                                quantities[type as keyof typeof quantities] + 1
                              )
                            }
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F468BB] text-white hover:bg-opacity-90"
                          >
                            <FiPlus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Soap Provision */}
              <div className="mt-8 mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Soap Provision
                </h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div
                      onClick={() => setSoapProvided(!soapProvided)}
                      className={`w-6 h-6 rounded flex items-center justify-center cursor-pointer mr-3 ${
                        soapProvided
                          ? "bg-[#F468BB]"
                          : "border-2 border-gray-300"
                      }`}
                    >
                      {soapProvided && <FiCheck className="text-white" />}
                    </div>
                    <label
                      className="flex-1 text-sm font-medium text-gray-800 cursor-pointer"
                      onClick={() => setSoapProvided(!soapProvided)}
                    >
                      I will provide my own soap/detergent
                    </label>
                  </div>
                  <p className="text-xs text-gray-600 mt-2 ml-9">
                    If unchecked, the laundry shop will provide soap.
                  </p>
                </div>
              </div>

              {/* Custom Clothing Types */}
              <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Custom Items
                  </h3>
                  <button
                    onClick={handleAddCustomClothing}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center text-sm font-medium"
                  >
                    <FiPlus className="mr-1" />
                    Add Item
                  </button>
                </div>

                {customClothing.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500 text-sm">
                      Add custom items that aren't in the common list above.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customClothing.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-3 p-3 bg-gray-50 border border-gray-200 rounded-lg"
                      >
                        <input
                          type="text"
                          placeholder="Item type"
                          value={item.type}
                          onChange={(e) =>
                            handleCustomClothingChange(
                              index,
                              "type",
                              e.target.value
                            )
                          }
                          className="flex-1 border-gray-300 rounded-md focus:border-[#F468BB] focus:ring-[#F468BB] text-sm"
                        />

                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() =>
                              handleCustomClothingChange(
                                index,
                                "quantity",
                                item.quantity - 1
                              )
                            }
                            disabled={item.quantity <= 0}
                            className={`w-8 h-8 flex items-center justify-center rounded-full ${
                              item.quantity <= 0
                                ? "bg-gray-100 text-gray-400"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            <FiMinus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={item.quantity}
                            onChange={(e) =>
                              handleCustomClothingChange(
                                index,
                                "quantity",
                                parseInt(e.target.value, 10)
                              )
                            }
                            className="w-12 mx-2 text-center text-gray-900 font-medium border-none bg-transparent focus:outline-none focus:ring-0"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleCustomClothingChange(
                                index,
                                "quantity",
                                item.quantity + 1
                              )
                            }
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F468BB] text-white hover:bg-opacity-90"
                          >
                            <FiPlus className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          onClick={() => handleRemoveCustomClothing(index)}
                          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200"
                          title="Remove item"
                        >
                          <FiTrash2 className="text-gray-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="mt-8 flex space-x-4 justify-end">
                <button
                  onClick={() => router.back()}
                  className="btn btn-neutral w-50"
                  disabled={isProceedingToSchedule}
                >
                  Back
                </button>
                <button
                  onClick={handleProceed}
                  disabled={!hasItems() || isProceedingToSchedule}
                  className={`px-6 py-2.5 bg-[#F468BB] text-white rounded-lg hover:bg-opacity-90 transition-colors flex items-center justify-center ${
                    !hasItems() || isProceedingToSchedule
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  {isProceedingToSchedule ? (
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
                    "Move to Schedule"
                  )}
                </button>
              </div>

              {/* {!hasItems() && (
              <p className="text-center text-sm text-gray-500 mt-4">
                Please add at least one item to continue.
              </p>
            )} */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
