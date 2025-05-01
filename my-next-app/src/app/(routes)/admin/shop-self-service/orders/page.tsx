"use client";
import { useAuth } from "@/app/context/AuthContext";
// --- Import usePusher ---
import { usePusher } from "@/app/context/PusherContext";
// --- Remove direct pusherClient import if only using context ---
// import { pusherClient } from "@/app/lib/pusherClient";
import type { Channel } from "pusher-js";
// --- Add useRef ---
import { useState, useEffect, useRef, useCallback } from "react";
// Add this import at the top of your file
import { useRealTimeUpdates } from "@/app/context/RealTimeUpdatesContext";

// --- Define Order and DetailedOrder types (Recommended) ---
interface Order {
  _id: string;
  customer_id: string | number;
  shop: string; // Assuming shop is shop_id
  order_status: string;
  // ... other raw order fields
  services?: string[];
  payment_method?: string;
  machine_id?: string;
  type?: string; // machine type?
  date?: string | Date;
  time_range?: { start: string; end: string }[];
  date_completed?: string | Date | null;
  total_weight?: number;
  total_price?: number;
  notes?: string;
}

interface DetailedOrder extends Order {
  customer_name?: string;
  shop_name?: string;
  shop_type?: string;
  delivery_fee?: boolean;
}
// --- End Types ---

