"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext"; // Import useAuth
import Sidebar from "../../../../components/common/Sidebar";
import Header from "../../../../components/common/Header";

import Orders from "../orders/page";
import Services from "../services/page";
import Machines from "../machines/page";
import Feedback from "../feedback/page";
import Payments from "../payments/page";
import Analytics from "../analytics/page";

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth(); // Get the logged-in admin's data
  const [orders, setOrders] = useState(user?.shops?.[0]?.orders || []); // Get orders from the first shop
  const [orderDetails, setOrderDetails] = useState<any[]>([]); // Store detailed order data

  // Create refs for each section
  const ordersRef = useRef<HTMLDivElement>(null);
  const servicesRef = useRef<HTMLDivElement>(null);
  const machinesRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const paymentsRef = useRef<HTMLDivElement>(null);
  const analyticsRef = useRef<HTMLDivElement>(null);

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

      // Calculate unique customers
      const uniqueCustomers = new Set(
        detailedOrders.map((order) => order.customer_id)
      );
      console.log("Total unique customers:", uniqueCustomers.size);
    };

    fetchOrderDetails();
  }, [orders]);

  const handleScroll = (section: string) => {
    switch (section) {
      case "orders":
        ordersRef.current?.scrollIntoView({ behavior: "smooth" });
        break;
      case "services":
        servicesRef.current?.scrollIntoView({ behavior: "smooth" });
        break;
      case "machines":
        servicesRef.current?.scrollIntoView({ behavior: "smooth" });
        break;
      case "feedback":
        feedbackRef.current?.scrollIntoView({ behavior: "smooth" });
        break;
      case "payments":
        paymentsRef.current?.scrollIntoView({ behavior: "smooth" });
        break;
      case "analytics":
        analyticsRef.current?.scrollIntoView({ behavior: "smooth" });
        break;
      default:
        break;
    }
  };

  const handleLogout = () => {
    router.push("/admin/login");
  };

  console.log("Shop Type:", user?.shops?.[0]?.type); // Debugging
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <Sidebar
        userType="admin"
        handleScroll={handleScroll}
        shopType={user?.shops?.[0]?.type} // Pass the shop type dynamically
      />

      {/* Main Content */}
      <div className="flex-1">
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Header */}
          <Header userType="admin" />
          <div className="px-4 py-6 sm:px-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Total Customers */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                      <svg
                        className="h-6 w-6 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total Customers
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {
                            new Set(
                              orderDetails.map((order) => order.customer_id)
                            ).size
                          }
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Revenue */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                      <svg
                        className="h-6 w-6 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total Revenue
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {orderDetails
                            .filter(
                              (order) =>
                                order.order_status === "completed" &&
                                order.payment_status === "paid"
                            )
                            .reduce(
                              (total, order) =>
                                total + (order.total_price || 0),
                              0
                            )
                            .toFixed(2)}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Completed Orders */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                      <svg
                        className="h-6 w-6 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m2 0a2 2 0 100-4H7a2 2 0 100 4h10zm-2 0v6m0-6H9m0 0v6m0-6H7m10 0v6m0-6H9"
                        />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Completed Orders
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {
                            orderDetails.filter(
                              (order) => order.order_status === "completed"
                            ).length
                          }
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sections */}
            <div ref={ordersRef}>
              <Orders />
            </div>
            <div ref={servicesRef}>
              <Services />
            </div>
            <div ref={machinesRef}>
              <Machines />
            </div>
            <div ref={feedbackRef}>
              <Feedback />
            </div>
            <div ref={paymentsRef}>
              <Payments />
            </div>
            <div ref={analyticsRef}>
              <Analytics />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
