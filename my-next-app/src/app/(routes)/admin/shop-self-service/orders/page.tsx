import { useAuth } from "@/app/context/AuthContext";
import { useState, useEffect } from "react";

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState(user?.shops?.[0]?.orders || []); // Get orders from the first shop
  const [orderDetails, setOrderDetails] = useState<any[]>([]); // Store detailed order data
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]); // Store filtered orders
  const [filterStatus, setFilterStatus] = useState<string>("all"); // Track the selected filter

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
            onClick={() => setFilterStatus("ongoing")}
            className={`px-4 py-2 rounded ${
              filterStatus === "ongoing"
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
                  <p className="text-sm text-gray-600">Clothes:</p>
                  <ul className="list-disc pl-5">
                    {order.clothes
                      .filter((clothing: any) => clothing.quantity > 0)
                      .map((clothing: any, idx: number) => (
                        <li key={idx}>
                          {clothing.type} - Quantity: {clothing.quantity}
                        </li>
                      ))}
                  </ul>
                  <p className="text-sm text-gray-600">
                    Payment Method:{" "}
                    {order.payment_method.charAt(0).toUpperCase() +
                      order.payment_method.slice(1)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Address:{" "}
                    {order.address.charAt(0).toUpperCase() +
                      order.address.slice(1)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Pickup Date:{" "}
                    {new Date(order.pickup_date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-sm text-gray-600">
                    Pickup Time: {order.pickup_time}
                  </p>
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
