"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";

export default function Payments() {
  const { user } = useAuth(); // Get the user from the AuthContext
  const shop_id = user?.shops?.[0]?.shop_id; // Dynamically get the shop_id from the user's shops
  const [payments, setPayments] = useState<any[]>([]); // Store all payments
  const [filteredPayments, setFilteredPayments] = useState<any[]>([]); // Store filtered payments
  const [filterStatus, setFilterStatus] = useState<string>("all"); // Track the selected filter

  useEffect(() => {
    const fetchPayments = async () => {
      try {
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

    fetchPayments();
  }, [shop_id]);

  // Filter payments based on the selected status
  useEffect(() => {
    if (filterStatus === "all") {
      setFilteredPayments(payments);
    } else {
      setFilteredPayments(
        payments.filter((payment) => payment.payment_status === filterStatus)
      );
    }
  }, [filterStatus, payments]);

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

  return (
    <div className="mt-8 bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Payments
        </h3>
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
                    Customer ID: {payment.customer_id}
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
                      {payment.payment_method === "gcash" && (
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
                      {payment.payment_method === "cash" && (
                        <>
                          <p className="text-sm text-gray-600">
                            Amount Paid: ₱{payment.proof_of_payment.amount_paid}
                          </p>
                          <p className="text-sm text-gray-600">
                            Paid the Driver:{" "}
                            {payment.proof_of_payment.paid_the_driver
                              ? "Yes"
                              : "No"}
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
            <p className="text-gray-500 text-center">
              No payments found for the selected status
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
