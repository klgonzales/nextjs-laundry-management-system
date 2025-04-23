"use client";
import { useAuth } from "@/app/context/AuthContext";
// --- Remove SocketContext ---
// import { useSocket } from "@/app/context/SocketContext";
// --- Add Pusher Client ---
import { pusherClient } from "@/app/lib/pusherClient";
import type { Channel } from "pusher-js"; // Import Channel type
// --- Add Imports ---
import { useState, useEffect, useRef } from "react";

export default function Orders() {
  const { user } = useAuth();
  // --- Remove socket state ---
  // const { socket, isConnected } = useSocket();
  const [orders, setOrders] = useState<any[]>(user?.shops?.[0]?.orders || []);
  const [orderDetails, setOrderDetails] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [editOrderId, setEditOrderId] = useState<string | null>(null);
  const [editDetails, setEditDetails] = useState({
    total_weight: 0,
    total_price: 0,
    notes: "",
  });
  const channelRef = useRef<Channel | null>(null); // Ref for Pusher channel

  const adminId = user?.admin_id;

  // --- fetchOrderDetails function (remains the same) ---
  const fetchOrderDetails = async (ordersToDetail: any[]): Promise<any[]> => {
    // ... (implementation is the same) ...
    if (!Array.isArray(ordersToDetail) || ordersToDetail.length === 0) {
      return [];
    }
    return await Promise.all(
      ordersToDetail.map(async (order) => {
        if (!order || !order._id || !order.customer_id || !order.shop) {
          console.warn(
            "Skipping invalid order object in fetchOrderDetails:",
            order
          );
          return order;
        }
        if (order.customer_name && order.customer_name !== "Error")
          return order;

        try {
          const customerResponse = await fetch(
            `/api/customers/${order.customer_id}`
          );
          if (!customerResponse.ok) {
            throw new Error(
              `Customer fetch failed with status ${customerResponse.status}`
            );
          }
          const customerData = await customerResponse.json();

          const shopResponse = await fetch(`/api/shops/${order.shop}`);
          if (!shopResponse.ok) {
            throw new Error(
              `Shop fetch failed with status ${shopResponse.status}`
            );
          }
          const shopData = await shopResponse.json();

          return {
            ...order,
            customer_name: customerData?.customer?.name || "Unknown Customer",
            shop_name: shopData?.shop?.name || "Unknown Shop",
            shop_type: shopData?.shop?.type || "Unknown Type",
            delivery_fee: shopData?.shop?.delivery_fee || false,
          };
        } catch (error) {
          console.error(
            `Error fetching details for order ${order._id}:`,
            error
          );
          return {
            ...order,
            customer_name: "Error",
            shop_name: "Error",
            shop_type: "Error",
          };
        }
      })
    );
  };

  // --- fetchInitialOrders function (remains the same) ---
  const fetchInitialOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const shopId = user?.shops?.[0]?.shop_id;
      if (!shopId) {
        throw new Error("Shop ID is not available.");
      }
      const response = await fetch(`/api/shops/${shopId}/orders`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch initial orders");
      }
      let initialOrders: any[] = await response.json();
      setOrders(initialOrders); // Set raw orders

      const detailedOrders = await fetchOrderDetails(initialOrders);
      setOrderDetails(detailedOrders); // Set detailed orders
    } catch (err: any) {
      console.error("Error fetching initial orders:", err);
      setError(err.message || "An error occurred");
      setOrderDetails([]); // Clear details on error
    } finally {
      setLoading(false);
    }
  };

  // --- Fetch initial data on mount (remains the same) ---
  useEffect(() => {
    if (adminId) {
      fetchInitialOrders();
    } else if (user) {
      setLoading(true);
    } else {
      setLoading(false);
      setError("User not logged in.");
    }
  }, [adminId]); // Depend on adminId

  // --- Pusher Listener useEffect ---
  useEffect(() => {
    if (!adminId) {
      // Unsubscribe if admin logs out
      if (channelRef.current) {
        console.log(
          `[Admin Orders Page] Unsubscribing from Pusher channel ${channelRef.current.name}`
        );
        channelRef.current.unbind_all();
        pusherClient.unsubscribe(channelRef.current.name);
        channelRef.current = null;
      }
      return;
    }

    const channelName = `private-admin-${adminId}`;

    // Avoid re-subscribing
    if (channelRef.current && channelRef.current.name === channelName) {
      console.log(`[Admin Orders Page] Already subscribed to ${channelName}`);
      return;
    }

    // Unsubscribe from old channel if needed
    if (channelRef.current && channelRef.current.name !== channelName) {
      console.log(
        `[Admin Orders Page] Unsubscribing from old Pusher channel ${channelRef.current.name}`
      );
      channelRef.current.unbind_all();
      pusherClient.unsubscribe(channelRef.current.name);
      channelRef.current = null;
    }

    console.log(
      `[Admin Orders Page] Subscribing to Pusher channel ${channelName}`
    );
    const channel = pusherClient.subscribe(channelName);
    channelRef.current = channel;

    // Handle subscription success/failure
    channel.bind("pusher:subscription_succeeded", () => {
      console.log(
        `[Admin Orders Page] Successfully subscribed to ${channelName}`
      );
    });

    channel.bind("pusher:subscription_error", (status: number) => {
      console.error(
        `[Admin Orders Page] Failed to subscribe to ${channelName}, status: ${status}. Check auth endpoint.`
      );
      setError(
        `Real-time order updates failed (Auth Error ${status}). Please refresh.`
      );
    });

    // Handler for new orders
    const handleNewOrder = async (newOrderData: any) => {
      // Make async to fetch details
      console.log(
        "[Admin Orders Page] Pusher received 'new-order':",
        newOrderData
      );

      // Fetch details for the new order immediately
      const [detailedNewOrder] = await fetchOrderDetails([newOrderData]);

      setOrderDetails((prevDetails) => {
        // Avoid duplicates
        if (prevDetails.some((o) => o._id === detailedNewOrder._id)) {
          return prevDetails;
        }
        // Add the *detailed* new order to the beginning
        return [detailedNewOrder, ...prevDetails];
      });
    };

    // Attach listener
    console.log(`[Admin Orders Page] Binding to 'new-order' on ${channelName}`);
    channel.bind("new-order", handleNewOrder);

    // Cleanup: Remove listener
    return () => {
      if (channelRef.current && channelRef.current.name === channelName) {
        console.log(
          `[Admin Orders Page] Unbinding from 'new-order' on ${channelName}`
        );
        channelRef.current.unbind("new-order", handleNewOrder);
        // Optional: Unsubscribe on unmount? Depends on desired persistence.
        // console.log(`[Admin Orders Page] Unsubscribing from Pusher channel ${channelName}`);
        // pusherClient.unsubscribe(channelName);
        // channelRef.current = null;
      }
    };
    // Depend on adminId
  }, [adminId]);

  // --- Filter orders based on the selected status (remains the same) ---
  useEffect(() => {
    if (filterStatus === "all") {
      setFilteredOrders(orderDetails);
    } else {
      setFilteredOrders(
        orderDetails.filter((order) => order.order_status === filterStatus)
      );
    }
  }, [filterStatus, orderDetails]);

  // --- Other handlers (handleEditOrder, handleSaveEdit, handleAccept, handleDecline, etc. remain the same) ---
  const handleEditOrder = (order: any) => {
    setEditOrderId(order._id);
    setEditDetails({
      total_weight: order.total_weight || 0,
      total_price: order.total_price || 0,
      notes: order.notes || "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editOrderId) return;
    try {
      const response = await fetch(`/api/orders/${editOrderId}/update-price`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editDetails),
      });
      if (!response.ok) {
        throw new Error("Failed to update order details");
      }
      const updatedOrder = await response.json();
      setOrderDetails((prev) =>
        prev.map((order) =>
          order._id === editOrderId
            ? { ...order, ...updatedOrder.order } // Use updated data from response
            : order
        )
      );
      setEditOrderId(null);
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
                date_completed: updatedOrder.order.date_completed, // Access nested order object
              }
            : order
        )
      );
    } catch (error) {
      console.error("Error moving order to next stage:", error);
    }
  };

  // --- Render Logic (remains mostly the same) ---
  return (
    <div className="mt-8 bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Orders</h3>
        {/* Filter Buttons */}
        <div className="mt-4 flex space-x-4">
          {/* ... buttons ... */}
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
              filterStatus === "pending"
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
          {loading && (
            <p className="text-center text-gray-500">Loading orders...</p>
          )}
          {error && <p className="text-center text-red-500">Error: {error}</p>}
          {!loading && !error && filteredOrders.length > 0 ? (
            <ul className="space-y-4">
              {filteredOrders.map((order, index) => (
                <li
                  key={order._id || index} // Use _id as key
                  className="p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200"
                >
                  {/* Order Details Display */}
                  <h4 className="text-lg font-semibold text-gray-800">
                    Customer:{" "}
                    {order.customer_name?.charAt(0).toUpperCase() +
                      order.customer_name?.slice(1) || "Loading..."}
                  </h4>
                  <p className="text-sm text-gray-600">
                    Order Status:{" "}
                    {order.order_status?.charAt(0).toUpperCase() +
                      order.order_status?.slice(1)}
                  </p>
                  <p className="text-sm text-gray-600">Services:</p>
                  <ul className="list-disc pl-5">
                    {order.services?.map((service: any, idx: number) => (
                      <li key={idx}>{service}</li>
                    )) || <li>No services listed</li>}
                  </ul>

                  <p className="text-sm text-gray-600">
                    Payment Method:{" "}
                    {order.payment_method?.charAt(0).toUpperCase() +
                      order.payment_method?.slice(1)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Machine:{" "}
                    {order.machine_id?.charAt(0).toUpperCase() +
                      order.machine_id?.slice(1)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Machine Type:{" "}
                    {order.type
                      ? order.type.charAt(0).toUpperCase() + order.type.slice(1)
                      : "Unknown"}
                  </p>
                  <p className="text-sm text-gray-600">
                    Schedule:{" "}
                    {order.date
                      ? new Date(order.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "N/A"}{" "}
                    {order.time_range && order.time_range[0]
                      ? `(${order.time_range[0]?.start} - ${order.time_range[0]?.end})`
                      : ""}
                  </p>
                  <p className="text-sm text-gray-600">
                    Date Completed:{" "}
                    {order.date_completed
                      ? new Date(order.date_completed).toLocaleString()
                      : "Pending"}
                  </p>
                  <p className="text-sm text-gray-600">
                    Total Weight:{" "}
                    {order.total_weight
                      ? `${order.total_weight} kg`
                      : "Pending"}
                  </p>
                  <p className="text-sm text-gray-600">
                    Total Price:{" "}
                    {order.total_price
                      ? `₱${order.total_price.toFixed(2)}`
                      : "Pending"}
                  </p>
                  <p className="text-sm text-gray-600">
                    Notes: {order.notes || "No notes added"}
                  </p>

                  {/* Edit Button */}
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
                        {/* ... edit form inputs ... */}
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
                                  total_weight: parseFloat(e.target.value) || 0, // Ensure number
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
                                  total_price: parseFloat(e.target.value) || 0, // Ensure number
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

                  {/* Action Buttons */}
                  <div className="mt-4 flex space-x-4">
                    {/* ... action buttons ... */}
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
                      <button
                        onClick={() =>
                          handleMoveToNextStage(order._id, "in progress")
                        }
                        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                      >
                        Move to Ongoing
                      </button>
                    )}
                    {order.order_status === "in progress" && (
                      <button
                        onClick={() =>
                          handleMoveToNextStage(order._id, "completed")
                        }
                        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                      >
                        Move to Completed
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            !loading &&
            !error && (
              <p className="text-gray-500 text-center">
                No orders found for the selected status.
              </p>
            )
          )}
        </div>
      </div>
    </div>
  );
}
