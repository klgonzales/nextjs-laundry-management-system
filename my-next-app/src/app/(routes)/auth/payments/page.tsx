"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";

interface Order {
  _id: string;
  customer_id: string;
  date: string;
  total: number;
  order_status: string;
  shop_name?: string; // Optional, will be fetched
  shop_type?: string; // Optional, will be fetched
  shop: string; // shop_id
  payment_status: string; // Added payment_status
}

export default function Payments() {
  const { user } = useAuth(); // Get the current user from useAuth
  const [orders, setOrders] = useState<Order[]>([]); // State to store orders
  const [loading, setLoading] = useState(true); // State to track loading

  useEffect(() => {
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

        console.log("Fetched orders:", data); // Debug the API response

        // Fetch shop details for each order
        const ordersWithShopDetails = await Promise.all(
          data
            .filter(
              (order: Order) =>
                order.customer_id === user.customer_id &&
                order.order_status.toLowerCase() === "pending" // Filter orders by customer_id and pending payment
            )
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
                  shop_name: shopData.shop.name, // Add shop name
                  shop_type: shopData.shop.type, // Add shop type
                };
              } catch (error) {
                console.error(
                  `Error fetching shop details for shop_id: ${order.shop}`,
                  error
                );
                return { ...order, shop_name: "Unknown", shop_type: "Unknown" }; // Fallback values
              }
            })
        );

        setOrders(ordersWithShopDetails); // Update orders with shop details
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user?.customer_id]);

  if (loading) {
    return <p className="text-center text-gray-500">Loading payments...</p>;
  }

  return (
    <div className="mt-8 bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Payments
        </h3>
      </div>
      <div className="border-t border-gray-200">
        {orders.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {orders.map((order) => (
              <li key={order._id} className="px-4 py-5 sm:p-6">
                <p>
                  <strong>Order ID:</strong> {order._id}
                </p>
                <p>
                  <strong>Shop Name:</strong>{" "}
                  {order.shop_name
                    ?.split(" ")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ")}
                </p>
                <p>
                  <strong>Shop Type:</strong>{" "}
                  {order.shop_type
                    ?.split(" ")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ")}
                </p>
                <p>
                  <strong>Date:</strong> {new Date(order.date).toLocaleString()}
                </p>
                <p>
                  <strong>Total:</strong> ${order.total.toFixed(2)}
                </p>
                <p>
                  <strong>Payment Status:</strong>{" "}
                  {order.payment_status.charAt(0).toUpperCase() +
                    order.payment_status.slice(1)}
                </p>
                <p>
                  <strong>Order Status:</strong>{" "}
                  {order.order_status.charAt(0).toUpperCase() +
                    order.order_status.slice(1)}
                </p>
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
