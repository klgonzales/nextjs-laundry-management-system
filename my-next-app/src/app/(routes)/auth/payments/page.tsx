"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { usePusher } from "@/app/context/PusherContext";
import type { Channel } from "pusher-js";

interface Order {
  _id: string;
  customer_id: string;
  date: string;
  total_price: number;
  order_status: string;
  shop_name?: string;
  shop_type?: string;
  shop: string;
  payment_status: string;
  payment_method: string;
  date_placed: string;
}

export default function Payments() {
  const { user, isLoading: authLoading } = useAuth();
  const { pusher, isConnected } = usePusher();
  const channelRef = useRef<Channel | null>(null);
  const currentUserId = user?.customer_id;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderDetails, setOrderDetails] = useState<any[]>([]); // Store detailed order data
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null); // Track the selected order for payment
  const [paymentDetails, setPaymentDetails] = useState<any>({
    amount_sent: "",
    screenshot: "",
    reference_number: "",
    payment_method: "",
    payment_date: "",
    status: "paid",
    customer_id: "",
    order_id: "",
    shop_id: "",
    payment_id: "",
    amount_paid: "",
    paid_the_driver: false,
  });
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc"); // Default to newest first (descending)
  const [searchQuery, setSearchQuery] = useState("");

  // Update the sortOrdersByDate function to use the correct date field
  const sortOrdersByDate = useCallback(
    (orders: any[], direction: "asc" | "desc") => {
      return [...orders].sort((a, b) => {
        // Try to use date_placed first, then fall back to date
        const dateA = new Date(a.date_placed || a.date || 0).getTime();
        const dateB = new Date(b.date_placed || b.date || 0).getTime();
        return direction === "asc" ? dateA - dateB : dateB - dateA;
      });
    },
    []
  );

  useEffect(() => {
    // Check if auth is still loading
    if (authLoading) {
      console.log(
        "[Client Payments] Auth still loading, deferring data fetch."
      );
      return;
    }

    if (!user?.customer_id) {
      console.log(
        "[Client Payments] No customer_id found for the current user"
      );
      setLoading(false);
      setOrders([]);
      return;
    }
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

        const ordersWithShopDetails = await Promise.all(
          data
            .filter((order: Order) => order.customer_id === user.customer_id)
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
                  shop_name: shopData.shop.name,
                  shop_type: shopData.shop.type,
                };
              } catch (error) {
                console.error(
                  `Error fetching shop details for shop_id: ${order.shop}`,
                  error
                );
                return { ...order, shop_name: "Unknown", shop_type: "Unknown" };
              } finally {
                setLoading(false);
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

    // Key fix: Only call fetchOrders when auth is complete
    if (!authLoading) {
      fetchOrders();
    }
  }, [user?.customer_id, authLoading]);

  const handleSettlePayment = (order: Order) => {
    setSelectedOrderId(order._id);
    setPaymentDetails({
      ...paymentDetails,
      payment_method: order.payment_method,
      customer_id: order.customer_id,
      order_id: order._id,
      shop_id: order.shop,
      payment_id: Date.now().toString(), // Generate a unique payment ID
    });
  };

  // Add this effect for Pusher subscription
  useEffect(() => {
    if (!pusher || !isConnected || !currentUserId) {
      console.log(
        `[Client Payments] Skipping Pusher subscription: Missing prerequisites.`
      );
      return;
    }

    const channelName = `private-client-${currentUserId}`;
    console.log(`[Client Payments] Setting up subscription to ${channelName}`);

    // Clean up old subscription if it exists and is different
    if (channelRef.current && channelRef.current.name !== channelName) {
      console.log(
        `[Client Payments] Unsubscribing from old channel: ${channelRef.current.name}`
      );
      channelRef.current.unbind("update-payment-status");
      channelRef.current.unbind("update-order-status");
      pusher.unsubscribe(channelRef.current.name);
      channelRef.current = null;
    }

    // If we don't have a channel reference or it's not subscribed, create a new subscription
    if (!channelRef.current || !channelRef.current.subscribed) {
      console.log(`[Client Payments] Subscribing to ${channelName}`);
      const channel = pusher.subscribe(channelName);
      channelRef.current = channel;

      // Handle subscription events
      channel.bind("pusher:subscription_succeeded", () => {
        console.log(
          `[Client Payments] Successfully subscribed to ${channelName}`
        );
      });

      channel.bind("pusher:subscription_error", (status: any) => {
        console.error(
          `[Client Payments] Failed Pusher subscription to ${channelName}, status:`,
          status
        );
      });

      // Bind to update-order-status event
      console.log(
        `[Client Orders] Binding to update-order-status event on ${channelName}`
      );
      // In your client code, modify the update-order-status handler:
      channel.bind(
        "update-order-status",
        (data: { orderId: string; status: string; date_updated: string }) => {
          console.log(`[Client Orders] Received order status update:`, data);

          // Add logging to debug the status format
          console.log(`[Client Orders] Current orders:`, orders);

          // Update the order in state
          setOrders((prevOrders) => {
            const updatedOrders = prevOrders.map((order) => {
              if (order._id === data.orderId) {
                console.log(
                  `[Client Orders] Updating order ${order._id} from "${order.order_status}" to "${data.status}"`
                );
                return { ...order, order_status: data.status };
              }
              return order;
            });

            // Log the result to confirm update worked
            console.log(
              `[Client Orders] Order update result:`,
              updatedOrders.find((o) => o._id === data.orderId)?.order_status
            );

            return updatedOrders;
          });
        }
      );

      // Bind to update-payment-status event
      console.log(
        `[Client Payments] Binding to update-payment-status event on ${channelName}`
      );
      channel.bind(
        "update-payment-status",
        (data: {
          order_id: string;
          payment_status: string;
          date_updated?: string;
        }) => {
          console.log(
            `[Client Payments] Received payment status update:`,
            data
          );

          // Update the orders in state
          setOrders((prevOrders) => {
            const updatedOrders = prevOrders.map((order) => {
              if (order._id === data.order_id) {
                console.log(
                  `[Client Payments] Updating order ${order._id} payment status from "${order.payment_status}" to "${data.payment_status}"`
                );
                return { ...order, payment_status: data.payment_status };
              }
              return order;
            });

            return updatedOrders;
          });
        }
      );
    }

    // Cleanup function
    return () => {
      console.log(`[Client Payments] Cleaning up handlers for ${channelName}`);
      if (channelRef.current) {
        channelRef.current.unbind("update-payment-status");
        channelRef.current.unbind("update-order-status");
      }
    };
  }, [pusher, isConnected, currentUserId]);

  const handleSubmitPayment = async () => {
    try {
      const response = await fetch(
        `/api/orders/${selectedOrderId}/add-payment`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(paymentDetails),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to settle payment");
      }

      const updatedOrder = await response.json();

      // Update the local state
      setOrders((prevOrders) =>
        prevOrders.map((order) =>
          order._id === selectedOrderId
            ? { ...order, payment_status: "for review" }
            : order
        )
      );

      setSelectedOrderId(null); // Close the form
      try {
        const updateResponse = await fetch(
          `/api/orders/${selectedOrderId}/update-payment-status`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ newPaymentStatus: "for review" }),
          }
        );

        if (!updateResponse.ok) {
          throw new Error("Failed to update payment status");
        }

        console.log("Payment settled successfully!");
      } catch (error) {
        console.error("Error updating payment status:", error);
        console.log(
          "Payment was settled, but failed to update payment status."
        );
      }
    } catch (error) {
      console.error("Error settling payment:", error);
      console.log("Failed to settle payment. Please try again.");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await convertToBase64(file);
      setPaymentDetails({
        ...paymentDetails,
        screenshot: base64, // Save the Base64 string
      });
    }
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const [filterType, setFilterType] = useState<string>("all"); // Track the selected type
  const [filterStatus, setFilterStatus] = useState<string>("all"); // Track the selected status
  const typeOptions = [
    "all",
    "pending",
    "for review",
    "paid",
    "cancelled",
    "failed",
  ];

  // Add this function to handle search, right before your return statement
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  // Update your filter effect to include sorting
  useEffect(() => {
    // First, filter by search query if there is one
    let searchFiltered = orderDetails;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      searchFiltered = orderDetails.filter(
        (order) =>
          order.shop_name && order.shop_name.toLowerCase().includes(query)
      );
    }
    // Ensure no JSX is returned
  }, [orderDetails, searchQuery]);

  // Replace your existing filteredOrders definition with this useEffect
  useEffect(() => {
    // First apply type and status filters
    let filtered = orders.filter((order) => {
      const typeMatch =
        filterType === "all" ||
        order.payment_status?.toLowerCase() === filterType.toLowerCase();
      const statusMatch =
        filterStatus === "all" ||
        order.order_status.toLowerCase() === filterStatus.toLowerCase();

      return typeMatch && statusMatch;
    });

    // Then apply search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((order) =>
        order.shop_name?.toLowerCase().includes(query)
      );
    }

    // Finally sort the results
    const sorted = sortOrdersByDate(filtered, sortDirection);

    // Update state with filtered and sorted orders
    setFilteredOrders(sorted);
  }, [
    orders,
    filterType,
    filterStatus,
    searchQuery,
    sortDirection,
    sortOrdersByDate,
  ]);

  // Also add this new state at the top with your other state variables
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);

  if (loading) {
    return <p className="text-center text-gray-500">Loading payments...</p>;
  }

  return (
    <div className="mt-8 bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Orders
          </h3>

          <div className="mt-2 sm:mt-0 flex items-center ml-4">
            <span className="text-sm text-gray-600 mr-2">Sort by date:</span>
            <div className="flex space-x-2">
              <button
                onClick={() => setSortDirection("asc")}
                className={`px-3 py-1 rounded text-xs font-medium ${
                  sortDirection === "asc"
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                <div className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                    />
                  </svg>
                  Oldest First
                </div>
              </button>
              <button
                onClick={() => setSortDirection("desc")}
                className={`px-3 py-1 rounded text-xs font-medium ${
                  sortDirection === "desc"
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                <div className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"
                    />
                  </svg>
                  Newest First
                </div>
              </button>
            </div>
          </div>
          <div className="mt-2 sm:mt-0 relative rounded-md shadow-sm">
            <input
              type="text"
              placeholder="Search by customer name..."
              value={searchQuery}
              onChange={handleSearch}
              className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            {/* Clear button - only visible when there's text */}
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                aria-label="Clear search"
              >
                <svg
                  className="h-4 w-4 text-gray-400 hover:text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
        {searchQuery && (
          <div className="mt-2 text-sm text-gray-500 flex items-center">
            <svg
              className="mr-1 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Found {filteredOrders.length}{" "}
            {filteredOrders.length === 1 ? "result" : "results"} for "
            {searchQuery}"
          </div>
        )}
      </div>

      <div className="px-4 py-2 flex gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setFilterStatus("all"); // Reset status when type changes
            }}
            className="border border-gray-300 rounded px-3 py-2"
          >
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border-t border-gray-200">
        {orders.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {filteredOrders.map((order) => (
              <li key={order._id} className="px-4 py-5 sm:p-6">
                <p>
                  <strong>Order ID:</strong> {order._id}
                </p>
                <p>
                  <strong>Date Placed:</strong>{" "}
                  {order.date_placed
                    ? new Date(order.date_placed).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Unknown"}
                </p>
                <p>
                  <strong>Shop Name:</strong> {order.shop_name}
                </p>
                <p>
                  <strong>Total Price:</strong> {order.total_price || "Pending"}
                </p>
                <p>
                  <strong>Order Status:</strong> {order.order_status}
                </p>
                <p>
                  <strong>Payment Status:</strong> {order.payment_status}
                </p>
                <p>
                  <strong>Payment Method:</strong> {order.payment_method}
                </p>
                {(order.payment_status.toLowerCase() === "pending" ||
                  order.payment_status.toLowerCase() === "failed") &&
                  order.order_status === "completed" && (
                    <button
                      onClick={() => handleSettlePayment(order)}
                      className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      Settle Payment
                    </button>
                  )}

                {/* Inline Payment Form */}
                {selectedOrderId === order._id && (
                  <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                    <h4 className="text-lg font-semibold text-gray-800">
                      Settle Payment
                    </h4>
                    <form className="mt-4 space-y-4">
                      {(paymentDetails.payment_method === "gcash" ||
                        paymentDetails.payment_method === "bank transfer" ||
                        paymentDetails.payment_method === "credit card") && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Amount Sent
                            </label>
                            <input
                              type="number"
                              value={paymentDetails.amount_sent}
                              onChange={(e) =>
                                setPaymentDetails({
                                  ...paymentDetails,
                                  amount_sent: parseFloat(e.target.value),
                                })
                              }
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Screenshot
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileChange}
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Reference Number
                            </label>
                            <input
                              type="text"
                              value={paymentDetails.reference_number}
                              onChange={(e) =>
                                setPaymentDetails({
                                  ...paymentDetails,
                                  reference_number: e.target.value,
                                })
                              }
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                          </div>
                        </>
                      )}
                      {(paymentDetails.payment_method === "cash" ||
                        paymentDetails.payment_method ===
                          "pay at the counter") && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Amount Paid
                            </label>
                            <input
                              type="number"
                              value={paymentDetails.amount_paid}
                              onChange={(e) =>
                                setPaymentDetails({
                                  ...paymentDetails,
                                  amount_paid: parseFloat(e.target.value),
                                })
                              }
                              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                          </div>
                          {order.shop_type !== "self-service" && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Paid the Driver
                              </label>
                              <input
                                type="checkbox"
                                checked={paymentDetails.paid_the_driver}
                                onChange={(e) =>
                                  setPaymentDetails({
                                    ...paymentDetails,
                                    paid_the_driver: e.target.checked,
                                  })
                                }
                                className="mt-1"
                              />
                            </div>
                          )}
                        </>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Payment Date
                        </label>
                        <input
                          type="date"
                          value={paymentDetails.payment_date}
                          onChange={(e) =>
                            setPaymentDetails({
                              ...paymentDetails,
                              payment_date: e.target.value,
                            })
                          }
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      <div className="flex space-x-4">
                        <button
                          type="button"
                          onClick={handleSubmitPayment}
                          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                        >
                          Submit
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedOrderId(null)}
                          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
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
