"use client";

import { useEffect, useState, useRef } from "react"; // Import useRef
import { useAuth } from "@/app/context/AuthContext";
import { useSocket } from "@/app/context/SocketContext"; // Import useSocket

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
  shop_id?: string;
  shop: string;
  date_completed: string;
  feedbacks?: Feedback[];
  payment_status: string;
  order_type: string;
}

export default function Orders() {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket(); // Get socket from context
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderDetails, setOrderDetails] = useState<any[]>([]); // Store detailed order data
  const [filterType, setFilterType] = useState<string>("all"); // Track the selected type
  const [filterStatus, setFilterStatus] = useState<string>("all"); // Track the selected status

  const [loading, setLoading] = useState(true);

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

  //const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user?.customer_id) {
        console.log("No customer_id found");
        setLoading(false);
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
                  shop_id: shopData.shop.shop_id,
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

    fetchOrders();
  }, [user?.customer_id]);

  // --- Socket.IO Listener useEffect (using context socket) ---
  useEffect(() => {
    // Only attach listener if the socket from context exists and is connected
    if (socket && isConnected) {
      console.log(
        "[Orders Socket] Context socket connected. Attaching 'order_status_updated' listener."
      );

      const handleOrderStatusUpdate = (data: {
        orderId: string;
        newStatus: string;
        date_completed?: string; // Include if sent from backend
      }) => {
        // --- Keep ALL your existing detailed logging inside this handler ---
        console.log(">>> RAW EVENT RECEIVED: order_status_updated", data);
        console.log(
          "[Orders Socket] Event: order_status_updated received:",
          data
        );
        console.log(
          `[Orders Socket] Received orderId: ${data.orderId} (Type: ${typeof data.orderId})`
        );
        // --- End Log ---

        setOrders((prevOrders) => {
          console.log(
            "[Orders Socket] Updating state. Prev orders count:",
            prevOrders.length
          );
          let matchFound = false; // Flag to check if any order was updated

          const updatedOrders = prevOrders.map((order) => {
            // --- RIGOROUS ID CHECK ---
            const orderIdString = String(order._id); // Explicitly cast/convert
            const dataOrderIdString = String(data.orderId); // Explicitly cast/convert
            console.log(
              `[Orders Socket] Comparing: order._id="${orderIdString}" (Type: ${typeof orderIdString}) vs data.orderId="${dataOrderIdString}" (Type: ${typeof dataOrderIdString})`
            );
            // --- END RIGOROUS ID CHECK ---

            if (orderIdString === dataOrderIdString) {
              // Compare the strings
              matchFound = true; // Mark that we found a match
              console.log(
                `[Orders Socket] !!! MATCH FOUND !!! Updating order ${orderIdString} status to ${data.newStatus}`
              );
              return {
                ...order,
                order_status: data.newStatus,
                ...(data.date_completed && {
                  date_completed: data.date_completed,
                }),
              };
            } else {
              return order;
            }
          });

          // --- Check if any update actually happened ---
          if (!matchFound) {
            console.warn(
              "[Orders Socket] !!! NO MATCH FOUND during state update. Verify IDs. !!!"
            );
          } else if (
            JSON.stringify(prevOrders) === JSON.stringify(updatedOrders)
          ) {
            console.warn(
              "[Orders Socket] !!! MATCH FOUND but state arrays are identical post-map. Possible mutation issue? !!!"
            );
          } else {
            console.log("[Orders Socket] State update resulted in changes.");
          }
          // --- End Check ---

          return updatedOrders;
        });
      };

      // Attach the listener to the socket from context
      socket.on("order_status_updated", handleOrderStatusUpdate);

      // Cleanup: Remove listener when component unmounts or socket/isConnected changes
      return () => {
        console.log(
          "[Orders Socket Cleanup] Removing 'order_status_updated' listener."
        );
        // Check if socket still exists before trying to remove listener
        if (socket) {
          socket.off("order_status_updated", handleOrderStatusUpdate);
        }
      };
    } else {
      // Log if the socket isn't ready when the effect runs
      console.log(
        "[Orders Socket] Context socket not ready or not connected, listener not attached."
      );
    }
    // Depend on the socket instance from context and its connected status
  }, [socket, isConnected]); // Re-run when socket instance or connection status changes
  // --- End Socket.IO useEffect ---

  const fetchFeedbacks = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/feedback`);
      if (!response.ok) console.log("Failed to fetch feedbacks");

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

    // Find the specific order to get its shop_id
    const order = orders.find((o) => o._id === orderId);
    if (!order) {
      console.error("Order not found locally to get shop_id");
      return; // Prevent submission if order isn't found
    }

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
          shop_id: order.shop_id,
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

  const filteredOrders = orders.filter((order) => {
    const typeMatch =
      filterType === "all" ||
      order.order_type?.toLowerCase() === filterType.toLowerCase();
    const statusMatch =
      filterStatus === "all" ||
      order.order_status.toLowerCase() === filterStatus.toLowerCase();

    return typeMatch && statusMatch;
  });

  if (loading) {
    return <p className="text-center text-gray-500">Loading orders...</p>;
  }

  return (
    <div className="mt-8 bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Orders</h3>
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
                  <strong>Shop Name:</strong> {order.shop_name}
                </p>
                <p>
                  <strong>Shop Type:</strong> {order.shop_type}
                </p>
                <p>
                  <strong>Date:</strong> {new Date(order.date).toLocaleString()}
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
          <div className="px-4 py-5 sm:p-6">
            <p className="text-gray-500 text-center">No recent orders</p>
          </div>
        )}
      </div>
    </div>
  );
}
