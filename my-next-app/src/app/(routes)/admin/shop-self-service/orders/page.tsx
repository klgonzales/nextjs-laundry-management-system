"use client";
import { useAuth } from "@/app/context/AuthContext";
// --- Import usePusher ---
import { usePusher } from "@/app/context/PusherContext";
// --- Remove direct pusherClient import if only using context ---
// import { pusherClient } from "@/app/lib/pusherClient";
import type { Channel } from "pusher-js";
// --- Add useRef ---
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
// Add this import at the top of your file
import { useRealTimeUpdates } from "@/app/context/RealTimeUpdatesContext";
// Add icons import at the top if not already imported
import {
  FiUser,
  FiMapPin,
  FiCalendar,
  FiClock,
  FiDollarSign,
  FiPackage,
  FiList,
  FiTruck,
  FiCreditCard,
  FiFileText,
  FiSmartphone,
  FiInfo,
  FiClipboard,
  FiEdit3,
} from "react-icons/fi";

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
  const [filterStatus, setFilterStatus] = useState<string>("pending"); // Track the selected filter
  // First add a new state for search query at the top with your other states
  // Also add the ongoingSubcategory state for the subcategories
  const [ongoingSubcategory, setOngoingSubcategory] = useState<string>("");
  const [conflictMap, setConflictMap] = useState(new Map());
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
  // Add a new state variable to track which order is currently being updated
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(
    null
  );

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

  // Add this memoized counts object
  const orderCounts = useMemo(() => {
    if (!orderDetails.length)
      return {
        all: 0,
        pending: 0,
        scheduled: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
      };

    const counts = {
      all: orderDetails.length,
      pending: 0,
      scheduled: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
    };

    for (const order of orderDetails) {
      if (order.order_status === "pending") counts.pending++;
      else if (order.order_status === "scheduled") counts.scheduled++;
      else if (order.order_status === "in progress") counts.inProgress++;
      else if (order.order_status === "completed") counts.completed++;
      else if (order.order_status === "cancelled") counts.cancelled++;
    }

    return counts;
  }, [orderDetails]);
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
      // Set the processing state for this specific order
      setProcessingOrderId(orderId);
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
    } finally {
      // Clear the processing state
      setProcessingOrderId(null);
    }
  };

  const handleDecline = async (orderId: string) => {
    try {
      // Set the processing state for this specific order
      setProcessingOrderId(orderId);
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
    } finally {
      // Clear the processing state
      setProcessingOrderId(null);
    }
  };

  const handleMoveToNextStage = async (orderId: string, nextStage: string) => {
    try {
      // Set the processing state for this specific order
      setProcessingOrderId(orderId);
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
    } finally {
      // Clear the processing state
      setProcessingOrderId(null);
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

  // Add this component at the top of your file (outside the main component)
  const FilterButton = ({
    label,
    count,
    active,
    onClick,
  }: {
    label: string;
    count: number;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
        active
          ? "bg-purple-100 text-purple-800"
          : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
      }`}
    >
      <span>{label}</span>
      <span
        className={`ml-1 inline-flex items-center justify-center h-4 min-w-[1rem] px-1 text-xs font-medium rounded-full ${
          count > 0
            ? active
              ? "bg-white text-purple-800"
              : "bg-gray-100 text-gray-600"
            : "bg-gray-100 text-gray-400"
        }`}
      >
        {count}
      </span>
    </button>
  );

  // Add this function to handle search, right before your return statement
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };
  useEffect(() => {
    const identifyConflicts = () => {
      if (!orderDetails || orderDetails.length === 0) return;

      const machineConflicts = new Map(); // Store machine conflicts by machine-date-time
      const timeConflicts = new Map(); // Store time conflicts by date-time
      const conflictingOrderIds = new Set();

      // First pass: Find all conflicts
      orderDetails.forEach((order) => {
        // Skip cancelled orders from conflict detection
        if (order.order_status === "cancelled") return;

        // Check if order has necessary data for conflict detection
        if (order.date && order.time_range?.length > 0) {
          const dateKey = new Date(order.date).toDateString();
          const timeKey = order.time_range[0].start;

          // Create combined keys for lookups
          const dateTimeKey = `${dateKey}-${timeKey}`;
          const machineKey = order.machine_id
            ? `${order.machine_id}-${dateKey}-${timeKey}`
            : null;

          // Check for machine conflicts first (highest priority)
          if (machineKey) {
            if (!machineConflicts.has(machineKey)) {
              machineConflicts.set(machineKey, [order._id]);
            } else {
              // Found a machine conflict
              const existingOrders = machineConflicts.get(machineKey);
              existingOrders.push(order._id);

              // Mark all orders using this machine-time-date as conflicting
              existingOrders.forEach((id: unknown) =>
                conflictingOrderIds.add(id)
              );
            }
          }

          // Also track general time slot conflicts
          if (!timeConflicts.has(dateTimeKey)) {
            timeConflicts.set(dateTimeKey, [order._id]);
          } else {
            const existingOrders = timeConflicts.get(dateTimeKey);
            existingOrders.push(order._id);

            // Only mark as time conflicts if there's no machine conflict
            if (existingOrders.length > 1) {
              existingOrders.forEach((id: unknown) => {
                // Only add as time conflict if not already a machine conflict
                const order = orderDetails.find((o) => o._id === id);
                if (order && !order.machine_id) {
                  conflictingOrderIds.add(id);
                }
              });
            }
          }
        }
      });

      // Second pass: Update each order with conflict information
      const updatedOrders = orderDetails.map((order) => {
        if (order.order_status === "cancelled") {
          // Cancelled orders never have conflicts
          return { ...order, hasConflict: false, conflictType: null };
        }

        const hasConflict = conflictingOrderIds.has(order._id);

        // Determine conflict type
        let conflictType = null;
        if (hasConflict) {
          // Check if this is a machine conflict
          if (order.machine_id && order.date && order.time_range?.length > 0) {
            const dateKey = (date: string | number | Date) => {
              const d = new Date(date);
              return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
            };
            const timeKey = order.time_range[0].start;
            const machineKey = `${order.machine_id}-${dateKey}-${timeKey}`;

            if (
              machineConflicts.has(machineKey) &&
              machineConflicts.get(machineKey).length > 1
            ) {
              conflictType = "machine";
            } else {
              conflictType = "time";
            }
          } else {
            conflictType = "time";
          }
        }

        return {
          ...order,
          hasConflict,
          conflictType,
        };
      });

      // Only update state if something changed
      const hasChanges = updatedOrders.some((updated, i) => {
        const original = orderDetails[i];
        return (
          updated.hasConflict !== original.hasConflict ||
          updated.conflictType !== original.conflictType
        );
      });

      if (hasChanges) {
        console.log("Updating orders with conflict information");
        setOrderDetails(updatedOrders);
      }
    };

    identifyConflicts();
  }, [orderDetails]); // Consider using a more efficient dependency if possible

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

  // Update your render return JSX with the new UI styling
  return (
    <div className="mt-8 bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        {/* Title and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Orders
          </h3>
          <div className="mt-2 sm:mt-0 relative rounded-md ">
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
                className="btn btn-sm btn-primary"
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
          <div className="mt-2 sm:mt-0 flex items-center ml-4 space-x-4"></div>
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

        <div className="mt-4 flex flex-wrap gap-2">
          {/* Sort buttons - more compact */}
          <div className="flex items-center pr-0 mr-0">
            <button
              onClick={() => setSortDirection("asc")}
              className={`btn ${
                sortDirection === "asc"
                  ? "btn-tertiary"
                  : "btn-tertiary-neutral"
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
                Oldest
              </div>
            </button>
            <button
              onClick={() => setSortDirection("desc")}
              className={`btn ${
                sortDirection === "desc"
                  ? "btn-tertiary"
                  : "btn-tertiary-neutral"
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
                Newest
              </div>
            </button>
          </div>

          <div className="w-px bg-gray-300"></div>

          <button
            onClick={() => {
              setFilterStatus("all");
              setOngoingSubcategory(""); // Reset subcategory
            }}
            className={`btn ${
              filterStatus === "all" ? "btn-tertiary" : "btn-tertiary-neutral"
            }`}
          >
            All
            <span
              className={`ml-1 inline-flex items-center justify-center h-5 w-5 text-xs rounded-full ${
                orderCounts.all > 0
                  ? "bg-purple-100 text-purple-800"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {orderCounts.all}
            </span>
          </button>
          <button
            onClick={() => {
              setFilterStatus("pending");
              setOngoingSubcategory(""); // Reset subcategory
            }}
            className={`btn ${
              filterStatus === "pending"
                ? "btn-tertiary"
                : "btn-tertiary-neutral"
            }`}
          >
            Pending
            <span
              className={`ml-1 inline-flex items-center justify-center h-5 w-5 text-xs rounded-full ${
                orderCounts.pending > 0
                  ? "bg-purple-100 text-purple-800"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {orderCounts.pending}
            </span>
          </button>
          <button
            onClick={() => setFilterStatus("scheduled")}
            className={`btn ${
              filterStatus === "scheduled"
                ? "btn-tertiary"
                : "btn-tertiary-neutral"
            }`}
          >
            Scheduled
            <span
              className={`ml-1 inline-flex items-center justify-center h-5 w-5 text-xs rounded-full ${
                orderCounts.scheduled > 0
                  ? "bg-purple-100 text-purple-800"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {orderCounts.scheduled}
            </span>
          </button>
          <button
            onClick={() => setFilterStatus("in progress")}
            className={`btn ${
              filterStatus === "in progress"
                ? "btn-tertiary"
                : "btn-tertiary-neutral"
            }`}
          >
            Ongoing
            <span
              className={`ml-1 inline-flex items-center justify-center h-5 w-5 text-xs rounded-full ${
                orderCounts.inProgress > 0
                  ? "bg-purple-100 text-purple-800"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {orderCounts.inProgress}
            </span>
          </button>
          <button
            onClick={() => {
              setFilterStatus("completed");
              setOngoingSubcategory(""); // Reset subcategory
            }}
            className={`btn ${
              filterStatus === "completed"
                ? "btn-tertiary"
                : "btn-tertiary-neutral"
            }`}
          >
            Completed
            <span
              className={`ml-1 inline-flex items-center justify-center h-5 w-5 text-xs rounded-full ${
                orderCounts.completed > 0
                  ? "bg-purple-100 text-purple-800"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {orderCounts.completed}
            </span>
          </button>
          <button
            onClick={() => {
              setFilterStatus("cancelled");
              setOngoingSubcategory(""); // Reset subcategory
            }}
            className={`btn ${
              filterStatus === "cancelled"
                ? "btn-tertiary"
                : "btn-tertiary-neutral"
            }`}
          >
            Cancelled
            <span
              className={`ml-1 inline-flex items-center justify-center h-5 w-5 text-xs rounded-full ${
                orderCounts.cancelled > 0
                  ? "bg-purple-100 text-purple-800"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {orderCounts.cancelled}
            </span>
          </button>
        </div>
      </div>
      <div className="px-2 py-2 sm:p-2">
        {loading ? (
          <div className="py-4">
            {/* Skeleton Loading for Admin Orders */}
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="mb-8 animate-pulse border border-gray-200 rounded-lg p-4"
              >
                {/* Order Header Skeleton */}
                <div className="flex flex-wrap justify-between items-start mb-4 pb-2 border-b border-gray-300">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                    <div>
                      <div className="h-5 w-40 bg-gray-200 rounded mb-2"></div>
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Status Badge */}
                        <div className="h-5 w-20 bg-gray-200 rounded-full"></div>

                        {/* Additional Info Badges */}
                        <div className="flex flex-wrap gap-2 mt-1">
                          <div className="h-5 w-16 bg-gray-200 rounded-full"></div>
                          <div className="h-5 w-16 bg-gray-200 rounded-full"></div>
                          <div className="h-5 w-32 bg-gray-200 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Content Skeleton - 4-column grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  {/* Services */}
                  <div className="flex items-start">
                    <div className="mt-1">
                      <div className="h-4 w-4 rounded-full bg-gray-200"></div>
                    </div>
                    <div className="ml-2 flex-1">
                      <div className="h-4 w-20 bg-gray-200 rounded mb-2"></div>
                      <div className="flex flex-wrap gap-1">
                        {[1, 2, 3].map((service) => (
                          <div
                            key={service}
                            className="h-5 w-16 bg-gray-200 rounded"
                          ></div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="flex items-start">
                    <div className="mt-1">
                      <div className="h-4 w-4 rounded-full bg-gray-200"></div>
                    </div>
                    <div className="ml-2 flex-1">
                      <div className="h-4 w-16 bg-gray-200 rounded mb-2"></div>
                      <div className="flex flex-wrap gap-1">
                        {[1, 2, 3].map((item) => (
                          <div
                            key={item}
                            className="h-6 w-20 bg-gray-200 rounded"
                          ></div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="flex items-start">
                    <div className="mt-1">
                      <div className="h-4 w-4 rounded-full bg-gray-200"></div>
                    </div>
                    <div className="ml-2 flex-1">
                      <div className="flex justify-between">
                        <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                        <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-6 w-24 bg-gray-200 rounded"></div>
                        <div className="h-6 w-16 bg-gray-200 rounded"></div>
                        <div className="h-6 w-20 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="flex items-start">
                    <div className="mt-1">
                      <div className="h-4 w-4 rounded-full bg-gray-200"></div>
                    </div>
                    <div className="ml-2 flex-1">
                      <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                      <div className="h-12 w-full bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons Skeleton */}
                <div className="mt-4 flex justify-end space-x-4">
                  <div className="h-9 w-24 bg-gray-200 rounded"></div>
                  <div className="h-9 w-24 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredOrders.length > 0 ? (
          <div className="border-t border-gray-200">
            <div className="px-4 py-5 sm:p-6">
              <ul className="space-y-4">
                {filteredOrders.map((order, index) => (
                  <li
                    key={index}
                    className={`p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow  ${
                      order.hasConflict ? "bg-[#FFF0F0]" : "bg-[#F9F9F9]"
                    }`}
                  >
                    {/* Header with customer name and order details in one row */}
                    <div className="flex flex-wrap justify-between items-start mb-4 pb-2 border-b border-gray-300">
                      <div className="flex items-center space-x-3">
                        {/* Customer info */}
                        <div className="w-10 h-10 bg-[#EADDFF] rounded-full flex items-center justify-center">
                          <FiUser className="h-5 w-5 text-[#3D4EB0]" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <h4 className="font-medium text-gray-900">
                              {order.customer_name.charAt(0).toUpperCase() +
                                order.customer_name.slice(1)}
                            </h4>

                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                            ${
                              order.order_status === "pending"
                                ? "bg-yellow-50 text-yellow-500"
                                : order.order_status === "completed"
                                  ? "bg-green-50 text-green-500"
                                  : order.order_status === "cancelled"
                                    ? "bg-red-50 text-red-500"
                                    : "bg-purple-50 text-purple-500"
                            }`}
                            >
                              {order.order_status.charAt(0).toUpperCase() +
                                order.order_status.slice(1)}
                              {order.order_status === "completed" &&
                                order.date_completed && (
                                  <span className="ml-1">
                                    •{" "}
                                    {new Date(
                                      order.date_completed
                                    ).toLocaleDateString()}
                                  </span>
                                )}
                            </span>
                            {/* Add conflict indicator */}
                            {order.hasConflict && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <svg
                                  className="h-3 w-3 mr-1"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                {order.conflictType === "machine"
                                  ? "Machine Conflict"
                                  : "Time Conflict"}
                              </span>
                            )}
                            {/* Status badge */}
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              {/* Date/Time badges */}
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-[#F0F0F0] text-gray-800">
                                <FiCalendar className="mr-1 h-3 w-3 text-gray-500" />
                                <time dateTime={order.date}>
                                  {new Date(order.date).toLocaleDateString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                      timeZone: "UTC",
                                    }
                                  )}
                                </time>
                              </span>

                              {order.time_range &&
                                order.time_range.length > 0 && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-[#F0F0F0] text-gray-800">
                                    <FiClock className="mr-1 h-3 w-3 text-gray-500" />
                                    {order.time_range[0].start} -{" "}
                                    {order.time_range[0].end}
                                  </span>
                                )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Add conflict warning message if needed */}
                    {order.hasConflict && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                        <div className="flex">
                          <svg
                            className="h-5 w-5 mr-2 text-red-400"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <div>
                            <p className="font-medium">Scheduling Conflict</p>
                            <p>
                              This order conflicts with another order scheduled
                              for the same date and time slot.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Services, items, and order details all in one row */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      {/* Services */}
                      <div className="flex items-start">
                        <div className="mt-1">
                          <FiList className="h-4 w-4 text-[#3D4EB0]" />
                        </div>
                        <div className="ml-2">
                          <h5 className="text-sm font-medium text-[#3D4EB0]">
                            Services
                          </h5>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {order.services.map((service: any, idx: number) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#F0F0F0] text-[#3D4EB0]"
                              >
                                {service}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Machine Details */}
                      <div className="flex items-start">
                        <div className="mt-1">
                          <FiPackage className="h-4 w-4 text-[#3D4EB0]" />
                        </div>
                        <div className="ml-2">
                          <h5 className="text-sm font-medium text-[#3D4EB0]">
                            Machine
                          </h5>
                          <div className="mt-1 flex flex-wrap gap-1">
                            <div className="text-xs bg-[#F0F0F0] px-2 py-0.5 rounded flex items-center">
                              <span className="text-gray-600">
                                {order.machine_id || "Not assigned yet"}
                              </span>
                            </div>
                            {order.type && (
                              <div className="text-xs bg-[#F0F0F0] px-2 py-0.5 rounded flex items-center">
                                <span className="text-gray-600">
                                  {order.type.charAt(0).toUpperCase() +
                                    order.type.slice(1)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Order details (payment, weight, price) */}
                      <div className="flex items-start">
                        <div className="mt-1">
                          <FiInfo className="h-4 w-4 text-[#3D4EB0]" />
                        </div>
                        <div className="ml-2">
                          <div className="flex items-center justify-between space-x-4">
                            <h5 className="text-sm font-medium text-[#3D4EB0]">
                              Payment Details
                            </h5>
                            {order.order_status !== "cancelled" &&
                              order.order_status !== "pending" &&
                              order.order_status !== "completed" && (
                                <button
                                  onClick={() => handleEditOrder(order)}
                                  className="btn btn-sm btn-primary"
                                >
                                  <FiEdit3 className="h-4 w-4" />
                                </button>
                              )}
                          </div>
                          <div className="mt-1 space-y-1">
                            <div className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-[#F0F0F0] text-gray-600 mr-1 mb-1">
                              <FiCreditCard className="mr-1.5 h-3.5 w-3.5 text-[#3D4EB0]" />
                              <span>
                                {order.payment_method.charAt(0).toUpperCase() +
                                  order.payment_method.slice(1)}
                              </span>
                            </div>
                            {order.total_weight ? (
                              <div className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-[#F0F0F0] text-gray-600 mr-1 mb-1">
                                <FiSmartphone className="mr-1.5 h-3.5 w-3.5 text-[#3D4EB0]" />
                                <span>{order.total_weight} kg</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-[#F0F0F0] text-gray-500 mr-1 mb-1">
                                <FiSmartphone className="mr-1.5 h-3.5 w-3.5 text-[#3D4EB0]" />
                                <span>Pending</span>
                              </div>
                            )}
                            {order.total_price ? (
                              <div className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-[#F0F0F0] text-gray-600 mr-1 mb-1 gap-1">
                                <FiDollarSign className="mr-1.5 h-3.5 w-3.5 text-[#3D4EB0]" />
                                <span>₱{order.total_price}</span>
                                <span>
                                  (
                                  {order.payment_status
                                    .charAt(0)
                                    .toUpperCase() +
                                    order.payment_status.slice(1)}
                                  )
                                </span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-[#F0F0F0] text-gray-500 mr-1 mb-1">
                                <FiDollarSign className="mr-1.5 h-3.5 w-3.5 text-[#3D4EB0]" />
                                <span>Pending</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="flex items-start">
                        <div className="mt-1">
                          <FiClipboard className="h-4 w-4 text-[#3D4EB0]" />
                        </div>
                        <div className="ml-2">
                          <h5 className="text-sm font-medium text-[#3D4EB0]">
                            Notes
                          </h5>
                          <div className="mt-1">
                            {order.notes ? (
                              <div className="inline-flex items-start bg-[#F0F0F0] px-2 py-1 rounded">
                                <div className="text-xs text-gray-600">
                                  {order.notes}
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-gray-500">
                                No notes
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

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
                              className="btn btn-success"
                            >
                              {loading ? "Saving" : "Save"}
                            </button>
                            <button
                              onClick={() => setEditOrderId(null)}
                              className="btn btn-danger"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                    <div className="mt-4 flex justify-end space-x-4">
                      {order.order_status === "pending" && (
                        <>
                          <button
                            onClick={() => handleAccept(order._id)}
                            disabled={processingOrderId === order._id}
                            className="btn btn-success"
                          >
                            {processingOrderId === order._id
                              ? "Accepting..."
                              : "Accept"}
                          </button>
                          <button
                            onClick={() => handleDecline(order._id)}
                            className="btn btn-danger"
                          >
                            Decline
                          </button>
                        </>
                      )}

                      {/* Order progression buttons stay the same as your original code */}
                      {/* Example for "scheduled" status */}
                      {order.order_status === "scheduled" && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          <button
                            onClick={() =>
                              handleMoveToNextStage(order._id, "pending")
                            }
                            className="btn btn-neutral"
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
                            disabled={processingOrderId === order._id}
                            className="btn btn-sm btn-primary"
                          >
                            <div className="flex items-center">
                              {processingOrderId === order._id
                                ? "Moving to Ongoing..."
                                : "Move to Ongoing"}
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
                              handleMoveToNextStage(order._id, "pending")
                            }
                            className="btn btn-neutral"
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
                            disabled={processingOrderId === order._id}
                            className="btn btn-sm btn-primary"
                          >
                            <div className="flex items-center">
                              {processingOrderId === order._id
                                ? "Marking as Completed..."
                                : "Mark as Completed"}
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
                            className="btn btn-neutral"
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
            </div>
          </div>
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
                    className="btn btn-sm btn-primary"
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
