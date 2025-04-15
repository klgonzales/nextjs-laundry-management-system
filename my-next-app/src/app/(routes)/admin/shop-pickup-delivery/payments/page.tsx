"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext"; // Assuming you have an AuthContext to get user details

export default function Payments({ shop_id }: { shop_id: string }) {
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

  return (
    <div className="mt-8 bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Payments
        </h3>
        <div className="mt-4 flex space-x-4">
          {/* Tabs for filtering payments */}
          {["all", "pending", "for review", "paid", "cancelled"].map(
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
              {filteredPayments.map((payment, index) => {
                console.log("Payment object:", payment); // Debugging
                return (
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
                      Order Status:{" "}
                      {payment.order_status
                        ? payment.order_status.charAt(0).toUpperCase() +
                          payment.order_status.slice(1)
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
                    <p className="text-sm text-gray-600">
                      Date Completed:{" "}
                      {payment.order_status !== "completed"
                        ? "Pending"
                        : new Date(payment.date_completed).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )}
                    </p>
                    <p className="text-sm text-gray-600">
                      Notes: {payment.notes || "No notes added"}
                    </p>
                  </li>
                );
              })}
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
