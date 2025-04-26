"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { usePusher } from "@/app/context/PusherContext";

export default function Feedback() {
  const { user } = useAuth(); // Get the user from the AuthContext
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { pusher, isConnected } = usePusher();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
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

    fetchFeedbacks();
  }, [user?.shops]);

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

  return (
    <div className="mt-8 bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Feedback
        </h3>
      </div>
      <div className="border-t border-gray-200">
        <div className="px-4 py-5 sm:p-6">
          {feedbacks.length > 0 ? (
            <ul className="space-y-4">
              {feedbacks.map((feedback, index) => (
                <li
                  key={feedback.feedback_id || index}
                  className="p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200"
                >
                  <p className="text-sm text-gray-600">
                    <strong>Rating:</strong> {feedback.rating}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Comments:</strong> {feedback.comments}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Date Submitted:</strong>{" "}
                    {new Date(feedback.date_submitted).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-center">No feedbacks found</p>
          )}
        </div>
      </div>
    </div>
  );
}
