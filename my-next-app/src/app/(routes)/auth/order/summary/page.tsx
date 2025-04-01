"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function OrderSummary() {
  const searchParams = useSearchParams();
  const order_id = searchParams.get("order_id"); // Get order_id from query params

  interface ClothingItem {
    type: string;
    quantity: number;
  }

  interface OrderDetails {
    date: string;
    shop_name: string;
    services: string[];
    clothing: ClothingItem[] | undefined; // Allow clothing to be undefined
    total: string | null;
    order_status: string;
    payment_status: string;
    payment_method: string;
    pickup_address: string;
    delivery_instructions: string;
  }

  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const response = await fetch(`/api/orders/${order_id}`); // Fetch order details from backend
        if (!response.ok) {
          throw new Error("Failed to fetch order details");
        }
        const data = await response.json();
        setOrderDetails(data);
      } catch (error) {
        console.error("Error fetching order details:", error);
      }
    };

    if (order_id) {
      fetchOrderDetails();
    }
  }, [order_id]);

  if (!orderDetails) {
    return <div>Loading...</div>;
  }

  const {
    date,
    shop_name,
    services,
    clothing = [], // Default to an empty array if clothing is undefined
    total,
    order_status,
    payment_status,
    payment_method,
    pickup_address,
    delivery_instructions,
  } = orderDetails;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="max-w-3xl w-full bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Order Summary</h2>
        <div className="space-y-4">
          <p>
            <strong>Order ID:</strong> {order_id}
          </p>
          <p>
            <strong>Date:</strong> {date}
          </p>
          <p>
            <strong>Shop Name:</strong> {shop_name}
          </p>
          <p>
            <strong>Services:</strong> {services.join(", ")}
          </p>
          <p>
            <strong>Clothes:</strong>
          </p>
          <ul className="list-disc pl-6">
            {clothing
              .filter((item) => item.quantity > 0) // Only show clothes with quantity > 0
              .map((item, index) => (
                <li key={index}>
                  {item.type}: {item.quantity}
                </li>
              ))}
          </ul>
          <p>
            <strong>Total:</strong> {total || "To be calculated"}
          </p>
          <p>
            <strong>Order Status:</strong> {order_status}
          </p>
          <p>
            <strong>Payment Status:</strong> {payment_status}
          </p>
          <p>
            <strong>Payment Method:</strong> {payment_method}
          </p>
          <p>
            <strong>Pickup Address:</strong> {pickup_address}
          </p>
          <p>
            <strong>Delivery Instructions:</strong> {delivery_instructions}
          </p>
        </div>
      </div>
    </div>
  );
}
