"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { usePusher } from "@/app/context/PusherContext";
// --- Remove direct pusherClient import if only using context ---
// import { pusherClient } from "@/app/lib/pusherClient";
import type { Channel } from "pusher-js";

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
    <div className="mt-8 bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Orders
          </h3>

          <div className="mt-2 sm:mt-0 flex items-center ml-4">
            <span className="text-sm text-gray-600 mr-2">Sort by date:</span>
            <div className="flex space-x-2">
              <button
                onClick={() => setSortDirection("asc")}
                className={`px-3 py-1 rounded text-xs font-medium ${
                  sortDirection === "asc"
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                <div className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                    />
                  </svg>
                  Oldest First
                </div>
              </button>
              <button
                onClick={() => setSortDirection("desc")}
                className={`px-3 py-1 rounded text-xs font-medium ${
                  sortDirection === "desc"
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                <div className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"
                    />
                  </svg>
                  Newest First
                </div>
              </button>
            </div>
          </div>
          <div className="mt-2 sm:mt-0 relative rounded-md shadow-sm">
            <input
              type="text"
              placeholder="Search by customer name..."
              value={searchQuery}
              onChange={handleSearch}
              className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            {/* Clear button - only visible when there's text */}
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                aria-label="Clear search"
              >
                <svg
                  className="h-4 w-4 text-gray-400 hover:text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
        {searchQuery && (
          <div className="mt-2 text-sm text-gray-500 flex items-center">
            <svg
              className="mr-1 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Found {filteredOrders.length}{" "}
            {filteredOrders.length === 1 ? "result" : "results"} for "
            {searchQuery}"
          </div>
        )}
      </div>

      <div className="px-4 py-2 flex gap-4">
        {/* Filter by Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setFilterStatus("all"); // Reset status when type changes
            }}
            className="border border-gray-300 rounded px-3 py-2"
          >
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2"
          >
            {(statusOptions[filterType] || ["all"]).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-t border-gray-200">
        {orders.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {filteredOrders.map((order) => (
              <li key={order._id} className="px-4 py-5 sm:p-6">
                {/* Order Details */}
                <p>
                  <strong>Order ID:</strong> {order._id}
                </p>
                <p>
                  <strong>Date Placed:</strong>{" "}
                  {order.date_placed
                    ? new Date(order.date_placed).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Unknown"}
                </p>
                <p>
                  <strong>Shop Name:</strong> {order.shop_name}
                </p>
                <p>
                  <strong>Shop Type:</strong> {order.shop_type}
                </p>
                <p>
                  <strong>Schedule: </strong>
                  {new Date(order.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  {order.time_range &&
                    `(${order.time_range[0]?.start} - ${order.time_range[0]?.end})`}
                </p>
                <p>
                  <strong>Machine: </strong>
                  {(order.machine_id?.charAt(0).toUpperCase() ?? "") +
                    order.machine_id?.slice(1)}
                </p>
                <p>
                  <strong>Machine Type: </strong>
                  {order.type
                    ? order.type.charAt(0).toUpperCase() + order.type.slice(1)
                    : "Unknown"}
                </p>
                <p>
                  <strong>Total Price:</strong> {order.total_price || "Pending"}
                </p>
                <p>
                  <strong>Total Weight:</strong>{" "}
                  {order.total_weight || "Pending"}
                </p>
                <p>
                  <strong>Order Status:</strong> {order.order_status}
                </p>
                <p>
                  <strong>Payment Status:</strong> {order.payment_status}
                </p>
                {order.order_status === "completed" &&
                  order.payment_status === "paid" && (
                    <>
                      <button
                        onClick={() => setFeedbackOrderId(order._id)}
                        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Add Feedback
                      </button>
                      {order.feedbacks && order.feedbacks.length > 0 && (
                        <button
                          onClick={() =>
                            setViewingFeedbackOrderId(
                              viewingFeedbackOrderId === order._id
                                ? null
                                : order._id
                            )
                          }
                          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          {viewingFeedbackOrderId === order._id
                            ? "Hide Feedbacks"
                            : "View Feedbacks"}
                        </button>
                      )}

                      {viewingFeedbackOrderId === order._id &&
                        order.feedbacks && (
                          <div className="mt-4 bg-gray-50 p-4 rounded">
                            <h4 className="font-semibold mb-2 text-gray-700">
                              Your Feedbacks
                            </h4>
                            <ul className="space-y-2">
                              {order.feedbacks.map((fb) => (
                                <li
                                  key={fb.feedback_id}
                                  className="bg-white p-3 border border-gray-200 rounded"
                                >
                                  <p>
                                    <strong>Rating:</strong> {fb.rating}
                                  </p>
                                  <p>
                                    <strong>Comment:</strong> {fb.comments}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    Submitted:{" "}
                                    {new Date(
                                      fb.date_submitted
                                    ).toLocaleString()}
                                  </p>
                                  <div className="flex gap-2 mt-2">
                                    <button
                                      onClick={() =>
                                        handleEditFeedback(fb, order._id)
                                      }
                                      className="px-3 py-1 bg-yellow-400 text-white rounded hover:bg-yellow-500"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDeleteFeedback(
                                          order._id,
                                          fb.feedback_id
                                        )
                                      }
                                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                    </>
                  )}
                {feedbackOrderId === order._id && (
                  <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                    <h4 className="text-md font-semibold text-gray-800">
                      {editingFeedbackId ? "Edit Feedback" : "Add Feedback"}
                    </h4>
                    <div className="mt-2 space-y-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Rating (1-5)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={feedback.rating}
                          onChange={(e) =>
                            setFeedback({
                              ...feedback,
                              rating: parseInt(e.target.value),
                            })
                          }
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
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
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex space-x-4">
                      <button
                        onClick={() => handleSubmitFeedback(order._id)}
                        className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
                      >
                        Submit
                      </button>
                      <button
                        onClick={() => {
                          setFeedbackOrderId(null);
                          setEditingFeedbackId(null);
                          setFeedback({ rating: 5, comments: "" });
                        }}
                        className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-500 text-center p-6">
            {filteredOrders.length === 0 && (
              <div className="text-gray-500 text-center p-6">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 20a8 8 0 100-16 8 8 0 000 16z"
                  />
                </svg>

                {searchQuery ? (
                  <p className="mt-2">
                    No orders found matching{" "}
                    <span className="font-bold">"{searchQuery}"</span>
                  </p>
                ) : (
                  <p className="mt-2">
                    No orders found with{" "}
                    <span className="font-bold">
                      {filterStatus === "all" ? "any" : filterStatus}
                    </span>{" "}
                    status
                  </p>
                )}

                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-2 text-blue-500 hover:text-blue-700 font-medium"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
