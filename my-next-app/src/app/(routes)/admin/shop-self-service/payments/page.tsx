"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { usePusher } from "@/app/context/PusherContext";
import type { Channel } from "pusher-js";
import { useRealTimeUpdates } from "@/app/context/RealTimeUpdatesContext";

export default function Payments() {
  const { user, isLoading: authLoading } = useAuth(); // Get the user from the AuthContext
  const [loading, setLoading] = useState(true);
  const shop_id = user?.shops?.[0]?.shop_id; // Dynamically get the shop_id from the user's shops
  const { pusher, isConnected } = usePusher();
  const channelRef = useRef<Channel | null>(null);
  const currentUserId = user?.customer_id;
  const [payments, setPayments] = useState<any[]>([]); // Store all payments
  const [filteredPayments, setFilteredPayments] = useState<any[]>([]); // Store filtered payments
  const [filterStatus, setFilterStatus] = useState<string>("all"); // Track the selected filter
  // Add these state variables at the top with your other states
  const [searchQuery, setSearchQuery] = useState("");
  const [customerData, setCustomerData] = useState<Record<string, any>>({});
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const { registerPaymentHandler, unregisterPaymentHandler } =
    useRealTimeUpdates();

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        // Check auth loading state first
        if (authLoading) {
          console.log("[Admin Feedback] Auth still loading, deferring fetch");
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
      } catch (error) {
        console.error("Error fetching payments:", error);
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
              // Don't add these top-level properties - they won't be accessed in your render code
              // amount_sent: data.amount_sent,
              // amount_paid: data.amount_paid,
              // screenshot: data.screenshot,
              // reference_number: data.reference_number,
              // paid_the_driver: data.paid_the_driver,
              // payment_method: data.payment_method,
              // payment_date: data.payment_date,
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

    // Cleanup function
    return () => {
      console.log(`[Admin Payments] Cleaning up Pusher subscription`);
      if (channelRef.current) {
        channelRef.current.unbind_all();
        pusher.unsubscribe(channelName);
        channelRef.current = null;
      }
    };
  }, [pusher, isConnected, user?.admin_id || null, shop_id || null]);

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

  // if (loading) {
  //   return <p className="text-center text-gray-500">Loading payments...</p>;
  // }

  // Add this function to handle search, right before your return statement
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  // Replace your current filtering effect with this one
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
    if (filterStatus === "all") {
      setFilteredPayments(searchFiltered);
    } else {
      setFilteredPayments(
        searchFiltered.filter(
          (payment) => payment.payment_status === filterStatus
        )
      );
    }

    // Log filtered results count
    console.log(
      `[Payments] Filtered from ${payments.length} to ${searchFiltered.length} payments`
    );
  }, [filterStatus, payments, searchQuery, customerData]); // The dependency array is fine, the issue is elsewhere

  return (
    <div className="mt-8 bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        {/* Title and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Payments
          </h3>

          <div className="mt-2 sm:mt-0 relative rounded-md shadow-sm">
            <input
              type="text"
              placeholder="Search by customer name..."
              value={searchQuery}
              onChange={handleSearch}
              className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:w-64 pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
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
          <div className="mt-2 text-sm text-gray-500 flex items-center mb-3">
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
        <div className="mt-4 flex space-x-4">
          {/* Tabs for filtering payments */}
          {["all", "pending", "for review", "paid", "failed", "cancelled"].map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded ${
                  filterStatus === status
                    ? "bg-indigo-500 text-white"
                    : "bg-gray-200 text-gray-700"
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
          {filteredPayments.length > 0 ? (
            <ul className="space-y-4">
              {filteredPayments.map((payment, index) => (
                <li
                  key={index}
                  className="p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200"
                >
                  <h4 className="text-lg font-semibold text-gray-800">
                    {customerData[payment.customer_id]?.name ||
                      "Loading customer..."}
                    <span className="text-xs text-gray-500 ml-2">
                      (ID: {payment.customer_id})
                    </span>
                  </h4>
                  <p className="text-sm text-gray-600">
                    Amount: ₱{payment.total_price}
                  </p>
                  <p className="text-sm text-gray-600">
                    Mode of Payment:{" "}
                    {payment.payment_method
                      ? payment.payment_method.charAt(0).toUpperCase() +
                        payment.payment_method.slice(1)
                      : "Unknown"}
                  </p>
                  <p className="text-sm text-gray-600">
                    Order Status: {payment.order_status}
                  </p>
                  <p className="text-sm text-gray-600">
                    Payment Status:{" "}
                    <span
                      className={`${
                        payment.payment_status === "paid"
                          ? "text-green-500"
                          : payment.payment_status === "pending"
                            ? "text-yellow-500"
                            : payment.payment_status === "cancelled"
                              ? "text-red-500"
                              : "text-gray-500"
                      }`}
                    >
                      {payment.payment_status
                        ? payment.payment_status.charAt(0).toUpperCase() +
                          payment.payment_status.slice(1)
                        : "Unknown"}
                    </span>
                  </p>

                  {/* Show details if payment_status is "for review" */}
                  {payment.payment_status === "for review" && (
                    <div className="mt-4 space-y-2">
                      {(payment.payment_method === "gcash" ||
                        payment.payment_method === "credit card" ||
                        payment.payment_method === "bank transfer") && (
                        <>
                          <p className="text-sm text-gray-600">
                            Amount Sent: ₱{payment.proof_of_payment.amount_sent}
                          </p>
                          <p className="text-sm text-gray-600">
                            Reference Number:{" "}
                            {payment.proof_of_payment.reference_number}
                          </p>
                          <p className="text-sm text-gray-600">
                            Payment Date:{" "}
                            {new Date(
                              payment.proof_of_payment.payment_date
                            ).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                          <button
                            onClick={() => {
                              const screenshot =
                                payment.proof_of_payment?.screenshot; // Access the screenshot
                              if (screenshot) {
                                // Open the Base64 image in a new tab
                                const newWindow = window.open();
                                if (newWindow) {
                                  newWindow.document.write(`
          <html>
            <head><title>Screenshot</title></head>
            <body style="margin:0; display:flex; justify-content:center; align-items:center; height:100vh; background-color:#f4f4f4;">
              <img src="${screenshot}" alt="Screenshot" style="max-width: 100%; height: auto; border: 1px solid #ccc; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);" />
            </body>
          </html>
        `);
                                  newWindow.document.close();
                                }
                              } else {
                                console.log("No screenshot available");
                              }
                            }}
                            className="text-blue-500 hover:underline"
                          >
                            View Screenshot
                          </button>
                        </>
                      )}
                      {(payment.payment_method === "cash" ||
                        payment.payment_method === "pay at the counter") && (
                        <>
                          <p className="text-sm text-gray-600">
                            Amount Paid: ₱{payment.proof_of_payment.amount_paid}
                          </p>
                          {payment.order_type !== "self-service" && (
                            <p className="text-sm text-gray-600">
                              Paid the Driver:{" "}
                              {payment.proof_of_payment.paid_the_driver
                                ? "Yes"
                                : "No"}
                            </p>
                          )}
                          <p className="text-sm text-gray-600">
                            Payment Date:{" "}
                            {new Date(
                              payment.proof_of_payment.payment_date
                            ).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </>
                      )}
                      <div className="mt-4 flex space-x-4">
                        <button
                          onClick={() => handleApprovePayment(payment._id)}
                          className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleCancelPayment(payment._id)}
                          className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                        >
                          Decline
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
