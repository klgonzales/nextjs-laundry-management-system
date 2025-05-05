"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { usePusher } from "@/app/context/PusherContext";
import type { Channel } from "pusher-js";
import { useRealTimeUpdates } from "@/app/context/RealTimeUpdatesContext";
import {
  FiUser,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiFileText,
  FiDollarSign,
  FiInfo,
  FiCreditCard,
  FiClipboard,
} from "react-icons/fi";
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
  total_weight?: number;
  notes: string;
}
export default function Payments() {
  const { user, isLoading: authLoading } = useAuth(); // Get the user from the AuthContext
  const [loading, setLoading] = useState(true);
  const shop_id = user?.shops?.[0]?.shop_id; // Dynamically get the shop_id from the user's shops
  const [orders, setOrders] = useState<Order[]>([]);
  const { pusher, isConnected } = usePusher();
  const channelRef = useRef<Channel | null>(null);
  const [payments, setPayments] = useState<any[]>([]); // Store all payments
  const [filteredPayments, setFilteredPayments] = useState<any[]>([]); // Store filtered payments
  // Add these state variables at the top with your other states
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc"); // Default to newest first (descending)
  const [searchQuery, setSearchQuery] = useState("");
  const [customerData, setCustomerData] = useState<Record<string, any>>({});
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false); // Manual refresh loading
  const [filterStatus, setFilterStatus] = useState<string>("pending"); // Track the selected filter
  const { registerPaymentHandler, unregisterPaymentHandler } =
    useRealTimeUpdates();

  // Add this sorting function to sort the orders
  const sortOrdersByDate = useCallback(
    (orders: any[], direction: "asc" | "desc") => {
      return [...orders].sort((a, b) => {
        const dateA = new Date(a.date_placed || 0).getTime();
        const dateB = new Date(b.date_placed || 0).getTime();
        return direction === "asc" ? dateA - dateB : dateB - dateA;
      });
    },
    []
  );

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      try {
        // Check auth loading state first
        if (authLoading) {
          console.log("[Admin Feedback] Auth still loading, deferring fetch");
          setLoading(false);
          return;
        }

        // Check if user exists before trying to access properties
        if (!user) {
          console.log("[Admin Feedback] No user found, skipping fetch");
          setLoading(false);
          return;
        }
        // Fetch payments for the current shop
        const shopResponse = await fetch(`/api/payments/${shop_id}`);
        if (!shopResponse.ok) {
          throw new Error("Failed to fetch payments");
        }
        const data = await shopResponse.json();
        setPayments(data.orders || []); // Set all payments
        setFilteredPayments(data.orders || []); // Initially show all payments
        setLoading(false);
      } catch (error) {
        console.error("Error fetching payments:", error);
        setLoading(false);
      }
    };
    if (user?.admin_id || !authLoading) {
      fetchPayments();
    }
  }, [shop_id]);

  // Replace your ENTIRE Pusher subscription effect with this:
  useEffect(() => {
    if (!pusher || !isConnected || !user?.admin_id) {
      console.log("[Admin Payments] Missing prerequisites for Pusher setup");
      return;
    }

    const adminId = user.admin_id;
    const channelName = `private-admin-${adminId}`;
    console.log(`[Admin Payments] Setting up subscription to ${channelName}`);

    // Clean up previous subscription if it exists
    if (channelRef.current) {
      console.log(`[Admin Payments] Cleaning up previous subscription`);
      channelRef.current.unbind_all();
      pusher.unsubscribe(channelRef.current.name);
      channelRef.current = null;
    }

    // Create a new subscription
    console.log(`[Admin Payments] Creating new subscription to ${channelName}`);
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    // Debug subscription events
    channel.bind("pusher:subscription_succeeded", () => {
      console.log(`[Admin Payments] Successfully subscribed to ${channelName}`);
    });

    channel.bind("pusher:subscription_error", (status: any) => {
      console.error(
        `[Admin Payments] Failed to subscribe to ${channelName}:`,
        status
      );
    });

    // 1. Bind to update-order-status event
    console.log("JKGSDFHJAGSDAAAAAA");
    console.log(`[Admin Payments] Binding to update-order-status event`);
    channel.bind("update-order-status", (data: any) => {
      console.log(`[Admin Payments] Received order status update:`, data);

      // Handle both data formats
      const orderId = data.order_id;
      const status = data.status;

      if (!orderId || !status) {
        console.error("[Admin Payments] Missing data in update:", data);
        return;
      }

      // Update payments state with additional debug logging
      setPayments((prevPayments) => {
        console.log(
          `[Admin Payments] Current payments count: ${prevPayments.length}`
        );
        const foundPayment = prevPayments.find(
          (p) => p._id === orderId || p.order_id === orderId
        );
        console.log(
          `[Admin Payments] Found payment for update:`,
          foundPayment ? "yes" : "no"
        );

        const updatedPayments = prevPayments.map((payment) => {
          // Check both _id and order_id
          const paymentId = payment._id || payment.order_id;
          if (paymentId === orderId) {
            console.log(
              `[Admin Payments] Updating payment ${paymentId} order status from "${payment.order_status}" to "${status}"`
            );
            return { ...payment, order_status: status };
          }
          return payment;
        });

        return updatedPayments;
      });
    });

    // 2. Bind to new-payment event
    console.log(`[Admin Payments] Binding to new-payment event`);
    channel.bind("new-payment", (paymentData: any) => {
      console.log(`[Admin Payments] RECEIVED NEW PAYMENT:`, paymentData);

      // Filter by shop_id with extra logging
      if (paymentData.shop_id !== shop_id) {
        console.log(`[Admin Payments] Payment shop_id: ${paymentData.shop_id}`);
        console.log(`[Admin Payments] Current shop_id: ${shop_id}`);
        console.log(
          `[Admin Payments] Payment is for different shop. Ignoring.`
        );
        return;
      }

      // Check for duplicates with extra logging
      const paymentExists = payments.some((p) => {
        const match = p._id === paymentData._id;
        if (match)
          console.log(
            `[Admin Payments] Found matching payment in state:`,
            p._id
          );
        return match;
      });

      if (paymentExists) {
        console.log(`[Admin Payments] Duplicate payment detected. Skipping.`);
        return;
      }

      // Add to state
      console.log(`[Admin Payments] Adding new payment to state:`, paymentData);
      setPayments((prevPayments) => {
        const newPayments = [paymentData, ...prevPayments];
        console.log(
          `[Admin Payments] Updated payments count: ${newPayments.length}`
        );
        return newPayments;
      });
    });

    // Fix the update-payment-status-proof handler in your payments page
    console.log("uuuuuuUUUUUUUU");
    channel.bind("update-payment-status-proof", (data: any) => {
      console.log(`[Admin Payments] Received payment proof update:`, data);
      // Add these debugging lines right after console.log(`[Admin Payments] Received payment proof update:`, data);
      console.log(
        `%c[DEBUG] PAYMENT PROOF EVENT RECEIVED!`,
        "background: red; color: white; padding: 5px; font-weight: bold;"
      );
      console.log(
        `[DEBUG] Order ID: ${data.order_id || data.orderId || "MISSING"}`
      );
      console.log(`[DEBUG] Payment data keys:`, Object.keys(data));
      console.log(`[DEBUG] Amount paid:`, data.amount_paid);
      console.log(`[DEBUG] Payment date:`, data.payment_date);
      console.log(
        `[DEBUG] Screenshot present:`,
        data.screenshot ? "YES" : "NO"
      );

      // Extract the order ID
      const orderId = data.order_id || data.orderId;

      if (!orderId) {
        console.error(
          "[Admin Payments] Missing order ID in proof update:",
          data
        );
        return;
      }

      // Update the payments in state
      setPayments((prevPayments) => {
        console.log(
          `[Admin Payments] Updating payments after proof submission, current count: ${prevPayments.length}`
        );

        const foundPayment = prevPayments.find((p) => p._id === orderId);
        console.log(
          `[Admin Payments] Found payment for proof update:`,
          foundPayment ? "yes" : "no"
        );

        return prevPayments.map((payment) => {
          if (payment._id === orderId) {
            console.log(
              `[Admin Payments] Updating payment ${payment._id} with proof details`
            );

            // Extract all the proof details from the Pusher data
            const proofOfPayment = {
              payment_id: data.payment_id,
              customer_id: data.customer_id,
              shop_id: data.shop_id,
              amount_sent: data.amount_sent,
              amount_paid: data.amount_paid,
              screenshot: data.screenshot,
              reference_number: data.reference_number,
              paid_the_driver: data.paid_the_driver,
              payment_method: data.payment_method,
              payment_date: data.payment_date,
            };

            // IMPORTANT: Only set the proof_of_payment object, not individual properties at top level
            return {
              ...payment,
              payment_status: "for review",
              proof_of_payment: proofOfPayment, // This is the only property you need
              has_proof_of_payment: true,
            };
          }
          return payment;
        });
      });
    });

    // 3. Bind to update-payment-status directly as well
    console.log(
      `[Admin Payments] Binding directly to update-payment-status event`
    );
    channel.bind("update-payment-status", (data: any) => {
      console.log(
        `[Admin Payments] Directly received payment status update:`,
        data
      );

      // Extract the ID and status with flexible property names
      const orderId = data.order_id || data.orderId;
      const status = data.payment_status || data.status;

      if (!orderId || !status) {
        console.error(
          "[Admin Payments] Missing required data in direct update:",
          data
        );
        return;
      }

      // Update the payments in state
      setPayments((prevPayments) => {
        console.log(
          `[Admin Payments] Updating payments directly, current count: ${prevPayments.length}`
        );
        const foundPayment = prevPayments.find((p) => p._id === orderId);
        console.log(
          `[Admin Payments] Found payment for direct update:`,
          foundPayment ? "yes" : "no"
        );

        return prevPayments.map((payment) => {
          if (payment._id === orderId) {
            console.log(
              `[Admin Payments] Directly updating payment ${payment._id} status from "${payment.payment_status}" to "${status}"`
            );
            return { ...payment, payment_status: status };
          }
          return payment;
        });
      });
    });

    // // Fixed update-order-price handler
    // console.log(
    //   `[Admin Payments] Binding to update-order-price event on ${channelName}`
    // );
    // console.log("KJDSGFHJSGAFHSDGGAGAGGAGGGGGGG");
    // channel.bind(
    //   "update-order-price",
    //   (data: {
    //     order_id: string;
    //     total_weight?: number;
    //     total_price?: number;
    //     notes?: string;
    //     date_updated?: string;
    //   }) => {
    //     console.log(
    //       `%c[PRICE UPDATE EVENT] Received data:`,
    //       "background: orange; color: white; padding: 4px",
    //       data
    //     );

    //     // Extract the order ID and new price with flexible property names
    //     const orderId = data.order_id;
    //     console.log(orderId);

    //     if (!orderId) {
    //       console.error(
    //         "[Admin Payments] Missing order ID in price update:",
    //         data
    //       );
    //       return;
    //     }

    //     // Update the payments in state
    //     setPayments((prevPayments) => {
    //       console.log(
    //         `[Admin Payments] Updating payment price, current count: ${prevPayments.length}`
    //       );

    //       const foundPayment = prevPayments.find(
    //         (p) => p._id === orderId || p.order_id === orderId
    //       );
    //       console.log(
    //         `%c[PRICE UPDATE] Found payment?`,
    //         "background: orange; color: white",
    //         foundPayment ? "YES" : "NO"
    //       );

    //       const updatedPayments = prevPayments.map((payment) => {
    //         // Check for both _id and order_id fields
    //         const paymentId = payment._id || payment.order_id;

    //         if (paymentId === orderId) {
    //           console.log(
    //             `%c[PRICE UPDATE] Updating payment ${paymentId}`,
    //             "background: green; color: white; padding: 4px"
    //           );
    //           console.log(
    //             `Old price: ${payment.total_price}, New price: ${data.total_price}`
    //           );

    //           return {
    //             ...payment,
    //             total_weight: data.total_weight,
    //             total_price: data.total_price,
    //             notes: data.notes,
    //           };
    //         }
    //         return payment;
    //       });

    //       // Don't forget to also update filteredPayments state!
    //       setFilteredPayments(
    //         sortOrdersByDate(
    //           filterStatus === "all"
    //             ? updatedPayments
    //             : updatedPayments.filter(
    //                 (p) => p.payment_status === filterStatus
    //               ),
    //           sortDirection
    //         )
    //       );

    //       return updatedPayments;
    //     });
    //   }
    // );

    // Cleanup function
    return () => {
      console.log(`[Admin Payments] Cleaning up Pusher subscription`);
      if (channelRef.current) {
        channelRef.current.unbind_all();
        pusher.unsubscribe(channelName);
        channelRef.current = null;
      }
    };
  }, [pusher, isConnected, user?.admin_id, shop_id]);

  // Keep ONLY ONE registerPaymentHandler effect
  useEffect(() => {
    // Register handler for payment status updates
    registerPaymentHandler((data) => {
      console.log(
        `[Admin Payments] Context handling payment status update:`,
        data
      );

      const orderId = data.order_id || data.orderId;
      const status = data.payment_status || data.status;

      if (!orderId || !status) {
        console.error(
          "[Admin Payments] Missing required data in context update:",
          data
        );
        return;
      }

      setPayments((prevPayments) =>
        prevPayments.map((payment) => {
          if (payment._id === orderId) {
            console.log(
              `[Admin Payments] Context updating payment ${payment._id} status from "${payment.payment_status}" to "${status}"`
            );
            return { ...payment, payment_status: status };
          }
          return payment;
        })
      );
    });

    return () => {
      unregisterPaymentHandler();
    };
  }, [registerPaymentHandler, unregisterPaymentHandler]);

  // Add this function within your component
  const fetchCustomerData = useCallback(async (customerIds: string[]) => {
    if (!customerIds.length) return;

    setLoadingCustomers(true);

    try {
      const uniqueCustomerIds = Array.from(new Set(customerIds));
      const customerDataMap: Record<string, any> = { ...customerData };

      // Fetch customer details for each ID that we don't already have
      for (const customerId of uniqueCustomerIds) {
        // Skip if we already have this customer's data
        if (customerDataMap[customerId]) continue;

        try {
          console.log(`[Payments] Fetching data for customer ${customerId}`);
          const response = await fetch(`/api/customers/${customerId}`);

          if (response.ok) {
            const data = await response.json();
            if (data.customer) {
              customerDataMap[customerId] = data.customer;
            } else {
              console.log(
                `[Payments] Customer data empty for ID: ${customerId}`
              );
              // Store something so we don't try to fetch this ID again
              customerDataMap[customerId] = { name: "Unknown Customer" };
            }
          } else {
            console.log(
              `[Payments] Failed to fetch customer ${customerId}: ${response.status}`
            );
            customerDataMap[customerId] = { name: "Unknown Customer" };
          }
        } catch (err) {
          console.error(
            `[Payments] Error fetching customer ${customerId}:`,
            err
          );
          customerDataMap[customerId] = { name: "Unknown Customer" };
        }
      }

      setCustomerData(customerDataMap);
    } catch (err) {
      console.error("[Payments] Error fetching customer data:", err);
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  // Add this useEffect after your payments fetch effect
  useEffect(() => {
    if (payments.length > 0) {
      // Extract all unique customer IDs from payments
      const customerIds = payments
        .map((payment) => payment.customer_id)
        .filter(Boolean);

      if (customerIds.length > 0) {
        console.log(
          `[Payments] Found ${customerIds.length} customer IDs to fetch`
        );
        fetchCustomerData(customerIds);
      }
    }
  }, [payments, fetchCustomerData]);

  const handleApprovePayment = async (orderId: string) => {
    try {
      const response = await fetch(
        `/api/orders/${orderId}/update-payment-status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPaymentStatus: "paid" }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to approve payment");
      }

      // Update the local state
      setPayments((prevPayments) =>
        prevPayments.map((payment) =>
          payment._id === orderId
            ? { ...payment, payment_status: "paid" }
            : payment
        )
      );
      console.log("Payment approved successfully!");
    } catch (error) {
      console.error("Error approving payment:", error);
      console.log("Failed to approve payment. Please try again.");
    }
  };

  const handleCancelPayment = async (orderId: string) => {
    try {
      const response = await fetch(
        `/api/orders/${orderId}/update-payment-status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPaymentStatus: "failed" }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to cancel payment");
      }

      // Update the local state
      setPayments((prevPayments) =>
        prevPayments.map((payment) =>
          payment._id === orderId
            ? { ...payment, payment_status: "failed" }
            : payment
        )
      );
      console.log("Payment canceled successfully!");
    } catch (error) {
      console.error("Error canceling payment:", error);
      console.log("Failed to cancel payment. Please try again.");
    }
  };

  // Add this function to handle search, right before your return statement
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  // Replace your current filtering effect with this corrected version
  useEffect(() => {
    // Add a log to track effect runs
    console.log("[Payments] Running filter effect");

    // First, filter by search query if there is one
    let searchFiltered = payments;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      searchFiltered = payments.filter((payment) => {
        // Get customer name from our customerData map
        const customerName =
          customerData[payment.customer_id]?.name?.toLowerCase() || "";
        return customerName.includes(query);
      });
    }

    // Then filter by status
    let statusFiltered;
    if (filterStatus === "all") {
      statusFiltered = searchFiltered;
    } else {
      // FIXED: Don't update state in the middle of calculations
      statusFiltered = searchFiltered.filter(
        (payment) => payment.payment_status === filterStatus
      );
    }

    // Finally, sort the filtered results
    const sortedOrders = sortOrdersByDate(statusFiltered, sortDirection);

    // Update state with sorted and filtered orders
    setFilteredPayments(sortedOrders);

    // Log filtered results count
    console.log(
      `[Payments] Filtered from ${payments.length} to ${searchFiltered.length} payments`
    );
  }, [
    filterStatus,
    payments,
    searchQuery,
    customerData,
    sortDirection,
    sortOrdersByDate,
  ]);
  return (
    <div className="mt-8 bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        {/* Title and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Payments
          </h3>
          <div className="mt-2 sm:mt-0 relative rounded-md">
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

        {/* Display search results count if searching */}
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
            Found {filteredPayments.length}{" "}
            {filteredPayments.length === 1 ? "result" : "results"} for "
            {searchQuery}"
          </div>
        )}

        {/* Tabs for filtering payments */}

        <div className="mt-4 flex space-x-4">
          <div className="flex space-x-2">
            <button
              onClick={() => setSortDirection("asc")}
              className={`btn ${
                sortDirection === "asc"
                  ? "btn-tertiary"
                  : "btn-tertiary-neutral"
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
              className={`btn ${
                sortDirection === "desc"
                  ? "btn-tertiary"
                  : "btn-tertiary-neutral"
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
          <div className="w-px bg-gray-300"></div>
          {["all", "pending", "for review", "paid", "failed", "cancelled"].map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`btn ${
                  filterStatus === status
                    ? "btn-tertiary"
                    : "btn-tertiary-neutral"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            )
          )}
        </div>
      </div>

      <div className="border-t border-gray-200">
        <div className="px-4 py-5 sm:p-6">
          {loading ? (
            <div className="py-4">
              {/* Skeleton Loading for Admin Orders */}
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="mb-8 animate-pulse border border-gray-200 rounded-lg p-4"
                >
                  {/* Order Header Skeleton */}
                  <div className="flex flex-wrap justify-between items-start mb-4 pb-2 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                      <div>
                        <div className="h-5 w-40 bg-gray-200 rounded mb-2"></div>
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Status Badge */}
                          <div className="h-5 w-20 bg-gray-200 rounded-full"></div>

                          {/* Additional Info Badges */}
                          <div className="flex flex-wrap gap-2 mt-1">
                            <div className="h-5 w-16 bg-gray-200 rounded-full"></div>
                            <div className="h-5 w-16 bg-gray-200 rounded-full"></div>
                            <div className="h-5 w-32 bg-gray-200 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Order Content Skeleton - 4-column grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    {/* Services */}
                    <div className="flex items-start">
                      <div className="mt-1">
                        <div className="h-4 w-4 rounded-full bg-gray-200"></div>
                      </div>
                      <div className="ml-2 flex-1">
                        <div className="h-4 w-20 bg-gray-200 rounded mb-2"></div>
                        <div className="flex flex-wrap gap-1">
                          {[1, 2, 3].map((service) => (
                            <div
                              key={service}
                              className="h-5 w-16 bg-gray-200 rounded"
                            ></div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="flex items-start">
                      <div className="mt-1">
                        <div className="h-4 w-4 rounded-full bg-gray-200"></div>
                      </div>
                      <div className="ml-2 flex-1">
                        <div className="h-4 w-16 bg-gray-200 rounded mb-2"></div>
                        <div className="flex flex-wrap gap-1">
                          {[1, 2, 3].map((item) => (
                            <div
                              key={item}
                              className="h-6 w-20 bg-gray-200 rounded"
                            ></div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Order Details */}
                    <div className="flex items-start">
                      <div className="mt-1">
                        <div className="h-4 w-4 rounded-full bg-gray-200"></div>
                      </div>
                      <div className="ml-2 flex-1">
                        <div className="flex justify-between">
                          <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                          <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
                        </div>
                        <div className="space-y-2">
                          <div className="h-6 w-24 bg-gray-200 rounded"></div>
                          <div className="h-6 w-16 bg-gray-200 rounded"></div>
                          <div className="h-6 w-20 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    </div>
                    {/* Delivery Instructions */}
                    <div className="flex items-start">
                      <div className="mt-1">
                        <div className="h-4 w-4 rounded-full bg-gray-200"></div>
                      </div>
                      <div className="ml-2 flex-1">
                        <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                        <div className="h-12 w-full bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons Skeleton */}
                  <div className="mt-4 flex justify-end space-x-4">
                    <div className="h-9 w-24 bg-gray-200 rounded"></div>
                    <div className="h-9 w-24 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredPayments.length > 0 ? (
            <ul className="space-y-4">
              {filteredPayments.map((payment, index) => (
                <li
                  key={index}
                  className="p-4 bg-[#F9F9F9] rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                >
                  {/* Header with customer name and payment status */}
                  <div className="flex flex-wrap justify-between items-start mb-4 pb-2 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-[#EADDFF] rounded-full flex items-center justify-center">
                        <FiUser className="h-5 w-5 text-[#3D4EB0]" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-medium text-gray-900">
                            {customerData[payment.customer_id]?.name ||
                              "Loading customer..."}
                          </h4>

                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                              ${
                                payment.payment_status === "paid"
                                  ? "badge-success"
                                  : payment.payment_status === "pending"
                                    ? "bg-yellow-50 text-yellow-500"
                                    : payment.payment_status === "for review"
                                      ? "bg-purple-50 text-purple-500"
                                      : payment.payment_status ===
                                            "cancelled" ||
                                          payment.payment_status === "failed"
                                        ? "badge-danger"
                                        : "bg-gray-100 text-gray-700"
                              }`}
                          >
                            {payment.payment_status
                              ? payment.payment_status.charAt(0).toUpperCase() +
                                payment.payment_status.slice(1)
                              : "Unknown"}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-[#F0F0F0] text-gray-800">
                            <FiClock className="mr-1 h-3 w-3 text-gray-500" />
                            {new Date(
                              payment.date_placed || payment.date
                            ).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>

                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-[#F0F0F0] text-gray-800">
                            <FiFileText className="mr-1 h-3 w-3 text-gray-500" />
                            Order Status:{" "}
                            {payment.order_status
                              .split(" ")
                              .map(
                                (word: string) =>
                                  word.charAt(0).toUpperCase() +
                                  word.slice(1).toLowerCase()
                              )
                              .join(" ")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment details */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    {/* Payment Method */}
                    <div className="flex items-start">
                      <div className="mt-1">
                        <FiCreditCard className="h-4 w-4 text-[#3D4EB0]" />
                      </div>
                      <div className="ml-2">
                        <h5 className="text-sm font-medium text-[#3D4EB0]">
                          Payment Method
                        </h5>
                        <div className="mt-1 inline-flex items-center px-2 py-1 rounded text-sm bg-[#F0F0F0] text-gray-700">
                          {payment.payment_method
                            ? payment.payment_method.charAt(0).toUpperCase() +
                              payment.payment_method.slice(1)
                            : "Unknown"}
                        </div>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="flex items-start">
                      <div className="mt-1">
                        <FiDollarSign className="h-4 w-4 text-[#3D4EB0]" />
                      </div>
                      <div className="ml-2">
                        <h5 className="text-sm font-medium text-[#3D4EB0]">
                          Amount
                        </h5>
                        <div className="mt-1 inline-flex items-center px-2 py-1 rounded text-sm bg-[#F0F0F0] text-gray-700 font-semibold">
                          ₱{payment.total_price}
                        </div>
                      </div>
                    </div>

                    {/* KG */}
                    <div className="flex items-start">
                      <div className="mt-1">
                        <FiDollarSign className="h-4 w-4 text-[#3D4EB0]" />
                      </div>
                      <div className="ml-2">
                        <h5 className="text-sm font-medium text-[#3D4EB0]">
                          Total KG
                        </h5>
                        <div className="mt-1 inline-flex items-center px-2 py-1 rounded text-sm bg-[#F0F0F0] text-gray-700 font-semibold">
                          {payment.total_weight}
                        </div>
                      </div>
                    </div>

                    {/* Order ID Reference */}
                    <div className="flex items-start">
                      <div className="mt-1">
                        <FiClipboard className="h-4 w-4 text-[#3D4EB0]" />
                      </div>
                      <div className="ml-2">
                        <h5 className="text-sm font-medium text-[#3D4EB0]">
                          Order Reference
                        </h5>
                        <div className="mt-1 inline-flex items-center px-2 py-1 rounded text-sm bg-[#F0F0F0] text-gray-700 font-mono">
                          #{payment._id.substring(payment._id.length - 6)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Show details if payment_status is "for review" */}
                  {payment.payment_status === "for review" && (
                    <div className="mt-4 bg-white p-4 rounded-lg border border-gray-200">
                      <h5 className="font-medium text-gray-800 mb-3 flex items-center">
                        <FiInfo className="mr-2 text-[#3D4EB0]" />
                        Payment Verification Details
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {payment.payment_method === "gcash" && (
                          <div className="space-y-3">
                            <div className="flex items-center">
                              <div className="w-32 text-sm text-gray-600">
                                Amount Sent:
                              </div>
                              <div className="font-medium text-sm">
                                ₱
                                {payment.proof_of_payment?.amount_sent || "N/A"}
                              </div>
                            </div>
                            <div className="flex items-center">
                              <div className="w-32 text-sm text-gray-600">
                                Reference Number:
                              </div>
                              <div className="font-medium text-sm">
                                {payment.proof_of_payment?.reference_number ||
                                  "N/A"}
                              </div>
                            </div>
                            <div className="flex items-center">
                              <div className="w-32 text-sm text-gray-600">
                                Payment Date:
                              </div>
                              <div className="font-medium text-sm">
                                {payment.proof_of_payment?.payment_date
                                  ? new Date(
                                      payment.proof_of_payment.payment_date
                                    ).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    })
                                  : "N/A"}
                              </div>
                            </div>
                          </div>
                        )}

                        {payment.payment_method === "cash" && (
                          <div className="space-y-3">
                            <div className="flex items-center">
                              <div className="w-32 text-sm text-gray-600">
                                Amount Paid:
                                <div className="font-medium text-sm">
                                  ₱
                                  {payment.proof_of_payment?.amount_paid ||
                                    "N/A"}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <div className="w-32 text-sm text-gray-600">
                                Paid the Driver:
                                <div className="font-medium text-sm">
                                  {payment.proof_of_payment?.paid_the_driver
                                    ? "Yes"
                                    : "No"}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <div className="w-32 text-sm text-gray-600">
                                Payment Date:
                              </div>
                              <div className="font-medium text-sm">
                                {new Date(
                                  payment.proof_of_payment.payment_date
                                ).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })}
                              </div>
                            </div>
                          </div>
                        )}

                        {payment.payment_method === "gcash" && (
                          <div className="flex items-center justify-center border rounded p-2 bg-gray-50">
                            <button
                              onClick={() => {
                                const screenshot =
                                  payment.proof_of_payment?.screenshot;
                                if (screenshot) {
                                  const newWindow = window.open();
                                  if (newWindow) {
                                    newWindow.document.write(`
                                      <html>
                                        <head>
                                          <title>Payment Screenshot</title>
                                          <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                          <style>
                                            body {
                                              margin: 0;
                                              padding: 20px;
                                              display: flex;
                                              justify-content: center;
                                              align-items: center;
                                              min-height: 100vh;
                                              background-color: #f4f4f4;
                                              font-family: system-ui, -apple-system, sans-serif;
                                            }
                                            .container {
                                              max-width: 100%;
                                              text-align: center;
                                            }
                                            img {
                                              max-width: 100%;
                                              height: auto;
                                              border: 1px solid #ccc;
                                              box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                                              border-radius: 4px;
                                            }
                                            h2 {
                                              color: #333;
                                              margin-bottom: 20px;
                                            }
                                          </style>
                                        </head>
                                        <body>
                                          <div class="container">
                                            <h2>Payment Screenshot</h2>
                                            <img src="${screenshot}" alt="Payment Screenshot" />
                                          </div>
                                        </body>
                                      </html>
                                    `);
                                    newWindow.document.close();
                                  }
                                } else {
                                  console.log("No screenshot available");
                                }
                              }}
                              className="flex items-center justify-center py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white bg-[#3D4EB0] hover:bg-[#2D3A8C]"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 mr-2"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              View Screenshot
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={() => handleApprovePayment(payment._id)}
                          className="btn btn-success flex items-center"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-1"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Approve Payment
                        </button>
                        <button
                          onClick={() => handleCancelPayment(payment._id)}
                          className="btn btn-danger flex items-center"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-1"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Decline Payment
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-500 text-center p-6">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 20a8 8 0 100-16 8 8 0 000 16z"
                />
              </svg>

              {searchQuery ? (
                <div className="mt-2">
                  No payments found matching{" "}
                  <span className="font-bold">"{searchQuery}"</span>
                </div>
              ) : (
                <div className="mt-2">
                  No payments found with{" "}
                  <span className="font-bold">
                    {filterStatus === "all" ? "any" : filterStatus}
                  </span>{" "}
                  status
                </div>
              )}

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-2 text-blue-500 hover:text-blue-700 font-medium"
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
