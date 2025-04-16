"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";

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
}

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [feedbackOrderId, setFeedbackOrderId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState({
    rating: 5,
    comments: "",
  });

  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(
    null
  );

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user?.customer_id) {
        console.error("No customer_id found");
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

  if (loading) {
    return <p className="text-center text-gray-500">Loading orders...</p>;
  }

  return (
    <div className="mt-8 bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Orders</h3>
      </div>
      <div className="border-t border-gray-200">
        {orders.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {orders.map((order) => (
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
                                  {new Date(fb.date_submitted).toLocaleString()}
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
