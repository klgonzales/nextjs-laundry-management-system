"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { usePusher } from "@/app/context/PusherContext";
import type { Channel } from "pusher-js";
import {
  FiSearch,
  FiCalendar,
  FiDollarSign,
  FiCreditCard,
  FiTruck,
  FiHome,
  FiPackage,
  FiClock,
  FiInfo,
  FiCheckCircle,
  FiXCircle,
  FiFilter,
  FiArrowUp,
  FiArrowDown,
  FiUpload,
} from "react-icons/fi";

interface Order {
  _id: string;
  customer_id: string;
  date: string;
  total_price: number;
  order_status: string;
  shop_name?: string;
  shop_type?: string;
  shop: string;
  payment_status: string;
  payment_method: string;
  date_placed: string;
  total_weight?: number;
  notes: string;
  order_type: string;
}

export default function Payments() {
  const { user, isLoading: authLoading } = useAuth();
  const { pusher, isConnected } = usePusher();
  const channelRef = useRef<Channel | null>(null);
  const currentUserId = user?.customer_id;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState<any[]>([]); // Store detailed order data
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null); // Track the selected order for payment
  // Add this new state at the top with your other state variables
  const [shopPaymentMethods, setShopPaymentMethods] = useState<any[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<any>(null);

  const [paymentDetails, setPaymentDetails] = useState<any>({
    amount_sent: "",
    screenshot: "",
    reference_number: "",
    payment_method: "",
    payment_date: "",
    status: "paid",
    customer_id: "",
    order_id: "",
    shop_id: "",
    payment_id: "",
    amount_paid: "",
    paid_the_driver: false,
    total_weight: "",
  });
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc"); // Default to newest first (descending)
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update the sortOrdersByDate function to use the correct date field
  const sortOrdersByDate = useCallback(
    (orders: any[], direction: "asc" | "desc") => {
      return [...orders].sort((a, b) => {
        // Try to use date_placed first, then fall back to date
        const dateA = new Date(a.date_placed || a.date || 0).getTime();
        const dateB = new Date(b.date_placed || b.date || 0).getTime();
        return direction === "asc" ? dateA - dateB : dateB - dateA;
      });
    },
    []
  );

  useEffect(() => {
    // Check if auth is still loading
    if (authLoading) {
      console.log(
        "[Client Payments] Auth still loading, deferring data fetch."
      );
      return;
    }

    if (!user?.customer_id) {
      console.log(
        "[Client Payments] No customer_id found for the current user"
      );
      setLoading(false);
      setOrders([]);
      return;
    }
    const fetchOrders = async () => {
      if (!user?.customer_id) {
        console.error("No customer_id found for the current user");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/orders");
        if (!response.ok) {
          throw new Error("Failed to fetch orders");
        }
        const data = await response.json();

        const ordersWithShopDetails = await Promise.all(
          data
            .filter((order: Order) => order.customer_id === user.customer_id)
            .map(async (order: Order) => {
              try {
                const shopResponse = await fetch(`/api/shops/${order.shop}`);
                if (!shopResponse.ok) {
                  throw new Error(
                    `Failed to fetch shop details for shop_id: ${order.shop}`
                  );
                }
                const shopData = await shopResponse.json();
                return {
                  ...order,
                  shop_name: shopData.shop.name,
                  shop_type: shopData.shop.type,
                };
              } catch (error) {
                console.error(
                  `Error fetching shop details for shop_id: ${order.shop}`,
                  error
                );
                return { ...order, shop_name: "Unknown", shop_type: "Unknown" };
              } finally {
                setLoading(false);
              }
            })
        );

        setOrders(ordersWithShopDetails);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };

    // Key fix: Only call fetchOrders when auth is complete
    if (!authLoading) {
      fetchOrders();
    }
  }, [user?.customer_id, authLoading]);

  const handleSettlePayment = async (order: Order) => {
    setSelectedOrderId(order._id);
    setPaymentDetails({
      ...paymentDetails,
      payment_method: order.payment_method,
      customer_id: order.customer_id,
      order_id: order._id,
      shop_id: order.shop,
      payment_id: Date.now().toString(), // Generate a unique payment ID
    });
    // Fetch shop payment methods
    try {
      const response = await fetch(`/api/shops/${order.shop}`);
      if (response.ok) {
        const data = await response.json();
        if (data.shop && data.shop.payment_methods) {
          setShopPaymentMethods(data.shop.payment_methods);

          // Pre-select the payment method if it exists in the shop's payment methods
          const matchedMethod = data.shop.payment_methods.find(
            (method: any) =>
              method.name.toLowerCase() === order.payment_method.toLowerCase()
          );
          setSelectedPaymentMethod(matchedMethod || null);
        }
      }
    } catch (error) {
      console.error("Error fetching shop payment methods:", error);
    }
  };

  // Add this effect for Pusher subscription
  useEffect(() => {
    if (!pusher || !isConnected || !currentUserId) {
      console.log(
        `[Client Payments] Skipping Pusher subscription: Missing prerequisites.`
      );
      return;
    }

    const channelName = `private-client-${currentUserId}`;
    console.log(`[Client Payments] Setting up subscription to ${channelName}`);

    // Clean up old subscription if it exists and is different
    if (channelRef.current && channelRef.current.name !== channelName) {
      console.log(
        `[Client Payments] Unsubscribing from old channel: ${channelRef.current.name}`
      );
      channelRef.current.unbind("update-payment-status");
      channelRef.current.unbind("update-order-status");
      channelRef.current.unbind("update-order-price");
      pusher.unsubscribe(channelRef.current.name);
      channelRef.current = null;
    }

    // If we don't have a channel reference or it's not subscribed, create a new subscription
    if (!channelRef.current || !channelRef.current.subscribed) {
      console.log(`[Client Payments] Subscribing to ${channelName}`);
      const channel = pusher.subscribe(channelName);
      channelRef.current = channel;

      // Handle subscription events
      channel.bind("pusher:subscription_succeeded", () => {
        console.log(
          `[Client Payments] Successfully subscribed to ${channelName}`
        );
      });

      channel.bind("pusher:subscription_error", (status: any) => {
        console.error(
          `[Client Payments] Failed Pusher subscription to ${channelName}, status:`,
          status
        );
      });

      // Bind to update-order-status event
      console.log(
        `[Client Orders] Binding to update-order-status event on ${channelName}`
      );
      // In your client code, modify the update-order-status handler:
      channel.bind(
        "update-order-status",
        (data: { orderId: string; status: string; date_updated: string }) => {
          console.log(`[Client Orders] Received order status update:`, data);

          // Add logging to debug the status format
          console.log(`[Client Orders] Current orders:`, orders);

          // Update the order in state
          setOrders((prevOrders) => {
            const updatedOrders = prevOrders.map((order) => {
              if (order._id === data.orderId) {
                console.log(
                  `[Client Orders] Updating order ${order._id} from "${order.order_status}" to "${data.status}"`
                );
                return { ...order, order_status: data.status };
              }
              return order;
            });

            // Log the result to confirm update worked
            console.log(
              `[Client Orders] Order update result:`,
              updatedOrders.find((o) => o._id === data.orderId)?.order_status
            );

            return updatedOrders;
          });
        }
      );

      // Add this after your update-payment-status binding in the Pusher setup effect

      console.log(
        `[Client Orders] Binding to update-order-price event on ${channelName}`
      );
      channel.bind(
        "update-order-price",
        (data: {
          order_id: string;
          total_weight?: number;
          total_price?: number;
          notes?: string;
          date_updated?: string;
        }) => {
          console.log(`[Client Orders] Received order price update:`, data);

          // Update the order in state
          setOrders((prevOrders) => {
            const updatedOrders = prevOrders.map((order) => {
              if (order._id === data.order_id) {
                console.log(
                  `[Client Orders] Updating order ${order._id} price details from:`,
                  {
                    total_weight: order.total_weight,
                    total_price: order.total_price,
                    notes: order.notes,
                  },
                  "to:",
                  {
                    total_weight:
                      data.total_weight !== undefined
                        ? data.total_weight
                        : order.total_weight,
                    total_price:
                      data.total_price !== undefined
                        ? data.total_price
                        : order.total_price,
                    notes: data.notes !== undefined ? data.notes : order.notes,
                  }
                );

                return {
                  ...order,
                  total_weight:
                    data.total_weight !== undefined
                      ? data.total_weight
                      : order.total_weight,
                  total_price:
                    data.total_price !== undefined
                      ? data.total_price
                      : order.total_price,
                  notes: data.notes !== undefined ? data.notes : order.notes,
                };
              }
              return order;
            });

            // Log the result
            const updatedOrder = updatedOrders.find(
              (o) => o._id === data.order_id
            );
            if (updatedOrder) {
              console.log(`[Client Orders] Order price update result:`, {
                total_weight: updatedOrder.total_weight,
                total_price: updatedOrder.total_price,
                notes: updatedOrder.notes,
              });
            }

            return updatedOrders;
          });
        }
      );

      // Bind to update-payment-status event
      console.log(
        `[Client Payments] Binding to update-payment-status event on ${channelName}`
      );
      channel.bind(
        "update-payment-status",
        (data: {
          order_id: string;
          payment_status: string;
          date_updated?: string;
        }) => {
          console.log(
            `[Client Payments] Received payment status update:`,
            data
          );

          // Update the orders in state
          setOrders((prevOrders) => {
            const updatedOrders = prevOrders.map((order) => {
              if (order._id === data.order_id) {
                console.log(
                  `[Client Payments] Updating order ${order._id} payment status from "${order.payment_status}" to "${data.payment_status}"`
                );
                return { ...order, payment_status: data.payment_status };
              }
              return order;
            });

            return updatedOrders;
          });
        }
      );
    }

    // Cleanup function
    return () => {
      console.log(`[Client Payments] Cleaning up handlers for ${channelName}`);
      if (channelRef.current) {
        channelRef.current.unbind("update-payment-status");
        channelRef.current.unbind("update-order-status");
        channelRef.current.unbind("update-order-price");
      }
    };
  }, [pusher, isConnected, currentUserId]);

  const handleSubmitPayment = async () => {
    try {
      const response = await fetch(
        `/api/orders/${selectedOrderId}/add-payment`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(paymentDetails),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to settle payment");
      }

      const updatedOrder = await response.json();

      // Update the local state
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order._id === selectedOrderId
            ? { ...order, payment_status: "for review" }
            : order
        )
      );

      setSelectedOrderId(null); // Close the form
      try {
        const updateResponse = await fetch(
          `/api/orders/${selectedOrderId}/update-payment-status`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ newPaymentStatus: "for review" }),
          }
        );

        if (!updateResponse.ok) {
          throw new Error("Failed to update payment status");
        }

        console.log("Payment settled successfully!");
      } catch (error) {
        console.error("Error updating payment status:", error);
        console.log(
          "Payment was settled, but failed to update payment status."
        );
      }
    } catch (error) {
      console.error("Error settling payment:", error);
      console.log("Failed to settle payment. Please try again.");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await convertToBase64(file);
      setPaymentDetails({
        ...paymentDetails,
        screenshot: base64, // Save the Base64 string
      });
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const [filterType, setFilterType] = useState<string>("all"); // Track the selected type
  const [filterStatus, setFilterStatus] = useState<string>("all"); // Track the selected status
  const typeOptions = [
    "all",
    "pending",
    "for review",
    "paid",
    "cancelled",
    "failed",
  ];

  // Add this function to handle search, right before your return statement
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  // Update your filter effect to include sorting
  useEffect(() => {
    // First, filter by search query if there is one
    let searchFiltered = orderDetails;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      searchFiltered = orderDetails.filter(
        (order) =>
          order.shop_name && order.shop_name.toLowerCase().includes(query)
      );
    }
    // Ensure no JSX is returned
  }, [orderDetails, searchQuery]);

  // Replace your existing filteredOrders definition with this useEffect
  useEffect(() => {
    // First apply type and status filters
    let filtered = orders.filter((order) => {
      const typeMatch =
        filterType === "all" ||
        order.payment_status?.toLowerCase() === filterType.toLowerCase();
      const statusMatch =
        filterStatus === "all" ||
        order.order_status.toLowerCase() === filterStatus.toLowerCase();

      return typeMatch && statusMatch;
    });

    // Then apply search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((order) =>
        order.shop_name?.toLowerCase().includes(query)
      );
    }

    // Finally sort the results
    const sorted = sortOrdersByDate(filtered, sortDirection);

    // Update state with filtered and sorted orders
    setFilteredOrders(sorted);
  }, [
    orders,
    filterType,
    filterStatus,
    searchQuery,
    sortDirection,
    sortOrdersByDate,
  ]);

  // Also add this new state at the top with your other state variables
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);

  return (
    <div className="mt-8 bg-white shadow rounded-lg overflow-hidden">
      {/* Header with title, search, and filters */}
      <div className="px-6 py-5 border-b border-gray-100">
        {/* Header row with Payments title and search */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center">
            <FiCreditCard className="text-[#F468BB] mr-2 w-6 h-6" />
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              My Payments
            </h3>
          </div>

          <div className="relative flex-grow max-w-md">
            <input
              type="text"
              placeholder="Search by shop name..."
              value={searchQuery}
              onChange={handleSearch}
              className="focus:ring-[#F468BB] focus:border-[#F468BB] block w-full pl-10 pr-10 py-2 border border-gray-200 rounded-full text-sm shadow-sm"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-gray-400" />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                aria-label="Clear search"
              >
                <FiXCircle className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>

        {/* Filter controls in a single row */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Payment Status Filter */}
          <div className="flex items-center bg-gray-50 rounded-full px-3 py-1 border border-gray-200">
            <FiFilter className="text-gray-500 mr-2" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-gray-700 text-sm py-1 pr-6"
            >
              {typeOptions.map((type) => (
                <option key={type} value={type}>
                  {type === "all"
                    ? "All Payment Statuses"
                    : type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center bg-gray-50 rounded-full px-3 py-1 border border-gray-200">
            <FiCalendar className="text-gray-500 mr-2" />
            <div className="flex">
              <button
                onClick={() => setSortDirection("asc")}
                className={`px-2 py-1 rounded-l-full text-xs font-medium ${
                  sortDirection === "asc"
                    ? "bg-[#F468BB] text-white"
                    : "bg-transparent text-gray-700 hover:bg-gray-200"
                }`}
                style={{ height: "28px" }}
              >
                <div className="flex items-center">
                  <FiArrowUp
                    className={`h-4 w-4 mr-1 ${sortDirection === "asc" ? "text-white" : "text-gray-500"}`}
                  />
                  Oldest
                </div>
              </button>
              <button
                onClick={() => setSortDirection("desc")}
                className={`px-2 py-1 rounded-r-full text-xs font-medium border-l ${
                  sortDirection === "desc"
                    ? "bg-[#F468BB] text-white"
                    : "bg-transparent text-gray-700 hover:bg-gray-200"
                }`}
                style={{ height: "28px" }}
              >
                <div className="flex items-center">
                  <FiArrowDown
                    className={`h-4 w-4 mr-1 ${sortDirection === "desc" ? "text-white" : "text-gray-500"}`}
                  />
                  Newest
                </div>
              </button>
            </div>
          </div>

          {/* Search results count badge */}
          {searchQuery && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1.5 rounded-full">
              {filteredOrders.length}{" "}
              {filteredOrders.length === 1 ? "result" : "results"}
            </span>
          )}
        </div>
      </div>

      {/* Payments Content */}
      <div className="px-4 py-2">
        {loading ? (
          <div className="py-6">
            {/* Skeleton Loading for Orders */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="mb-4 animate-pulse">
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {/* Order Header Skeleton */}
                  <div className="flex items-center gap-3 p-4 bg-gray-50 border-b border-gray-100">
                    <div className="rounded-full p-2 bg-gray-200 h-9 w-9"></div>
                    <div className="flex-grow">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center">
                          <div className="h-5 w-32 bg-gray-200 rounded mr-2"></div>
                          {/* Service badges skeleton */}
                          <div className="flex flex-wrap gap-1">
                            {[1, 2, 3].map((s) => (
                              <div
                                key={s}
                                className="h-4 w-12 bg-gray-200 rounded-full"
                              ></div>
                            ))}
                          </div>
                        </div>
                        <div className="h-5 w-20 bg-gray-200 rounded-full mt-2 sm:mt-0"></div>
                      </div>

                      <div className="flex items-center space-x-2 text-sm mt-1">
                        <div className="h-3 w-3 bg-gray-200 rounded-full"></div>
                        <div className="h-3 w-20 bg-gray-200 rounded"></div>
                        <div className="h-3 w-3 bg-gray-200 rounded-full"></div>
                        <div className="h-3 w-3 bg-gray-200 rounded-full"></div>
                        <div className="h-3 w-24 bg-gray-200 rounded"></div>
                        <div className="h-3 w-3 bg-gray-200 rounded-full"></div>
                        <div className="h-3 w-3 bg-gray-200 rounded-full"></div>
                        <div className="h-3 w-24 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </div>

                  {/* Order Body Skeleton */}
                  <div className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-4">
                      {/* Order ID */}
                      <div>
                        <div className="h-3 w-16 bg-gray-200 rounded mb-1"></div>
                        <div className="h-4 w-20 bg-gray-200 rounded"></div>
                      </div>

                      {/* Weight */}
                      <div>
                        <div className="h-3 w-14 bg-gray-200 rounded mb-1"></div>
                        <div className="h-4 w-12 bg-gray-200 rounded"></div>
                      </div>

                      {/* Price */}
                      <div>
                        <div className="h-3 w-10 bg-gray-200 rounded mb-1"></div>
                        <div className="h-4 w-16 bg-gray-200 rounded"></div>
                      </div>

                      {/* Items */}
                      <div>
                        <div className="h-3 w-8 bg-gray-200 rounded mb-1"></div>
                        <div className="flex flex-wrap gap-1">
                          {[1, 2].map((item) => (
                            <div
                              key={item}
                              className="h-6 w-16 bg-gray-200 rounded"
                            ></div>
                          ))}
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <div className="h-3 w-10 bg-gray-200 rounded mb-1"></div>
                        <div className="h-4 w-full bg-gray-200 rounded"></div>
                      </div>
                    </div>

                    {/* Feedback Button Skeleton */}
                    <div className="mt-2 border-t border-gray-100 pt-3">
                      <div className="flex justify-end">
                        <div className="h-8 w-24 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredOrders.length > 0 ? (
          <ul className="divide-y divide-gray-100">
            {filteredOrders.map((order) => (
              <li key={order._id} className="py-4">
                <div
                  className={`${
                    (order.payment_status.toLowerCase() === "pending" ||
                      order.payment_status.toLowerCase() === "failed") &&
                    order.order_status === "completed"
                      ? "bg-red-50"
                      : "bg-white"
                  } rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden`}
                >
                  {/* Payment Header with Shop Icon */}
                  <div className="flex items-center gap-3 p-4 bg-gray-50 border-b border-gray-100">
                    <div
                      className={`rounded-full p-2 flex-shrink-0 ${
                        order.order_type === "pickup-delivery"
                          ? "bg-blue-100 text-blue-600"
                          : "bg-purple-100 text-purple-600"
                      }`}
                    >
                      {order.order_type === "pickup-delivery" ? (
                        <FiTruck className="w-5 h-5" />
                      ) : (
                        <FiHome className="w-5 h-5" />
                      )}
                    </div>

                    <div className="flex-grow">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <span className="font-medium text-gray-900">
                            {order.shop_name || "Unknown Shop"}
                          </span>
                        </div>

                        <span
                          className={`text-xs px-3 py-1 rounded-full font-medium mt-2 sm:mt-0
                            ${order.payment_status === "pending" ? "bg-yellow-100 text-yellow-800" : ""}
                            ${order.payment_status === "paid" ? "bg-green-100 text-green-800" : ""}
                            ${order.payment_status === "for review" ? "bg-blue-100 text-blue-800" : ""}
                            ${order.payment_status === "cancelled" ? "bg-red-100 text-red-800" : ""}
                            ${order.payment_status === "failed" ? "bg-red-100 text-red-800" : ""}
                          `}
                        >
                          <FiCreditCard className="inline mr-1 w-3 h-3" />
                          {order.payment_status.charAt(0).toUpperCase() +
                            order.payment_status.slice(1)}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                        <FiCalendar className="w-3 h-3" />
                        <span>
                          {new Date(
                            order.date_placed || order.date
                          ).toLocaleDateString()}
                        </span>
                        <span>•</span>
                        <span
                          className={`
                            ${order.order_status === "completed" ? "text-green-600" : ""}
                            ${order.order_status === "pending" ? "text-yellow-600" : ""}
                            ${order.order_status === "cancelled" ? "text-red-600" : ""}
                          `}
                        >
                          <FiClock className="inline w-3 h-3 mr-1" />
                          {order.order_status.charAt(0).toUpperCase() +
                            order.order_status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      {/* Order ID */}
                      <div>
                        <p className="text-xs text-gray-500">Order ID</p>
                        <p className="font-medium text-sm">
                          {order._id.substring(order._id.length - 8)}
                        </p>
                      </div>

                      {/* Price */}
                      <div>
                        <p className="text-xs text-gray-500">Total Amount</p>
                        <p className="font-medium text-sm">
                          {order.total_price
                            ? `₱${order.total_price}`
                            : "Pending"}
                        </p>
                      </div>

                      {/* Payment Method */}
                      <div>
                        <p className="text-xs text-gray-500">Payment Method</p>
                        <p className="font-medium text-sm capitalize">
                          {order.payment_method || "Not specified"}
                        </p>
                      </div>

                      {/* Weight */}
                      <div>
                        <p className="text-xs text-gray-500">Weight</p>
                        <p className="font-medium text-sm">
                          {order.total_weight
                            ? `${order.total_weight}kg`
                            : "Pending"}
                        </p>
                      </div>
                    </div>

                    {/* Settle Payment Button - Only shown for certain statuses */}
                    {(order.payment_status.toLowerCase() === "pending" ||
                      order.payment_status.toLowerCase() === "failed") &&
                      order.order_status === "completed" && (
                        <div className="flex justify-end mt-2 border-t border-gray-200 pt-3">
                          <button
                            onClick={() => handleSettlePayment(order)}
                            className="px-4 py-2 bg-[#F468BB] text-white rounded-lg hover:bg-opacity-90 flex items-center"
                          >
                            Settle Payment
                          </button>
                        </div>
                      )}

                    {/* Inline Payment Form */}
                    {selectedOrderId === order._id && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <h4 className="text-lg font-medium text-gray-800 flex items-center">
                          <FiCreditCard className="mr-2 text-[#F468BB]" />
                          Settle Payment
                        </h4>

                        {/* Payment Method Information */}
                        {(order.payment_method === "gcash" ||
                          order.payment_method === "bank transfer" ||
                          order.payment_method === "credit card" ||
                          order.payment_method === "maya") && (
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <h5 className="text-sm font-medium text-blue-800 mb-2">
                              Payment Instructions
                            </h5>

                            {shopPaymentMethods.length > 0 ? (
                              <>
                                <div className="mb-3">
                                  <label className="block text-sm text-blue-700 mb-1">
                                    Select Payment Method:
                                  </label>
                                  <div className="flex flex-wrap gap-2">
                                    {shopPaymentMethods.map((method, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() =>
                                          setSelectedPaymentMethod(method)
                                        }
                                        className={`px-3 py-1.5 text-xs font-medium rounded-full border 
                      ${
                        selectedPaymentMethod &&
                        selectedPaymentMethod.method_id === method.method_id
                          ? "bg-blue-500 text-white border-blue-500"
                          : "bg-white text-blue-700 border-blue-200 hover:bg-blue-50"
                      }`}
                                      >
                                        {method.name}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {selectedPaymentMethod && (
                                  <div className="border-t border-blue-200 pt-2 mt-2">
                                    <p className="text-sm text-blue-800 mb-1 font-medium">
                                      {selectedPaymentMethod.name} Payment
                                      Details:
                                    </p>
                                    <div className="flex items-center justify-between bg-white p-2 rounded border border-blue-100">
                                      <div>
                                        <p className="text-xs text-gray-500">
                                          Account Number
                                        </p>
                                        <p className="text-sm font-medium text-blue-700">
                                          {selectedPaymentMethod.account_number}
                                        </p>
                                      </div>
                                      <button
                                        onClick={() =>
                                          navigator.clipboard.writeText(
                                            selectedPaymentMethod.account_number
                                          )
                                        }
                                        className="p-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                        title="Copy to clipboard"
                                      >
                                        Copy
                                      </button>
                                    </div>
                                    <p className="text-xs text-blue-600 mt-2">
                                      Please use this account number to send
                                      your payment, and then fill in the form
                                      below.
                                    </p>
                                  </div>
                                )}
                              </>
                            ) : (
                              <p className="text-sm text-blue-700">
                                Contact the shop directly for payment
                                instructions.
                              </p>
                            )}
                          </div>
                        )}

                        <div className="mt-4 space-y-4">
                          {(order.payment_method === "gcash" ||
                            order.payment_method === "bank transfer" ||
                            order.payment_method === "credit card") && (
                            <>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Amount Sent
                                  </label>
                                  <input
                                    type="number"
                                    value={paymentDetails.amount_sent}
                                    onChange={(e) =>
                                      setPaymentDetails({
                                        ...paymentDetails,
                                        amount_sent: parseFloat(e.target.value),
                                      })
                                    }
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-[#F468BB] focus:border-[#F468BB] sm:text-sm"
                                    required
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Reference Number
                                  </label>
                                  <input
                                    type="text"
                                    value={paymentDetails.reference_number}
                                    onChange={(e) =>
                                      setPaymentDetails({
                                        ...paymentDetails,
                                        reference_number: e.target.value,
                                      })
                                    }
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-[#F468BB] focus:border-[#F468BB] sm:text-sm"
                                    required
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Screenshot
                                </label>
                                <div className="mt-1 flex items-center">
                                  <label className="w-full flex justify-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                                    <FiUpload className="mr-2" />
                                    {paymentDetails.screenshot
                                      ? "Change Image"
                                      : "Upload Image"}
                                    <input
                                      type="file"
                                      className="sr-only"
                                      accept="image/*"
                                      onChange={handleFileChange}
                                    />
                                  </label>
                                </div>
                                {paymentDetails.screenshot && (
                                  <div className="mt-2">
                                    <div className="relative h-32 w-32 overflow-hidden rounded-lg border border-gray-200">
                                      <img
                                        src={paymentDetails.screenshot}
                                        alt="Payment Screenshot"
                                        className="h-full w-full object-cover"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </>
                          )}

                          {(order.payment_method === "cash" ||
                            order.payment_method === "pay at the counter") && (
                            <>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Amount Paid
                                </label>
                                <input
                                  type="number"
                                  value={paymentDetails.amount_paid}
                                  onChange={(e) =>
                                    setPaymentDetails({
                                      ...paymentDetails,
                                      amount_paid: parseFloat(e.target.value),
                                    })
                                  }
                                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-[#F468BB] focus:border-[#F468BB] sm:text-sm"
                                  required
                                />
                              </div>

                              {order.shop_type !== "self-service" && (
                                <div className="flex items-center">
                                  <input
                                    id="paid_driver"
                                    type="checkbox"
                                    checked={paymentDetails.paid_the_driver}
                                    onChange={(e) =>
                                      setPaymentDetails({
                                        ...paymentDetails,
                                        paid_the_driver: e.target.checked,
                                      })
                                    }
                                    className="h-4 w-4 text-[#F468BB] focus:ring-[#F468BB] border-gray-300 rounded"
                                  />
                                  <label
                                    htmlFor="paid_driver"
                                    className="ml-2 block text-sm text-gray-700"
                                  >
                                    Paid the Driver
                                  </label>
                                </div>
                              )}
                            </>
                          )}

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Payment Date
                            </label>
                            <input
                              type="date"
                              value={paymentDetails.payment_date}
                              onChange={(e) =>
                                setPaymentDetails({
                                  ...paymentDetails,
                                  payment_date: e.target.value,
                                })
                              }
                              className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-[#F468BB] focus:border-[#F468BB] sm:text-sm"
                              required
                            />
                          </div>

                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={handleSubmitPayment}
                              disabled={isSubmitting}
                              className="flex-1 px-4 py-2 bg-[#F468BB] text-white rounded-lg hover:bg-opacity-90 flex items-center justify-center"
                            >
                              {isSubmitting ? (
                                <>
                                  <span className="inline-block w-4 h-4 border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mr-2"></span>
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <FiCheckCircle className="mr-2" />
                                  Submit Payment
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedOrderId(null)}
                              disabled={isSubmitting}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center"
                            >
                              <FiXCircle className="mr-2" />
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-500 text-center p-12">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FiDollarSign className="w-8 h-8 text-gray-400" />
            </div>

            {searchQuery ? (
              <p>
                No payments found matching{" "}
                <span className="font-semibold">"{searchQuery}"</span>
              </p>
            ) : filterType !== "all" ? (
              <p>No payments with status "{filterType}" found</p>
            ) : (
              <p>You don't have any payment records yet</p>
            )}

            {(searchQuery || filterType !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterType("all");
                }}
                className="mt-3 text-[#F468BB] hover:text-pink-700"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
