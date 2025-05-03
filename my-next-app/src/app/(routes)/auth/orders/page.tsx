"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { usePusher } from "@/app/context/PusherContext";
// --- Remove direct pusherClient import if only using context ---
// import { pusherClient } from "@/app/lib/pusherClient";
import type { Channel } from "pusher-js";
import {
  FiSearch,
  FiCalendar,
  FiTruck,
  FiHome,
  FiPackage,
  FiDollarSign,
  FiCreditCard,
  FiClock,
  FiInfo,
  FiCheckCircle,
  FiXCircle,
  FiEdit,
  FiTrash2,
  FiStar,
  FiMessageSquare,
  FiChevronDown,
  FiChevronUp,
  FiFilter,
  FiArrowUp,
  FiArrowDown,
  FiBox,
  FiShoppingBag,
} from "react-icons/fi";

interface Feedback {
  feedback_id: string;
  rating: number;
  comments: string;
  date_submitted: string;
}

interface Order {
  _id: string;
  customer_id: string;
  date: string;
  total_price: number;
  total_weight: number;
  notes: string;
  order_status: string;
  shop_name?: string;
  shop_type?: string;
  shop: string;
  date_completed: string;
  feedbacks?: Feedback[];
  payment_status: string;
  order_type: string;
  date_placed?: string;
  machine_id?: string | undefined;
  type?: string; // machine type?
  time_range?: { start: string; end: string }[];
  pickup_time?: string[];
  services?: string[];
  clothes?: { type: string; quantity: number }[] | undefined;
}

