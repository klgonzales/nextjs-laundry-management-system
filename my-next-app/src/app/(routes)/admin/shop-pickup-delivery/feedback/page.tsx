"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { usePusher } from "@/app/context/PusherContext";
import {
  FiUser,
  FiClock,
  FiMessageSquare,
  FiStar,
  FiHash,
} from "react-icons/fi";

export default function Feedback() {
  const { user, isLoading: authLoading } = useAuth(); // Add isLoading from useAuth
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { pusher, isConnected } = usePusher();
  const channelRef = useRef<any>(null);
  const [customerData, setCustomerData] = useState<{ [key: string]: any }>({});

  // Fetch customer data when feedbacks change
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!feedbacks.length) return;

      // Get unique customer IDs that we don't already have data for
      const customerIdsToFetch = [
        ...new Set(
          feedbacks
            .filter((f) => f.customer_id && !customerData[f.customer_id])
            .map((f) => f.customer_id)
        ),
      ];

      if (!customerIdsToFetch.length) return;

      try {
        // Fetch each customer's data
        const customerPromises = customerIdsToFetch.map(async (id) => {
          const response = await fetch(`/api/customers/${id}`);
          if (response.ok) {
            const data = await response.json();
            return { id, data: data.customer };
          }
          console.error(`Failed to fetch customer ${id}`);
          return { id, data: null };
        });

        const results = await Promise.all(customerPromises);
        // Update customer data state
        const newCustomerData = { ...customerData };
        results.forEach((result) => {
          if (result.data) {
            newCustomerData[result.id] = result.data;
          } else {
            // Cache negative results to avoid repeated failing requests
            newCustomerData[result.id] = { notFound: true };
          }
        });

        setCustomerData(newCustomerData);
      } catch (error) {
        console.error("Error fetching customer data:", error);
      }
    };

    fetchCustomers();
  }, [feedbacks]);

  // Helper function to get customer name
  const getCustomerName = (feedback: any) => {
    // First check if we have a name directly in the feedback
    if (feedback.customer_name) return feedback.customer_name;

    // Check if we have customer data cached
    if (feedback.customer_id && customerData[feedback.customer_id]?.name) {
      return customerData[feedback.customer_id].name;
    }

    // Return the customer ID as fallback
    return feedback.customer_id
      ? `Customer #${feedback.customer_id}`
      : "Anonymous";
  };

  useEffect(() => {
    const fetchFeedbacks = async () => {
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

        const shopId = user?.shops?.[0]?.shop_id; // Dynamically get the shop_id from the user's shops
        if (!shopId) {
          throw new Error("Shop ID not found");
        }

        const response = await fetch(`/api/shops/${shopId}/feedbacks`);
        if (!response.ok) {
          throw new Error("Failed to fetch feedbacks");
        }

        const data = await response.json();
        setFeedbacks(data.feedbacks || []);
      } catch (error) {
        console.error("Error fetching feedbacks:", error);
      } finally {
        setLoading(false);
      }
    };
    if (user?.admin_id || !authLoading) {
      fetchFeedbacks();
    }
  }, [user?.shops, authLoading]);

  // Set up Pusher for real-time feedback updates
  useEffect(() => {
    if (!pusher || !isConnected || !user?.admin_id) {
      return;
    }

    const adminId = user.admin_id;
    const shopId = user?.shops?.[0]?.shop_id;
    const channelName = `private-admin-${adminId}`;

    console.log(
      `[Admin Feedback] Setting up Pusher for channel: ${channelName}`
    );

    // Clean up existing subscription
    if (channelRef.current) {
      channelRef.current.unbind_all();
      pusher.unsubscribe(channelRef.current.name);
    }

    // Create new subscription
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    // Debug subscription events
    channel.bind("pusher:subscription_succeeded", () => {
      console.log(`[Admin Feedback] Successfully subscribed to ${channelName}`);
    });

    channel.bind("pusher:subscription_error", (status: any) => {
      console.error(
        `[Admin Feedback] Failed to subscribe to ${channelName}:`,
        status
      );
    });

    // Bind to new-feedback event
    console.log(`[Admin Feedback] Binding to new-feedback event`);
    channel.bind("new-feedback", (data: any) => {
      console.log(`[Admin Feedback] Received new feedback:`, data);

      // Check if this feedback is for our shop
      if (data.shop_id && data.shop_id !== shopId) {
        console.log(
          `[Admin Feedback] Feedback is for a different shop. Ignoring.`
        );
        return;
      }

      // Check for duplicates
      const feedbackExists = feedbacks.some(
        (f) =>
          f.feedback_id === data.feedback_id ||
          (f.order_id === data.order_id && f.customer_id === data.customer_id)
      );

      if (feedbackExists) {
        console.log(`[Admin Feedback] Duplicate feedback. Skipping.`);
        return;
      }

      // Add the new feedback to the state
      setFeedbacks((prevFeedbacks) => {
        console.log(`[Admin Feedback] Adding new feedback to state`);
        return [data, ...prevFeedbacks];
      });
    });

    // Add this to your admin feedback page component
    channel.bind("delete-feedback", (data: any) => {
      console.log(`[Admin Feedback] Received feedback deletion:`, data);

      // Remove the deleted feedback from state
      setFeedbacks((prevFeedbacks) =>
        prevFeedbacks.filter(
          (feedback) => feedback.feedback_id !== data.feedback_id
        )
      );
    });

    // Add this to your existing useEffect for Pusher after the "new-feedback" binding

    // Bind to update-feedback event
    console.log(`[Admin Feedback] Binding to update-feedback event`);
    channel.bind("update-feedback", (data: any) => {
      console.log(`[Admin Feedback] Received feedback update:`, data);

      // Check if this feedback is for our shop
      if (data.shop_id && data.shop_id !== shopId) {
        console.log(
          `[Admin Feedback] Feedback update is for a different shop. Ignoring.`
        );
        return;
      }

      // Update the feedback in the state
      setFeedbacks((prevFeedbacks) => {
        console.log(`[Admin Feedback] Updating feedback in state`);

        return prevFeedbacks.map((feedback) => {
          if (feedback.feedback_id === data.feedback_id) {
            console.log(
              `[Admin Feedback] Found feedback to update:`,
              feedback.feedback_id
            );

            // Add a highlight class to show it was just updated
            return {
              ...feedback,
              ...data,
              justUpdated: true, // Add this flag for styling
            };
          }
          return feedback;
        });
      });

      // Remove the "justUpdated" flag after 3 seconds for animation
      setTimeout(() => {
        setFeedbacks((current) =>
          current.map((f) =>
            f.feedback_id === data.feedback_id
              ? { ...f, justUpdated: false }
              : f
          )
        );
      }, 3000);
    });

    // Cleanup function
    return () => {
      console.log(`[Admin Feedback] Cleaning up Pusher subscription`);
      if (channelRef.current) {
        channelRef.current.unbind_all();
        pusher.unsubscribe(channelName);
        channelRef.current = null;
      }
    };
  }, [pusher, isConnected, user?.admin_id, user?.shops?.[0]?.shop_id]);

  if (loading) {
    return <p className="text-center text-gray-500">Loading feedbacks...</p>;
  }

  // In your return statement:
  return (
    <div className="mt-8 bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Customer Feedback
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          View and manage feedback from your customers
        </p>
      </div>

      <div className="border-t border-gray-200">
        <div className="px-4 py-5 sm:p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-pulse text-[#F468BB]">
                Loading feedbacks...
              </div>
            </div>
          ) : feedbacks.length > 0 ? (
            <ul className="space-y-4">
              {feedbacks.map((feedback, index) => (
                <li
                  key={feedback.feedback_id || index}
                  className={`p-4 bg-white rounded-lg shadow-sm border ${
                    feedback.justUpdated
                      ? "border-[#FFB6E2] animate-pulse"
                      : "border-gray-200"
                  } hover:shadow-md transition-shadow`}
                >
                  {/* Header with customer name, order ID and date */}
                  <div className="flex flex-wrap justify-between items-center mb-3 pb-2 border-b border-gray-100">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-[#EADDFF] rounded-full flex items-center justify-center">
                        <FiUser className="h-4 w-4 text-[#3D4EB0]" />
                      </div>
                      <div className="ml-2">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-900">
                            {getCustomerName(feedback)}
                          </span>
                          <span className="ml-2 flex items-center text-xs text-gray-500">
                            <FiHash className="mr-1 h-3 w-3" />
                            Order #{feedback.order_id}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center text-xs text-gray-500">
                      <FiClock className="mr-1 h-3 w-3" />
                      <time dateTime={feedback.date_submitted}>
                        {new Date(feedback.date_submitted).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      </time>
                    </div>
                  </div>

                  {/* Rating with stars */}
                  <div className="mb-2">
                    <div className="flex items-center">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <FiStar
                            key={star}
                            className={`h-5 w-5 ${
                              star <= feedback.rating
                                ? "text-yellow-400 fill-current"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      {/* <span className="ml-2 text-sm font-medium text-gray-700">
                        {feedback.rating}/5
                      </span> */}
                      {/* Comment */}
                      <div className="ml-2 text-sm font-medium text-gray-700">
                        <p className="text-sm">
                          {feedback.comments || "No comments provided"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Optional: Show which service was rated */}
                  {feedback.service_type && (
                    <div className="mt-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#F9F9F9] text-[#3D4EB0]">
                        {feedback.service_type}
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8">
              <div className="mx-auto w-12 h-12 rounded-full bg-[#F9F9F9] flex items-center justify-center mb-4">
                <FiMessageSquare className="h-6 w-6 text-[#F468BB]" />
              </div>
              <p className="text-gray-500">No feedback received yet</p>
              <p className="text-sm text-gray-400 mt-2">
                Feedback will appear here when customers rate your services
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
