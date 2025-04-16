import { useAuth } from "@/app/context/AuthContext";
import { useState, useEffect } from "react";

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState(user?.shops?.[0]?.orders || []); // Get orders from the first shop
  const [orderDetails, setOrderDetails] = useState<any[]>([]); // Store detailed order data
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]); // Store filtered orders
  const [filterStatus, setFilterStatus] = useState<string>("all"); // Track the selected filter

  const [editOrderId, setEditOrderId] = useState<string | null>(null); // Track the order being edited
  const [editDetails, setEditDetails] = useState({
    total_weight: 0,
    total_price: 0,
    notes: "",
  });

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
      const updatedOrder = await response.json();
      setOrderDetails((prev) =>
        prev.map((order) =>
          order._id === editOrderId
            ? { ...order, ...editDetails } // Update the order in the state
            : order
        )
      );

      setEditOrderId(null); // Close the edit form
    } catch (error) {
      console.error("Error updating order details:", error);
    }
  };

  const [ongoingSubcategory, setOngoingSubcategory] = useState<string>(""); // Track the selected subcategory for ongoing

  useEffect(() => {
    const fetchOrderDetails = async () => {
      const detailedOrders = await Promise.all(
        orders.map(async (order: any) => {
          try {
            // Fetch customer details
            const customerResponse = await fetch(
              `/api/customers/${order.customer_id}`
            );
            const customerData = await customerResponse.json();

            // Fetch shop details
            const shopResponse = await fetch(`/api/shops/${order.shop}`);
            const shopData = await shopResponse.json();

            return {
              ...order,
              customer_name: customerData?.customer?.name || "Unknown Customer",
              shop_name: shopData?.shop?.name || "Unknown Shop",
              shop_type: shopData?.shop?.type || "Unknown Type",
              delivery_fee: shopData?.shop?.delivery_fee || false,
            };
          } catch (error) {
            console.error("Error fetching order details:", error);
            return {
              ...order,
              customer_name: "Error",
              shop_name: "Error",
              shop_type: "Error",
            };
          }
        })
      );
      setOrderDetails(detailedOrders);
    };

    fetchOrderDetails();
  }, [orders]);

  // Filter orders based on the selected status
  useEffect(() => {
    if (filterStatus === "all") {
      setFilteredOrders(orderDetails);
    } else {
      setFilteredOrders(
        orderDetails.filter((order) => order.order_status === filterStatus)
      );
    }
  }, [filterStatus, orderDetails]);

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

  return (
    <div className="mt-8 bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Orders</h3>
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
            <p className="text-gray-500 text-center">
              No orders found for the selected status
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