export default function Orders() {
  const { user, isLoading: authLoading } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [orderDetails, setOrderDetails] = useState<any[]>([]); // Store detailed order data
  const [filterType, setFilterType] = useState<string>("all"); // Track the selected type
  const [filterStatus, setFilterStatus] = useState<string>("all"); // Track the selected status

  const [loading, setLoading] = useState(true);

  // Add this near the top of your component after other state declarations
  const { pusher, isConnected } = usePusher();
  const channelRef = useRef<Channel | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc"); // Default to newest first (descending)
  const [searchQuery, setSearchQuery] = useState("");
  const currentUserId = user?.customer_id;

  const [feedbackOrderId, setFeedbackOrderId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState({
    rating: 5,
    comments: "",
  });
  const [viewingFeedbackOrderId, setViewingFeedbackOrderId] = useState<
    string | null
  >(null);
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(
    null
  );

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
    const fetchOrders = async () => {
      // First check if auth is still loading
      if (authLoading) {
        console.log(
          "[Client Orders] Auth still loading, deferring data fetch."
        );
        return; // Exit early if auth is loading
      }

      // Then check if user exists and has customer_id
      if (!user || !user.customer_id) {
        console.log(
          "[Client Orders] No authenticated user with customer_id found"
        );
        setLoading(false);
        setOrders([]); // Set empty orders array
        return;
      }

      try {
        const response = await fetch("/api/orders");
        const data = await response.json();

        const ordersWithShopDetails = await Promise.all(
          data
            .filter((order: Order) => order.customer_id === user.customer_id)
            .map(async (order: Order) => {
              try {
                const shopResponse = await fetch(`/api/shops/${order.shop}`);
                const shopData = await shopResponse.json();
                return {
                  ...order,
                  shop_name: shopData.shop.name,
                  shop_type: shopData.shop.type,
                };
              } catch {
                return { ...order, shop_name: "Unknown", shop_type: "Unknown" };
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

    // Only call fetchOrders if:
    // 1. We have a user with customer_id, OR
    // 2. Auth loading is complete (even if no user found)
    if (user?.customer_id || !authLoading) {
      fetchOrders();
    }
  }, [user?.customer_id, authLoading]);

  // Add this effect after your existing useEffect hooks
  useEffect(() => {
    // Near the top of your component
    if (!user && !authLoading) {
      // Cleanup if needed
      if (channelRef.current) {
        try {
          channelRef.current.unbind_all();
          if (pusher) {
            pusher.unsubscribe(channelRef.current.name);
          }
          channelRef.current = null;
        } catch (error) {
          console.error(
            "[Client Orders] Error cleaning up on user logout:",
            error
          );
        }
      }
      return;
    }
    // Return early if auth is still loading, with appropriate logging
    if (authLoading) {
      console.log(
        "[Client Orders] Auth is still loading, deferring Pusher setup."
      );
      return;
    }

    if (!pusher || !isConnected) {
      console.log(
        "[Client Orders] Pusher not ready yet. Connected:",
        isConnected
      );
      return;
    }

    if (!currentUserId) {
      console.log(
        "[Client Orders] No customer_id found - user might be logged out"
      );
      return;
    }

    if (!pusher || !isConnected || !currentUserId) {
      console.log(
        `[Client Orders] Skipping Pusher subscription: Missing prerequisites.`
      );
      return;
    }

    const channelName = `private-client-${currentUserId}`;
    console.log(`[Client Orders] Setting up subscription to ${channelName}`);

    // Clean up old subscription if it exists and is different
    if (channelRef.current && channelRef.current.name !== channelName) {
      console.log(
        `[Client Orders] Unsubscribing from old channel: ${channelRef.current.name}`
      );
      channelRef.current.unbind("update-order-status");
      channelRef.current.unbind("update-order-price"); // Add this line
      channelRef.current.unbind("update-payment-status"); // Add this line
      pusher.unsubscribe(channelRef.current.name);
      channelRef.current = null;
    }

    // If we don't have a channel reference or it's not subscribed, create a new subscription
    if (!channelRef.current || !channelRef.current.subscribed) {
      console.log(`[Client Orders] Subscribing to ${channelName}`);
      const channel = pusher.subscribe(channelName);
      channelRef.current = channel;

      // Handle subscription events
      channel.bind("pusher:subscription_succeeded", () => {
        console.log(
          `[Client Orders] Successfully subscribed to ${channelName}`
        );
      });

      channel.bind("pusher:subscription_error", (status: any) => {
        console.error(
          `[Client Orders] Failed Pusher subscription to ${channelName}, status: ${status}`
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

      // Add this right after your update-order-price binding, around line 184
      // Bind to update-payment-status event
      console.log(
        `[Client Orders] Binding to update-payment-status event on ${channelName}`
      );
      channel.bind(
        "update-payment-status",
        (data: {
          order_id: string;
          payment_status: string;
          date_updated?: string;
        }) => {
          console.log(`[Client Orders] Received payment status update:`, data);

          // Update the order in state
          setOrders((prevOrders) => {
            const updatedOrders = prevOrders.map((order) => {
              if (order._id === data.order_id) {
                console.log(
                  `[Client Orders] Updating order ${order._id} payment status from "${order.payment_status}" to "${data.payment_status}"`
                );
                return { ...order, payment_status: data.payment_status };
              }
              return order;
            });

            // Log the result
            const updatedOrder = updatedOrders.find(
              (o) => o._id === data.order_id
            );
            if (updatedOrder) {
              console.log(`[Client Orders] Order payment update result:`, {
                payment_status: updatedOrder.payment_status,
              });
            }

            return updatedOrders;
          });
        }
      );

      // Add this right after your update-order-status binding, around line 166
      // Bind to update-order-price event
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
    }

    // Cleanup function
    return () => {
      console.log(`[Client Orders] Cleaning up handlers for ${channelName}`);
      if (channelRef.current) {
        channelRef.current.unbind("update-order-status");
        channelRef.current.unbind("update-order-price"); // Add this line
        channelRef.current.unbind("update-payment-status"); // Add this line
      }
    };
  }, [pusher, isConnected, currentUserId, authLoading]);

  const fetchFeedbacks = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/feedback`);
      if (!response.ok) throw new Error("Failed to fetch feedbacks");

      const feedbacks = await response.json();

      // Update the feedbacks for the specific order
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order._id === orderId ? { ...order, feedbacks } : order
        )
      );
    } catch (error) {
      console.error("Error fetching feedbacks:", error);
    }
  };

  const handleSubmitFeedback = async (orderId: string) => {
    const isEditing = !!editingFeedbackId;
    const endpoint = isEditing
      ? `/api/orders/${orderId}/update-feedback`
      : `/api/orders/${orderId}/add-feedback`;

    const method = isEditing ? "PUT" : "PATCH";

    try {
      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          feedback_id: editingFeedbackId ?? Date.now().toString(),
          customer_id: user?.customer_id,
          order_id: orderId,
          rating: feedback.rating,
          comments: feedback.comments,
          date_submitted: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error("Failed to submit feedback");

      const updatedFeedback = await response.json();

      // Refetch feedbacks for the order
      await fetchFeedbacks(orderId);

      // Reset editing state
      setFeedbackOrderId(null);
      setEditingFeedbackId(null);
      setFeedback({ rating: 5, comments: "" });
    } catch (error) {
      console.error("Error submitting feedback:", error);
    }
  };

  const handleDeleteFeedback = async (orderId: string, feedbackId: string) => {
    try {
      const response = await fetch(
        `/api/orders/${orderId}/feedback/${feedbackId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) throw new Error("Failed to delete feedback");

      // Optionally, refetch orders
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order._id === orderId
            ? {
                ...order,
                feedbacks: order.feedbacks?.filter(
                  (fb) => fb.feedback_id !== feedbackId
                ),
              }
            : order
        )
      );
    } catch (error) {
      console.error("Error deleting feedback:", error);
    }
  };

  const handleEditFeedback = (fb: Feedback, orderId: string) => {
    setFeedbackOrderId(orderId);
    setEditingFeedbackId(fb.feedback_id);
    setFeedback({
      rating: fb.rating,
      comments: fb.comments,
    });
  };

  const typeOptions = ["all", "self-service", "pickup-delivery"];

  const statusOptions: { [key: string]: string[] } = {
    "self-service": [
      "all",
      "pending",
      "scheduled",
      "in progress",
      "completed",
      "cancelled",
    ],
    "pickup-delivery": [
      "all",
      "pending",
      "to be picked up",
      "sorting",
      "washing",
      "drying",
      "folding",
      "to be delivered",
      "completed",
      "cancelled",
    ],
  };

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
        order.order_type?.toLowerCase() === filterType.toLowerCase();
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

  if (loading) {
    return <p className="text-center text-gray-500">Loading orders...</p>;
  }

  return (
    <div className="mt-8 bg-white shadow rounded-lg overflow-hidden">
      {/* Header with improved layout */}
      <div className="px-6 py-5 border-b border-gray-100">
        {/* Header row with Orders title and search */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center">
            <FiPackage className="text-[#F468BB] mr-2 w-6 h-6" />
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              My Orders
            </h3>
          </div>

          <div className="relative flex-grow max-w-md">
            <input
              type="text"
              placeholder="Search by shop name..."
              value={searchQuery}
              onChange={handleSearch}
              className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 pr-10 py-2 border border-gray-200 rounded-full text-sm shadow-sm"
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
          {/* Type Filter */}
          <div className="flex items-center bg-gray-50 rounded-full px-3 py-1 border border-gray-200">
            <FiFilter className="text-gray-500 mr-2" />
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setFilterStatus("all");
              }}
              className="bg-transparent border-none focus:ring-0 text-gray-700 text-sm py-1 pr-6"
            >
              {typeOptions.map((type) => (
                <option key={type} value={type}>
                  {type === "all"
                    ? "All Types"
                    : type === "pickup-delivery"
                      ? "Pickup & Delivery"
                      : "Self-Service"}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center bg-gray-50 rounded-full px-3 py-1 border border-gray-200">
            <FiClock className="text-gray-500 mr-2" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-gray-700 text-sm py-1 pr-6"
            >
              {(statusOptions[filterType] || ["all"]).map((status) => (
                <option key={status} value={status}>
                  {status === "all"
                    ? "All Statuses"
                    : status.charAt(0).toUpperCase() + status.slice(1)}
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
                style={{ height: "28px" }} // Match the height of select elements
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
                style={{ height: "28px" }} // Match the height of select elements
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

      {/* Orders Content */}
      <div className="px-4 py-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">Loading orders...</p>
          </div>
        ) : filteredOrders.length > 0 ? (
          <ul className="divide-y divide-gray-100">
            {filteredOrders.map((order) => (
              <li key={order._id} className="py-4">
                <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden">
                  {/* Order Header with Type Icon */}
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
                        <div className="flex items-center">
                          <span className="font-medium text-gray-900 mr-2">
                            {order.shop_name || "Unknown Shop"}
                          </span>

                          {/* Services on the same row as shop name */}
                          <div className="flex flex-wrap gap-1">
                            {(order.services || ["Wash", "Dry", "Fold"]).map(
                              (service, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700"
                                >
                                  {service}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium
                ${order.order_status === "pending" ? "bg-yellow-100 text-yellow-500" : ""}
                ${order.order_status === "completed" ? "bg-green-100 text-green-500" : ""}
                ${order.order_status === "cancelled" ? "bg-red-100 text-red-500" : ""}
                ${["to be picked up", "sorting", "washing", "drying", "folding", "to be delivered"].includes(order.order_status) ? "bg-blue-100 text-blue-500" : ""}
                ${order.order_status === "scheduled" ? "bg-indigo-100 text-indigo-500" : ""}
                ${order.order_status === "in progress" ? "bg-purple-100 text-purple-500" : ""}
              `}
                        >
                          {order.order_status.charAt(0).toUpperCase() +
                            order.order_status.slice(1)}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
                        <FiCalendar className="w-3 h-3" />
                        <span>
                          {order.date_placed
                            ? new Date(order.date_placed).toLocaleDateString()
                            : new Date(order.date).toLocaleDateString()}
                        </span>
                        {order.order_type === "self-service"
                          ? order.time_range && (
                              <>
                                <span>•</span>
                                <FiClock className="w-3 h-3" />
                                <span>
                                  {order.time_range[0]?.start} -{" "}
                                  {order.time_range[0]?.end}
                                </span>
                              </>
                            )
                          : order.pickup_time && (
                              <>
                                <span>•</span>
                                <FiClock className="w-3 h-3" />
                                <span>Pickup: {order.pickup_time}</span>
                              </>
                            )}
                        <span>•</span>
                        <span
                          className={`
                ${order.payment_status === "paid" ? "text-green-500" : ""}
                ${order.payment_status === "pending" ? "text-yellow-500" : ""}
                ${order.payment_status === "cancelled" ? "text-red-500" : ""}
              `}
                        >
                          <FiCreditCard className="inline w-3 h-3 mr-1" />
                          {order.payment_status.charAt(0).toUpperCase() +
                            order.payment_status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Order Body with Details */}
                  <div className="p-4">
                    {/* Main order details grid - FIXED LAYOUT */}
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-4">
                      {/* Order ID */}
                      <div>
                        <p className="text-xs text-gray-500">Order ID</p>
                        <p className="font-medium text-sm">
                          {order._id.substring(order._id.length - 8)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">Weight</p>
                        <p className="font-medium text-sm">
                          {order.total_weight
                            ? `${order.total_weight}kg`
                            : "Pending"}
                        </p>
                      </div>
                      {/* Price */}
                      <div>
                        <p className="text-xs text-gray-500">Price</p>
                        <p className="font-medium text-sm">
                          {order.total_price
                            ? `₱${order.total_price}`
                            : "Pending"}
                        </p>
                      </div>

                      {/* Services */}

                      {/* Machine (self-service) or Clothing items (pickup-delivery) */}
                      <div>
                        {order.order_type === "self-service" ? (
                          <>
                            <p className="text-xs text-gray-500">Machine</p>
                            <p className="font-medium text-sm">
                              {(order.machine_id?.charAt(0).toUpperCase() ??
                                "") + (order.machine_id?.slice(1) ?? "N/A")}
                              {order.type &&
                                ` (${order.type.charAt(0).toUpperCase() + order.type.slice(1)})`}
                            </p>
                          </>
                        ) : order.order_type === "pickup-delivery" &&
                          order.clothes &&
                          order.clothes.some((c: any) => c.quantity > 0) ? (
                          <>
                            <p className="text-xs text-gray-500 mb-1">Items</p>
                            <div className="flex flex-wrap gap-1">
                              {order.clothes
                                .filter(
                                  (clothing: any) => clothing.quantity > 0
                                )
                                .map((clothing: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="text-xs bg-[#F0F0F0] px-2 py-0.5 rounded flex items-center"
                                  >
                                    <span className="w-4 h-4 inline-flex items-center justify-center bg-[#3D4EB0] text-white rounded-full mr-1 text-xs">
                                      {clothing.quantity}
                                    </span>
                                    <span className="text-gray-600">
                                      {clothing.type}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-gray-400">
                            No details available
                          </div>
                        )}
                      </div>
                      <div>
                        {/* Notes - if present */}
                        {order.notes && (
                          <div className="mb-4">
                            <p className="text-xs text-gray-500 mb-1">Notes</p>
                            <p className="text-xs text-gray-600 italic bg-gray-50 p-2 rounded">
                              "{order.notes}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Feedback Buttons - Moved to the bottom */}
                    {order.order_status === "completed" &&
                      order.payment_status === "paid" && (
                        <div className="mt-2 border-t border-gray-100 pt-3">
                          <div className="flex justify-end">
                            <button
                              onClick={() =>
                                order.feedbacks?.length
                                  ? setViewingFeedbackOrderId(
                                      viewingFeedbackOrderId === order._id
                                        ? null
                                        : order._id
                                    )
                                  : setFeedbackOrderId(order._id)
                              }
                              className={`btn
                  ${
                    order.feedbacks?.length
                      ? "btn btn-neutral text-sm"
                      : "btn btn-primary text-sm"
                  }`}
                            >
                              {order.feedbacks?.length ? (
                                <>
                                  {viewingFeedbackOrderId === order._id
                                    ? "Hide Feedback"
                                    : "View Feedback"}
                                </>
                              ) : (
                                <>Add Feedback</>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                  </div>

                  {/* Feedback Section */}
                  {viewingFeedbackOrderId === order._id && order.feedbacks && (
                    <div className="px-4 pb-4">
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <h4 className="font-medium mb-3 text-gray-700 flex items-center">
                          <FiMessageSquare className="mr-2 text-blue-500" />
                          Your Feedback
                        </h4>
                        <ul className="space-y-3">
                          {order.feedbacks.map((fb) => (
                            <li
                              key={fb.feedback_id}
                              className="bg-white p-3 rounded-lg shadow-sm border border-gray-100"
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="flex items-center mb-1">
                                    {[...Array(5)].map((_, i) => (
                                      <FiStar
                                        key={i}
                                        className={`w-4 h-4 ${
                                          i < fb.rating
                                            ? "text-yellow-400 fill-current"
                                            : "text-gray-300"
                                        }`}
                                      />
                                    ))}
                                    <span className="text-sm text-gray-600 ml-2">
                                      {fb.rating}/5
                                    </span>
                                  </div>
                                  <p className="text-gray-700">{fb.comments}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {new Date(
                                      fb.date_submitted
                                    ).toLocaleDateString()}
                                  </p>
                                </div>

                                <div className="flex gap-1">
                                  <button
                                    onClick={() =>
                                      handleEditFeedback(fb, order._id)
                                    }
                                    className="p-1 text-gray-500 hover:text-blue-500"
                                    title="Edit feedback"
                                  >
                                    <FiEdit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleDeleteFeedback(
                                        order._id,
                                        fb.feedback_id
                                      )
                                    }
                                    className="p-1 text-gray-500 hover:text-red-500"
                                    title="Delete feedback"
                                  >
                                    <FiTrash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Feedback Form */}
                  {feedbackOrderId === order._id && (
                    <div className="px-4 pb-4">
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <h4 className="text-md font-medium text-blue-800 mb-3 flex items-center">
                          <FiStar className="mr-2" />
                          {editingFeedbackId ? "Edit Feedback" : "Add Feedback"}
                        </h4>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Rating
                            </label>
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() =>
                                    setFeedback({ ...feedback, rating: i + 1 })
                                  }
                                  className={`p-1 focus:outline-none ${
                                    i < feedback.rating
                                      ? "text-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                >
                                  <FiStar
                                    className={`w-6 h-6 ${
                                      i < feedback.rating ? "fill-current" : ""
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Comments
                            </label>
                            <textarea
                              value={feedback.comments}
                              onChange={(e) =>
                                setFeedback({
                                  ...feedback,
                                  comments: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                              rows={3}
                              placeholder="Share your experience..."
                            />
                          </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => handleSubmitFeedback(order._id)}
                            className="btn btn-primary"
                          >
                            <FiCheckCircle className="mr-1" />
                            Submit
                          </button>
                          <button
                            onClick={() => {
                              setFeedbackOrderId(null);
                              setEditingFeedbackId(null);
                              setFeedback({ rating: 5, comments: "" });
                            }}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center"
                          >
                            <FiXCircle className="mr-1" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-500 text-center p-12">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FiPackage className="w-8 h-8 text-gray-400" />
            </div>

            {searchQuery ? (
              <p>
                No orders found matching{" "}
                <span className="font-semibold">"{searchQuery}"</span>
              </p>
            ) : filterType !== "all" || filterStatus !== "all" ? (
              <p>
                No {filterType !== "all" ? filterType : ""} orders found
                {filterStatus !== "all" ? ` with "${filterStatus}" status` : ""}
              </p>
            ) : (
              <p>You don't have any orders yet</p>
            )}

            {(searchQuery ||
              filterType !== "all" ||
              filterStatus !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterType("all");
                  setFilterStatus("all");
                }}
                className="mt-3 text-blue-500 hover:text-blue-700"
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
