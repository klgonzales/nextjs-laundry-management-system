"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { usePusher } from "@/app/context/PusherContext";
import Sidebar from "../../../components/common/Sidebar";
import Header from "../../../components/common/Header";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { pusher, isConnected } = usePusher();
  const [orders, setOrders] = useState<any[]>([]);
  const [orderDetails, setOrderDetails] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Stats state variables
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [completedOrders, setCompletedOrders] = useState(0);

  // Calculate stats from orders
  const calculateStats = useCallback((orders: any[]) => {
    console.log(`[Layout] Calculating stats from ${orders.length} orders`);

    // Check if we have valid orders array
    if (!Array.isArray(orders) || orders.length === 0) {
      console.log("[Layout] No orders to calculate stats from");
      setTotalCustomers(0);
      setTotalRevenue(0);
      setCompletedOrders(0);
      return;
    }

    // Calculate unique customers
    const customerIds = orders
      .map((order) => order.customer_id)
      .filter(Boolean);
    const uniqueCustomers = new Set(customerIds);
    setTotalCustomers(uniqueCustomers.size);

    // Calculate total revenue from completed and paid orders
    const paidOrders = orders.filter((order) => {
      return (
        order.order_status === "completed" && order.payment_status === "paid"
      );
    });

    const revenue = paidOrders.reduce((total, order) => {
      const orderTotal =
        typeof order.total_price === "number"
          ? order.total_price
          : parseFloat(order.total_price) || 0;
      return total + orderTotal;
    }, 0);

    setTotalRevenue(revenue);

    // Count completed orders
    const completed = orders.filter(
      (order) => order.order_status === "completed"
    ).length;
    setCompletedOrders(completed);
  }, []);

  // Fetch order data
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!user?.shops?.[0]?.shop_id) {
        console.log("[Layout] No shop ID available");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const shopId = user.shops[0].shop_id;
        console.log(`[Layout] Fetching orders for shop: ${shopId}`);

        const response = await fetch(`/api/shops/${shopId}/orders`);
        if (!response.ok) {
          throw new Error("Failed to fetch shop orders");
        }

        const ordersData = await response.json();
        setOrders(ordersData);

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
              console.error("Error fetching order details:", error);
              return { ...order, customer_name: "Error" };
            }
          })
        );

        setOrderDetails(detailedOrders);
        calculateStats(detailedOrders);
        setIsLoading(false);
      } catch (error) {
        console.error("[Layout] Error fetching order data:", error);
        setIsLoading(false);
      }
    };

    if (user?.shops?.[0]?.shop_id) {
      fetchOrderDetails();
    } else {
      setIsLoading(false);
    }
  }, [user?.shops, calculateStats]);

  // Set up Pusher for real-time updates
  useEffect(() => {
    if (
      !pusher ||
      !isConnected ||
      !user?.admin_id ||
      !user?.shops?.[0]?.shop_id
    ) {
      return;
    }

    const shopId = user.shops[0].shop_id;
    const channelName = `private-admin-${user.admin_id}`;

    try {
      const channel = pusher.subscribe(channelName);

      // Handle new order
      channel.bind("new-order", (data: any) => {
        if (data.shop_id === shopId) {
          setOrderDetails((prevOrders) => {
            const updatedOrders = [
              ...prevOrders,
              {
                ...data,
                customer_name: data.customer_name || "New Customer",
              },
            ];
            calculateStats(updatedOrders);
            return updatedOrders;
          });
        }
      });

      // Handle order updates
      channel.bind("order-update", (data: any) => {
        if (data.shop_id === shopId) {
          setOrderDetails((prevOrders) => {
            const updatedOrders = prevOrders.map((order) =>
              order._id === data._id ? { ...order, ...data } : order
            );
            calculateStats(updatedOrders);
            return updatedOrders;
          });
        }
      });

      // Handle payment updates
      channel.bind("payment-update", (data: any) => {
        if (data.shop_id === shopId) {
          setOrderDetails((prevOrders) => {
            const updatedOrders = prevOrders.map((order) =>
              order._id === data.order_id
                ? {
                    ...order,
                    payment_status: data.status,
                  }
                : order
            );
            calculateStats(updatedOrders);
            return updatedOrders;
          });
        }
      });

      return () => {
        pusher.unsubscribe(channelName);
      };
    } catch (error) {
      console.error("[Layout] Error setting up Pusher:", error);
    }
  }, [pusher, isConnected, user?.admin_id, user?.shops, calculateStats]);

  const handleScroll = (section: string) => {
    switch (section) {
      case "home":
        router.push("/admin/shop-self-service/dashboard");
        break;
      case "orders":
        router.push("/admin/shop-self-service/orders");
        break;
      case "services":
        router.push("/admin/shop-self-service/services");
        break;
      case "machines":
        router.push("/admin/shop-self-service/machines");
        break;
      case "feedback":
        router.push("/admin/shop-self-service/feedback");
        break;
      case "payments":
        router.push("/admin/shop-self-service/payments");
        break;
      case "analytics":
        router.push("/admin/shop-self-service/analytics");
        break;
      default:
        break;
    }
  };

  return (
    <div className="flex">
      {/* Sidebar */}
      <div className="flex">
        <Sidebar
          userType="admin"
          handleScroll={handleScroll}
          shopType={user?.shops?.[0]?.type}
          activePath={pathname || undefined}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1">
        <main className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          {/* Header */}
          <Header userType="admin" />
          <div className="px-4 py-6 sm:px-0">
            {/* Stats Cards - Always visible */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {/* Total Customers */}
              <div className="bg-[#F8F3EA] overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-[#F386C7] rounded-md p-3">
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
                          {isLoading ? (
                            <div className="h-6 w-12 bg-gray-200 rounded animate-pulse"></div>
                          ) : (
                            totalCustomers
                          )}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Total Revenue */}
              <div className="bg-[#F8F3EA] overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-[#F386C7] rounded-md p-3">
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
                          {isLoading ? (
                            <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
                          ) : (
                            `₱${totalRevenue.toFixed(2)}`
                          )}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Completed Orders */}
              <div className="bg-[#F8F3EA] overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-[#F386C7] rounded-md p-3">
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
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Completed Orders
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {isLoading ? (
                            <div className="h-6 w-10 bg-gray-200 rounded animate-pulse"></div>
                          ) : (
                            completedOrders
                          )}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Page Content - Dynamic based on route */}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
