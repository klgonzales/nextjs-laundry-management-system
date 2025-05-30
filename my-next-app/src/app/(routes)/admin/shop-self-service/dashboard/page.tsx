"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { useState, useEffect } from "react";

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [orderDetails, setOrderDetails] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!user?.shops?.[0]?.shop_id) {
        setIsLoading(false);
        return;
      }

      try {
        const shopId = user.shops[0].shop_id;
        const response = await fetch(`/api/shops/${shopId}/orders`);
        if (!response.ok) {
          throw new Error("Failed to fetch shop orders");
        }

        const ordersData = await response.json();

        // Process orders to get additional details
        const detailedOrders = await Promise.all(
          ordersData.map(async (order: any) => {
            try {
              // Fetch customer details
              const customerResponse = await fetch(
                `/api/customers/${order.customer_id}`
              );
              const customerData = await customerResponse.json();

              return {
                ...order,
                customer_name:
                  customerData?.customer?.name || "Unknown Customer",
              };
            } catch (error) {
              return { ...order, customer_name: "Error" };
            }
          })
        );

        setOrderDetails(detailedOrders);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching order data:", error);
        setIsLoading(false);
      }
    };

    fetchOrderDetails();
  }, [user?.shops]);

  return (
    <>
      {/* Dashboard Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Orders Card */}
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center bg-[#E2E5F4]">
            <h3 className="text-lg font-medium text-gray-900">Recent Orders</h3>
            <button
              onClick={() => router.push("/admin/shop-self-service/orders")}
              className="text-sm font-medium text-[#F386C7] hover:text-[#E75DB1]"
            >
              View all
            </button>
          </div>
          <div className="px-4 py-4 sm:px-6">
            {isLoading ? (
              // Skeleton loading UI for orders
              <div className="animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="py-3 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex justify-between mb-2">
                      <div className="h-5 w-32 bg-gray-200 rounded"></div>
                      <div className="h-5 w-20 bg-gray-200 rounded-full"></div>
                    </div>
                    <div className="flex justify-between">
                      <div className="h-4 w-24 bg-gray-200 rounded"></div>
                      <div className="h-4 w-16 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : orderDetails.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {orderDetails.slice(0, 3).map((order, index) => (
                  <li key={index} className="py-3">
                    <div className="flex justify-between">
                      <div className="text-sm text-gray-900 font-medium">
                        {order.customer_name}
                      </div>
                      <div
                        className={`text-xs px-2 py-1 rounded-full ${
                          order.order_status === "completed"
                            ? "bg-green-100 text-green-800"
                            : order.order_status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {order.order_status}
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>
                        {" "}
                        Order Date Placed:
                        {order.date_placed
                          ? new Date(order.date_placed).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }
                            )
                          : "No date available"}
                      </span>
                      <span>₱{order.total_price}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-4 text-gray-500">
                No orders yet
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats Card */}
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-[#E2E5F4]">
            <h3 className="text-lg font-medium text-gray-900">Shop Status</h3>
          </div>
          <div className="px-4 py-4 sm:px-6">
            {isLoading ? (
              <div className="animate-pulse grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="sm:col-span-1">
                    <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                    <div className="h-6 w-12 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">
                    Active Machines
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-gray-900">
                    {user?.shops?.[0]?.machines?.length || 0}
                  </dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">
                    Available Services
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-gray-900">
                    {user?.shops?.[0]?.services?.length || 0}
                  </dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">
                    Pending Orders
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-gray-900">
                    {orderDetails.filter((o) => o.order_status === "pending")
                      .length || 0}
                  </dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">
                    In Progress
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-gray-900">
                    {orderDetails.filter(
                      (o) => o.order_status === "in progress"
                    ).length || 0}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
