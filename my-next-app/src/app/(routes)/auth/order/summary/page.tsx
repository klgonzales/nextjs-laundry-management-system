"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Home from "@/app/components/common/Home";

export default function OrderSummary() {
  const router = useRouter(); // Initialize the router
  const searchParams = useSearchParams();
  const order_id = searchParams.get("order_id"); // Get order_id from query params

  interface clothesItem {
    type: string;
    quantity: number;
  }

  interface OrderDetails {
    date: string;
    shop_name: string;
    services: string[];
    clothes: clothesItem[] | undefined; // Allow clothes to be undefined
    total: string | null;
    order_status: string;
    payment_status: string;
    payment_method: string;
    pickup_address: string;
    delivery_instructions: string;
    shop: string;
    address: string;
  }

  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [shopName, setShopName] = useState<string | null>(null); // State for shop name
  const [customerAddress, setCustomerAddress] = useState<string | null>(null); // State for customer address

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const response = await fetch(`/api/orders/${order_id}`); // Fetch order details from backend
        if (!response.ok) {
          throw new Error("Failed to fetch order details");
        }
        const data = await response.json();
        setOrderDetails(data);

        // Fetch the shop name using the shop ID
        const shopResponse = await fetch(`/api/shops/${data.shop}`);
        if (!shopResponse.ok) {
          throw new Error("Failed to fetch shop details");
        }
        const shopData = await shopResponse.json();
        setShopName(shopData.shop.name); // Set the shop name

        // Fetch the customer address using the customer_id
        const customerResponse = await fetch(
          `/api/customers/${data.customer_id}`
        );
        if (!customerResponse.ok) {
          throw new Error("Failed to fetch customer details");
        }
        const customerData = await customerResponse.json();
        console.log(customerData);

        setCustomerAddress(customerData.customer.address); // Set the customer address
      } catch (error) {
        console.error(
          "Error fetching order, shop, or customer details:",
          error
        );
      }
    };

    if (order_id) {
      fetchOrderDetails();
    }
  }, [order_id]);

  useEffect(() => {
    console.log("Updated Shop Name:", shopName); // Log the updated shop name
    console.log("Updated Customer Address:", customerAddress); // Log the updated customer address
  }, [shopName, customerAddress]);

  if (!orderDetails) {
    return <div>Loading...</div>;
  }

  const {
    date,
    services,
    clothes = [], // Default to an empty array if clothes is undefined
    total,
    order_status,
    payment_status,
    payment_method,
    delivery_instructions,
  } = orderDetails;

  const formattedDate = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    timeZoneName: "short",
  }).format(new Date(date));

  console.log(payment_method);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="max-w-3xl w-full bg-white shadow rounded-lg p-6">
        <Home href="/auth/confirmation" />
        <h2 className="text-2xl font-bold mb-4">Order Summary</h2>
        <div className="space-y-4">
          <p>
            <strong>Order ID:</strong> {order_id}
          </p>
          <p>
            <strong>Date:</strong> {formattedDate}
          </p>
          <p>
            <strong>Shop Name:</strong> {shopName ? shopName : "Loading..."}
          </p>
          <p>
            <strong>Services:</strong> {services.join(", ")}
          </p>
          <p>
            <strong>Clothes:</strong>
          </p>
          <ul className="list-disc pl-6">
            {clothes
              .filter((item) => item.quantity > 0) // Only show clothes with quantity > 0
              .map((item, index) => (
                <li key={index}>
                  {item.type.charAt(0).toUpperCase() + item.type.slice(1)}:{" "}
                  {item.quantity}
                </li>
              ))}
          </ul>
          <p>
            <strong>Total:</strong> {total || "To be calculated"}
          </p>
          <p>
            <strong>Order Status:</strong>{" "}
            {order_status.charAt(0).toUpperCase() + order_status.slice(1)}
          </p>
          <p>
            <strong>Payment Status:</strong>{" "}
            {payment_status.charAt(0).toUpperCase() + payment_status.slice(1)}
          </p>
          <p>
            <strong>Payment Method:</strong>{" "}
            {payment_method.charAt(0).toUpperCase() + payment_method.slice(1)}
          </p>
          <p>
            <strong>Pickup Address:</strong>{" "}
            {customerAddress
              ? customerAddress.charAt(0).toUpperCase() +
                customerAddress.slice(1)
              : "Loading..."}
          </p>
          <p>
            <strong>Delivery Instructions:</strong> {delivery_instructions}
          </p>
          <div className="mt-6">
            <button
              onClick={() => router.push("/auth/dashboard")} // Navigate to /auth/dashboard
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
            >
              Go back home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