export default function Orders() {
  const { user } = useAuth();
  // --- Use Pusher context ---
  const { pusher, isConnected } = usePusher();
  const [orders, setOrders] = useState(user?.shops?.[0]?.orders || []); // Get orders from the first shop
  const [orderDetails, setOrderDetails] = useState<any[]>([]); // Store detailed order data
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]); // Store filtered orders
  const [filterStatus, setFilterStatus] = useState<string>("all"); // Track the selected filter
  // First add a new state for search query at the top with your other states
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc"); // Default to newest first (descending)
  const [searchQuery, setSearchQuery] = useState("");
  const [editOrderId, setEditOrderId] = useState<string | null>(null); // Track the order being edited
  const [editDetails, setEditDetails] = useState({
    total_weight: 0,
    total_price: 0,
    notes: "",
  });

  // --- Add loading/error states ---
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // --- Add Pusher channel ref ---
  const channelRef = useRef<Channel | null>(null);

  const adminId = user?.admin_id;
  const shopId = user?.shops?.[0]?.shop_id; // Get shopId for initial fetch
  // Get the real-time updates context
  const { registerPaymentHandler, unregisterPaymentHandler } =
    useRealTimeUpdates();

  // Add this sorting function to sort the orders
  const sortOrdersByDate = useCallback(
    (orders: any[], direction: "asc" | "desc") => {
      return [...orders].sort((a, b) => {
        const dateA = new Date(a.date_placed || 0).getTime();
        const dateB = new Date(b.date_placed || 0).getTime();
        return direction === "asc" ? dateA - dateB : dateB - dateA;
      });
    },
    []
  );

  // Define fetchOrderDetails as a useCallback to prevent recreating on every render
  const fetchOrderDetails = useCallback(
    async (ordersToDetail: Order[]): Promise<DetailedOrder[]> => {
      if (!Array.isArray(ordersToDetail) || ordersToDetail.length === 0) {
        return [];
      }
      console.log(`Fetching details for ${ordersToDetail.length} orders...`);

      return await Promise.all(
        ordersToDetail.map(async (order) => {
          // Basic validation
          if (!order || !order._id || !order.customer_id || !order.shop) {
            console.warn(
              "Skipping invalid order object in fetchOrderDetails:",
              order
            );
            return {
              ...order,
              customer_name: "Invalid Data",
              shop_name: "Invalid Data",
            } as DetailedOrder;
          }

          try {
            // Fetch customer details
            const customerResponse = await fetch(
              `/api/customers/${order.customer_id}`
            );
            if (!customerResponse.ok)
              throw new Error(
                `Customer fetch failed (${customerResponse.status})`
              );
            const customerData = await customerResponse.json();
            const customerName =
              customerData?.customer?.name || "Unknown Customer";

            // Fetch shop details
            const shopResponse = await fetch(`/api/shops/${order.shop}`);
            if (!shopResponse.ok)
              throw new Error(`Shop fetch failed (${shopResponse.status})`);
            const shopData = await shopResponse.json();
            const shopName = shopData?.shop?.name || "Unknown Shop";
            const shopType = shopData?.shop?.type || "Unknown Type";
            const deliveryFee = shopData?.shop?.delivery_fee || false;

            return {
              ...order,
              customer_name: customerName,
              shop_name: shopName,
              shop_type: shopType,
              delivery_fee: deliveryFee,
            };
          } catch (error: any) {
            console.error(
              `Error fetching details for order ${order._id}:`,
              error.message
            );
            return {
              ...order,
              customer_name: "Error Loading",
              shop_name: "Error Loading",
            } as DetailedOrder;
          }
        })
      );
    },
    []
  );

  // Function for Initial Fetch
  const fetchInitialOrders = useCallback(async () => {
    if (!shopId) {
      setError("Shop ID not found for this admin.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Fetch orders specifically for this shop
      const response = await fetch(`/api/shops/${shopId}/orders`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch initial orders");
      }
      let initialOrders = await response.json();
      setOrders(initialOrders); // Set raw orders

      const detailedOrders = await fetchOrderDetails(initialOrders);
      setOrderDetails(detailedOrders); // Set detailed orders
      // Also update filtered orders based on current filter
      if (filterStatus === "all") {
        setFilteredOrders(detailedOrders);
      } else {
        setFilteredOrders(
          detailedOrders.filter((order) => order.order_status === filterStatus)
        );
      }
    } catch (err: any) {
      console.error("Error fetching initial orders:", err);
      setError(err.message || "An error occurred");
      setOrderDetails([]); // Clear details on error
      setFilteredOrders([]);
    } finally {
      setLoading(false);
    }
  }, [shopId, fetchOrderDetails, filterStatus]);

  // Effect for Initial Fetch
  useEffect(() => {
    if (adminId && shopId) {
      fetchInitialOrders();
    } else if (user) {
      setError("Admin or Shop information is missing.");
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [adminId, shopId, fetchInitialOrders, user]);

  // Handle new order received via Pusher
  const handleNewOrder = useCallback(
    async (newRawOrderData: Order) => {
      console.log(`[Admin Orders] Received new order:`, newRawOrderData);

      // Check if this order is for our shop
      if (newRawOrderData.shop !== shopId) {
        console.log(`[Admin Orders] Order is for a different shop. Ignoring.`);
        return;
      }

      // Check if we already have this order
      if (orderDetails.some((o) => o._id === newRawOrderData._id)) {
        console.log(`[Admin Orders] Duplicate order detected. Skipping.`);
        return;
      }

      try {
        const [detailedNewOrder] = await fetchOrderDetails([newRawOrderData]);

        if (detailedNewOrder) {
          console.log(
            `[Admin Orders] Adding new detailed order:`,
            detailedNewOrder
          );

          // Update both orderDetails and filteredOrders
          setOrderDetails((prev) => [detailedNewOrder, ...prev]);

          // Only add to filtered orders if it matches the current filter
          if (
            filterStatus === "all" ||
            detailedNewOrder.order_status === filterStatus
          ) {
            setFilteredOrders((prev) => [detailedNewOrder, ...prev]);
          }
        } else {
          console.error(
            `[Admin Orders] Failed to fetch details for order:`,
            newRawOrderData
          );
        }
      } catch (error) {
        console.error("[Admin Orders] Error processing new order:", error);
      }
    },
    [orderDetails, fetchOrderDetails, filterStatus, shopId]
  );

  // Effect for payment status updates using the shared context
  useEffect(() => {
    // Register handler for payment status updates
    registerPaymentHandler((data) => {
      console.log(`[Admin Orders] Handling payment status update:`, data);

      // Extract the ID and status
      const orderId = data.order_id || data.orderId;
      const status = data.payment_status || data.status;

      if (!orderId || !status) {
        console.error("[Admin Orders] Missing required data in update:", data);
        return;
      }

      // Update order details in state
      setOrderDetails((prevOrders) =>
        prevOrders.map((order) => {
          if (order._id === orderId) {
            console.log(
              `[Admin Orders] Updating order ${order._id} payment status from "${order.payment_status}" to "${status}"`
            );
            return { ...order, payment_status: status };
          }
          return order;
        })
      );
    });

    // Cleanup
    return () => {
      unregisterPaymentHandler();
    };
  }, [registerPaymentHandler, unregisterPaymentHandler]);

  // Effect for Pusher subscription
  useEffect(() => {
    if (!pusher || !isConnected || !adminId) {
      console.log(
        `[Admin Orders] Skipping Pusher subscription: Missing prerequisites.`
      );
      return;
    }

    const channelName = `private-admin-${adminId}`;
    console.log(`[Admin Orders] Setting up subscription to ${channelName}`);

    // Clean up old subscription if it exists and is different
    if (channelRef.current && channelRef.current.name !== channelName) {
      console.log(
        `[Admin Orders] Unsubscribing from old channel: ${channelRef.current.name}`
      );
      channelRef.current.unbind("new-order"); // Unbind ALL handlers for this event
      channelRef.current.unbind("update-order-price"); // Also unbind this event
      //channelRef.current.unbind("update-payment-status"); // Also unbind this event
      pusher.unsubscribe(channelRef.current.name);
      channelRef.current = null;
    }

    // If we don't have a channel reference or it's not subscribed, create a new subscription
    if (!channelRef.current || !channelRef.current.subscribed) {
      console.log(`[Admin Orders] Subscribing to ${channelName}`);
      const channel = pusher.subscribe(channelName);
      channelRef.current = channel;

      // Handle subscription events
      channel.bind("pusher:subscription_succeeded", () => {
        console.log(`[Admin Orders] Successfully subscribed to ${channelName}`);
      });

      channel.bind("pusher:subscription_error", (status: any) => {
        console.error(
          `[Admin Orders] Failed Pusher subscription to ${channelName}, status: ${status}`
        );
        setError(`Real-time updates failed. Status: ${status}`);
      });

      // Bind to new-order event
      console.log(
        `[Admin Orders] Binding to new-order event on ${channelName}`
      );
      channel.bind("new-order", handleNewOrder);

      // Bind to update-order-price event
      console.log(
        `[Admin Orders] Binding to update-order-price event on ${channelName}`
      );
      channel.bind(
        "update-order-price",
        (data: {
          order_id: string;
          total_weight?: number;
          total_price?: number;
          notes?: string;
        }) => {
          console.log(`[Admin Orders] Received order price update:`, data);

          // Update order details in state
          setOrderDetails((prevOrders) =>
            prevOrders.map((order) => {
              if (order._id === data.order_id) {
                console.log(
                  `[Admin Orders] Updating order ${order._id} price details from:`,
                  {
                    total_weight: order.total_weight,
                    total_price: order.total_price,
                    notes: order.notes,
                  },
                  "to:",
                  {
                    total_weight: data.total_weight || order.total_weight,
                    total_price: data.total_price || order.total_price,
                    notes: data.notes || order.notes,
                  }
                );

                return {
                  ...order,
                  total_weight: data.total_weight || order.total_weight,
                  total_price: data.total_price || order.total_price,
                  notes: data.notes || order.notes,
                };
              }
              return order;
            })
          );
        }
      );
    } else {
      console.log(`[Admin Orders] Already subscribed to ${channelName}`);
      // Don't bind again if we're already subscribed - this is crucial to avoid duplicates!
    }

    // Cleanup function
    return () => {
      console.log(`[Admin Orders] Cleaning up handlers for ${channelName}`);
      if (channelRef.current) {
        // Remove all handlers for the new-order event to prevent duplicates
        channelRef.current.unbind("new-order");
        channelRef.current.unbind("update-order-price"); // Add this line
        // Then add our current handler back
        //channelRef.current.bind("new-order", handleNewOrder);
      }
    };
  }, [pusher, isConnected, adminId, handleNewOrder]);

  const handleEditOrder = (order: any) => {
    setEditOrderId(order._id); // Set the order being edited
    setEditDetails({
      total_weight: order.total_weight || 0,
      total_price: order.total_price || 0,
      notes: order.notes || "",
    });
  };

  const handleSaveEdit = async () => {
    try {
      const response = await fetch(`/api/orders/${editOrderId}/update-price`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editDetails),
      });
      if (!response.ok) {
        throw new Error("Failed to update order details");
      }

      // Find the current order to get the customer_id
      const currentOrder = orderDetails.find(
        (order) => order._id === editOrderId
      );
      if (currentOrder && currentOrder.customer_id) {
        // Send notification to customer (optional - this could also be handled by the server)
        const customerChannel = `private-client-${currentOrder.customer_id}`;
        try {
          await fetch("/api/pusher/trigger", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              channel: customerChannel,
              event: "update-order-price",
              data: {
                order_id: editOrderId,
                ...editDetails,
              },
            }),
          });
          console.log(`Notification sent to customer about price update`);
        } catch (notifyError) {
          console.error(
            "Failed to notify customer about price update:",
            notifyError
          );
        }
      }

      const updatedOrder = await response.json();

      // Update local state
      setOrderDetails((prev) =>
        prev.map((order) =>
          order._id === editOrderId ? { ...order, ...editDetails } : order
        )
      );

      setEditOrderId(null); // Close the edit form
    } catch (error) {
      console.error("Error updating order details:", error);
    }
  };

  const handleAccept = async (orderId: string) => {
    try {
      const response = await fetch(
        `/api/orders/${orderId}/update-order-status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newStatus: "scheduled" }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to accept order");
      }

      const updatedOrder = await response.json();
      setOrderDetails((prev) =>
        prev.map((order) =>
          order._id === orderId
            ? { ...order, order_status: "scheduled" }
            : order
        )
      );
    } catch (error) {
      console.error("Error accepting order:", error);
    }
  };

  const handleDecline = async (orderId: string) => {
    try {
      // Update order status to "cancelled"
      const orderResponse = await fetch(
        `/api/orders/${orderId}/update-order-status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newStatus: "cancelled" }),
        }
      );

      if (!orderResponse.ok) {
        throw new Error("Failed to decline order");
      }

      // Update payment sta-tus to "cancelled"
      const paymentResponse = await fetch(
        `/api/orders/${orderId}/update-payment-status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPaymentStatus: "cancelled" }),
        }
      );

      if (!paymentResponse.ok) {
        throw new Error("Failed to update payment status");
      }

      const updatedOrder = await orderResponse.json();
      setOrderDetails((prev) =>
        prev.map((order) =>
          order._id === orderId
            ? { ...order, order_status: "cancelled" }
            : order
        )
      );
    } catch (error) {
      console.error("Error declining order:", error);
    }
  };

  const handleMoveToNextStage = async (orderId: string, nextStage: string) => {
    try {
      let apiUrl = `/api/orders/${orderId}/update-order-status`;
      let body = { newStatus: nextStage };

      const response = await fetch(apiUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Failed to move order to next stage");
      }

      const updatedOrder = await response.json();
      setOrderDetails((prev) =>
        prev.map((order) =>
          order._id === orderId
            ? {
                ...order,
                order_status: nextStage,
                date_completed: updatedOrder.date_completed,
              }
            : order
        )
      );
    } catch (error) {
      console.error("Error moving order to next stage:", error);
    }
  };

  const handleUpdateDateCompleted = async (orderId: string) => {
    try {
      const newDateCompleted = new Date().toISOString();

      const response = await fetch(
        `/api/orders/${orderId}/update-date-completed`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dateCompleted: newDateCompleted }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update date completed");
      }

      const updatedOrder = await response.json();
      setOrderDetails((prev) =>
        prev.map((order) =>
          order._id === editOrderId
            ? { ...order, date_completed: updatedOrder.date_completed }
            : order
        )
      );
    } catch (error) {
      console.error("Error updating date completed:", error);
    }
  };

  // Add this function to handle search, right before your return statement
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  // Fix the filter effect to properly handle sorting
  useEffect(() => {
    // First, filter by search query if there is one
    let searchFiltered = orderDetails;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      searchFiltered = orderDetails.filter(
        (order) =>
          order.customer_name &&
          order.customer_name.toLowerCase().includes(query)
      );
    }

    // Then apply status filtering
    let statusFiltered;
    if (filterStatus === "all") {
      statusFiltered = searchFiltered;
    } else {
      statusFiltered = searchFiltered.filter(
        (order) => order.order_status === filterStatus
      );
    }

    // Finally, sort the filtered results
    const sortedOrders = sortOrdersByDate(statusFiltered, sortDirection);

    // Update state with sorted and filtered orders
    setFilteredOrders(sortedOrders);
  }, [
    filterStatus,
    searchQuery,
    orderDetails,
    sortDirection,
    sortOrdersByDate,
  ]);
  // if (loading) {
  //   return <p className="text-center text-gray-500">Loading Orders...</p>;
  // }

  return (
    <div className="mt-8 bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        {/* Title and Search Bar */}
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
        <div className="mt-4 flex space-x-4">
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-4 py-2 rounded ${
              filterStatus === "all"
                ? "bg-indigo-500 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus("pending")}
            className={`px-4 py-2 rounded ${
              filterStatus === "pending" || "Pending"
                ? "bg-indigo-500 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilterStatus("scheduled")}
            className={`px-4 py-2 rounded ${
              filterStatus === "scheduled"
                ? "bg-indigo-500 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Scheduled
          </button>
          <button
            onClick={() => setFilterStatus("in progress")}
            className={`px-4 py-2 rounded ${
              filterStatus === "in progress"
                ? "bg-indigo-500 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Ongoing
          </button>
          <button
            onClick={() => setFilterStatus("completed")}
            className={`px-4 py-2 rounded ${
              filterStatus === "completed"
                ? "bg-indigo-500 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Completed
          </button>
        </div>
      </div>
      <div className="border-t border-gray-200">
        <div className="px-4 py-5 sm:p-6">
          {filteredOrders.length > 0 ? (
            <ul className="space-y-4">
              {filteredOrders.map((order, index) => (
                <li
                  key={index}
                  className="p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200"
                >
                  <h4 className="text-lg font-semibold text-gray-800">
                    Customer:{" "}
                    {order.customer_name.charAt(0).toUpperCase() +
                      order.customer_name.slice(1)}
                  </h4>
                  <p className="text-sm text-gray-600">
                    Order Status:{" "}
                    {order.order_status.charAt(0).toUpperCase() +
                      order.order_status.slice(1)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Payment Status:{" "}
                    {order.payment_status.charAt(0).toUpperCase() +
                      order.payment_status.slice(1)}
                  </p>
                  <p className="text-sm text-gray-600">Services:</p>
                  <ul className="list-disc pl-5">
                    {order.services.map((service: any, idx: number) => (
                      <li key={idx}>{service}</li>
                    ))}
                  </ul>

                  <p className="text-sm text-gray-600">
                    Payment Method:{" "}
                    {order.payment_method.charAt(0).toUpperCase() +
                      order.payment_method.slice(1)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Machine:{" "}
                    {order.machine_id.charAt(0).toUpperCase() +
                      order.machine_id.slice(1)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Machine Type:{" "}
                    {order.type
                      ? order.type.charAt(0).toUpperCase() + order.type.slice(1)
                      : "Unknown"}
                  </p>
                  <p className="text-sm text-gray-600">
                    Schedule:{" "}
                    {new Date(order.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}{" "}
                    {order.time_range &&
                      `(${order.time_range[0]?.start} - ${order.time_range[0]?.end})`}
                  </p>
                  <p className="text-sm text-gray-600">
                    Date Completed: {order.date_completed || "Pending"}
                  </p>
                  <p className="text-sm text-gray-600">
                    Total Weight: {order.total_weight || "Pending"}
                  </p>
                  <p className="text-sm text-gray-600">
                    Total Price: {order.total_price || "Pending"}
                  </p>
                  <p className="text-sm text-gray-600">
                    Notes: {order.notes || "No notes added"}
                  </p>

                  {order.order_status !== "cancelled" &&
                    order.order_status !== "pending" &&
                    order.order_status !== "completed" && (
                      <div className="mt-4 flex space-x-4">
                        <button
                          onClick={() => handleEditOrder(order)}
                          className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600"
                        >
                          Edit Order Details
                        </button>
                      </div>
                    )}

                  {/* Edit Form */}
                  {editOrderId === order._id &&
                    order.order_status !== "cancelled" &&
                    order.order_status !== "pending" &&
                    order.order_status !== "completed" && (
                      <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                        <h4 className="text-md font-semibold text-gray-800">
                          Edit Order Details
                        </h4>
                        <div className="mt-2 space-y-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Total Weight (kg)
                            </label>
                            <input
                              type="number"
                              value={editDetails.total_weight}
                              onChange={(e) =>
                                setEditDetails({
                                  ...editDetails,
                                  total_weight: parseFloat(e.target.value),
                                })
                              }
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Total Price (₱)
                            </label>
                            <input
                              type="number"
                              value={editDetails.total_price}
                              onChange={(e) =>
                                setEditDetails({
                                  ...editDetails,
                                  total_price: parseFloat(e.target.value),
                                })
                              }
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Notes
                            </label>
                            <textarea
                              value={editDetails.notes}
                              onChange={(e) =>
                                setEditDetails({
                                  ...editDetails,
                                  notes: e.target.value,
                                })
                              }
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                          </div>
                        </div>
                        <div className="mt-4 flex space-x-4">
                          <button
                            onClick={handleSaveEdit}
                            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditOrderId(null)}
                            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                  <div className="mt-4 flex space-x-4">
                    {order.order_status === "pending" && (
                      <>
                        <button
                          onClick={() => handleAccept(order._id)}
                          className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDecline(order._id)}
                          className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                        >
                          Decline
                        </button>
                      </>
                    )}

                    {order.order_status === "scheduled" && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <button
                          onClick={() =>
                            handleMoveToNextStage(order._id, "pending")
                          }
                          className="bg-amber-500 text-white px-4 py-2 rounded-md hover:bg-amber-600"
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
                                d="M10 19l-7-7m0 0l7-7m-7 7h18"
                              />
                            </svg>
                            Back to Pending
                          </div>
                        </button>
                        <button
                          onClick={() =>
                            handleMoveToNextStage(order._id, "in progress")
                          }
                          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                        >
                          <div className="flex items-center">
                            Forward to Ongoing
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 ml-1"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M14 5l7 7m0 0l-7 7m7-7H3"
                              />
                            </svg>
                          </div>
                        </button>
                      </div>
                    )}
                    {order.order_status === "in progress" && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <button
                          onClick={() =>
                            handleMoveToNextStage(order._id, "scheduled")
                          }
                          className="bg-amber-500 text-white px-4 py-2 rounded-md hover:bg-amber-600"
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
                                d="M10 19l-7-7m0 0l7-7m-7 7h18"
                              />
                            </svg>
                            Back to Scheduled
                          </div>
                        </button>
                        <button
                          onClick={() =>
                            handleMoveToNextStage(order._id, "completed")
                          }
                          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                        >
                          <div className="flex items-center">
                            Forward to Completed
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 ml-1"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M14 5l7 7m0 0l-7 7m7-7H3"
                              />
                            </svg>
                          </div>
                        </button>
                      </div>
                    )}
                    {order.order_status === "completed" && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <button
                          onClick={() =>
                            handleMoveToNextStage(order._id, "in progress")
                          }
                          className="bg-amber-500 text-white px-4 py-2 rounded-md hover:bg-amber-600"
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
                                d="M10 19l-7-7m0 0l7-7m-7 7h18"
                              />
                            </svg>
                            Back to Ongoing
                          </div>
                        </button>
                      </div>
                    )}
                  </div>
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
    </div>
  );
}
