"use client";

// Add these imports
import { usePusher } from "@/app/context/PusherContext";
import { useState, useEffect, useRef, useCallback } from "react";
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
  const { pusher, isConnected } = usePusher();
  const { user } = useAuth(); // Get the logged-in admin's data
  const [orders, setOrders] = useState(user?.shops?.[0]?.orders || []); // Get orders from the first shop
  const [orderDetails, setOrderDetails] = useState<any[]>([]); // Store detailed order data

  // Stats state variables for real-time updates
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [completedOrders, setCompletedOrders] = useState(0);

  // Create refs for each section
  const ordersRef = useRef<HTMLDivElement>(null);
  const servicesRef = useRef<HTMLDivElement>(null);
  const machinesRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const paymentsRef = useRef<HTMLDivElement>(null);
  const analyticsRef = useRef<HTMLDivElement>(null);

  // Update the calculateStats function
  const calculateStats = useCallback((orders: any[]) => {
    console.log(`[Dashboard] Calculating stats from ${orders.length} orders`);

    // Check if we have valid orders array
    if (!Array.isArray(orders) || orders.length === 0) {
      console.log("[Dashboard] No orders to calculate stats from");
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
    console.log(`[Dashboard] Found ${uniqueCustomers.size} unique customers`);

    // Calculate total revenue from completed and paid orders
    const paidOrders = orders.filter((order) => {
      // Check both status fields exist
      const isCompleted = order.order_status === "completed";
      const isPaid = order.payment_status === "paid";
      return isCompleted && isPaid;
    });

    console.log(`[Dashboard] Found ${paidOrders.length} completed/paid orders`);

    const revenue = paidOrders.reduce((total, order) => {
      // Ensure total_price is a valid number
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

    console.log("[Dashboard] Stats calculated:", {
      totalCustomers: uniqueCustomers.size,
      totalRevenue: revenue,
      completedOrders: completed,
    });

    // Debug: Show the first few orders to check their structure
    console.log("[Dashboard] Sample order data:", orders.slice(0, 2));
  }, []);

  // Fix the fetchOrderDetails function
  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!user?.shops?.[0]?.shop_id) {
        console.log("[Dashboard] No shop ID available");
        return;
      }

      try {
        const shopId = user.shops[0].shop_id;
        console.log(`[Dashboard] Fetching orders for shop: ${shopId}`);

        // First fetch all orders for this shop
        const response = await fetch(`/api/shops/${shopId}/orders`);
        if (!response.ok) {
          throw new Error("Failed to fetch shop orders");
        }

        // The response is an array directly, not nested under an 'orders' property
        const ordersData = await response.json();
        console.log(
          `[Dashboard] Fetched ${ordersData.length} orders:`,
          ordersData
        );

        // Update local orders state with the array
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

        console.log(
          `[Dashboard] Processed ${detailedOrders.length} detailed orders`
        );
        setOrderDetails(detailedOrders);

        // Calculate stats from the detailed orders
        calculateStats(detailedOrders);
      } catch (error) {
        console.error("[Dashboard] Error fetching order data:", error);
      }
    };
    // Actually call the function!
    if (user?.shops?.[0]?.shop_id) {
      fetchOrderDetails();
    }
  }, [user?.shops, calculateStats]); // Add calculateStats as a dependency

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

  // Set up Pusher for real-time updates
  useEffect(() => {
    if (
      !pusher ||
      !isConnected ||
      !user?.admin_id ||
      !user?.shops?.[0]?.shop_id
    ) {
      console.log("[Dashboard] Pusher not ready or missing user/shop data");
      return;
    }

    const shopId = user.shops[0].shop_id;
    const channelName = `private-admin-${user.admin_id}`;
    console.log(`[Dashboard] Subscribing to channel: ${channelName}`);

    try {
      const channel = pusher.subscribe(channelName);

      // Handle new order
      channel.bind("new-order", (data: any) => {
        console.log("[Dashboard] New order received:", data);
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
        console.log("[Dashboard] Order update received:", data);
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
        console.log("[Dashboard] Payment update received:", data);
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

      // Handle customer updates
      channel.bind("customer-update", (data: any) => {
        console.log("[Dashboard] Customer update received:", data);
        setOrderDetails((prevOrders) => {
          const updatedOrders = prevOrders.map((order) =>
            order.customer_id === data.customer_id
              ? {
                  ...order,
                  customer_name: data.name || order.customer_name,
                }
              : order
          );
          calculateStats(updatedOrders);
          return updatedOrders;
        });
      });

      // Handle subscription events for debugging
      channel.bind("pusher:subscription_succeeded", () => {
        console.log(`[Dashboard] Successfully subscribed to ${channelName}`);
      });

      channel.bind("pusher:subscription_error", (error: any) => {
        console.error(
          `[Dashboard] Failed to subscribe to ${channelName}:`,
          error
        );
      });

      return () => {
        console.log(`[Dashboard] Unsubscribing from ${channelName}`);
        pusher.unsubscribe(channelName);
      };
    } catch (error) {
      console.error("[Dashboard] Error setting up Pusher:", error);
    }
  }, [pusher, isConnected, user?.admin_id, user?.shops, calculateStats]);
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
                          {totalCustomers}
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
                          {totalRevenue.toFixed(2)}
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
                          {completedOrders}
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
