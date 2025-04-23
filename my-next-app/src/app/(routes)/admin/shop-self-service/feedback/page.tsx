"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/app/context/AuthContext";
// Remove direct io import
// import io, { Socket } from "socket.io-client";
import { useSocket } from "@/app/context/SocketContext"; // Import useSocket

const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "/";

export default function Feedback() {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket(); // Get socket from context
  const adminId = user?.admin_id;
  const shopId = user?.shops?.[0]?.shop_id; // Keep shopId for initial fetch
  //const socketRef = useRef<Socket | null>(null);

  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Initial Fetch Feedbacks (remains the same) ---
  useEffect(() => {
    if (!shopId) {
      setLoading(false);
      setError("Shop ID not found for this admin.");
      setFeedbacks([]);
      return;
    }

    const fetchFeedbacks = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/shops/${shopId}/feedbacks`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("[Feedback Fetch] API Error:", errorData);
          throw new Error(errorData.error || "Failed to fetch feedbacks");
        }
        const data = await response.json();
        console.log("[Feedback Fetch] API Data:", data);
        setFeedbacks(data.feedbacks || []);
      } catch (error: any) {
        console.error("[Feedback Fetch] Error in catch block:", error);
        setError(error.message || "Failed to load feedbacks.");
        setFeedbacks([]);
      } finally {
        setLoading(false);
        console.log("[Feedback Fetch] Fetch finished.");
      }
    };

    fetchFeedbacks();
  }, [shopId]);

  // --- Socket.IO Listener useEffect (using context socket) ---
  useEffect(() => {
    // Only attach listeners if the socket from context exists, is connected, and we have an adminId
    if (socket && isConnected && adminId) {
      console.log(
        "[Feedback Page Socket] Context socket connected. Attaching listeners."
      );

      // Handler for updated feedback (if applicable)
      interface Feedback {
        feedback_id?: string;
        _id?: string;
        rating: number;
        comments?: string;
        date_submitted?: string;
      }
      // Handler for new feedback
      const handleNewFeedback = (newFeedback: Feedback) => {
        console.log(">>> RAW EVENT RECEIVED: new_feedback_added", newFeedback);
        setFeedbacks((prevFeedbacks) => {
          // Prevent duplicates (using feedback_id or _id)
          const feedbackExists = prevFeedbacks.some(
            (fb) =>
              (fb.feedback_id && fb.feedback_id === newFeedback.feedback_id) ||
              (fb._id && fb._id === newFeedback._id)
          );
          if (feedbackExists) {
            console.log(
              "[Feedback Page Socket] Duplicate new feedback detected, ignoring."
            );
            return prevFeedbacks;
          }
          console.log("[Feedback Page Socket] Prepending new feedback.");
          return [newFeedback, ...prevFeedbacks]; // Add to beginning
        });
      };

      const handleUpdatedFeedback = (updatedFeedback: Feedback) => {
        console.log(
          ">>> RAW EVENT RECEIVED: feedback_updated",
          updatedFeedback
        );
        setFeedbacks((prevFeedbacks) =>
          prevFeedbacks.map(
            (fb) =>
              // Find the feedback by its unique ID and replace it
              (fb.feedback_id &&
                fb.feedback_id === updatedFeedback.feedback_id) ||
              (fb._id && fb._id === updatedFeedback._id)
                ? updatedFeedback // Replace with the updated data
                : fb // Keep the existing feedback if IDs don't match
          )
        );
      };

      // Attach listeners to the context socket
      // Ensure these event names EXACTLY match what socket.ts emits for admins
      socket.on("new_feedback_added", handleNewFeedback);
      socket.on("feedback_updated", handleUpdatedFeedback); // Listen for updates

      // Cleanup: Remove listeners from the context socket
      return () => {
        console.log("[Feedback Page Socket Cleanup] Removing listeners.");
        // Check if socket still exists before trying to remove listeners
        if (socket) {
          socket.off("new_feedback_added", handleNewFeedback);
          socket.off("feedback_updated", handleUpdatedFeedback);
        }
      };
    } else {
      // Log if the socket isn't ready when the effect runs
      console.log(
        "[Feedback Page Socket] Context socket not ready or not connected, listeners not attached."
      );
    }
    // Depend on the shared socket instance, its connection status, and adminId
  }, [socket, isConnected, adminId]);
  // --- End Socket.IO useEffect ---

  // --- Render Logic (remains the same) ---
  return (
    <div className="mt-8 bg-white shadow rounded-lg mb-10">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Feedback
        </h3>
      </div>
      <div className="border-t border-gray-200">
        <div className="px-4 py-5 sm:p-6">
          {loading && (
            <p className="text-gray-500 text-center py-4">
              Loading feedbacks...
            </p>
          )}
          {error && (
            <p className="text-red-600 text-center py-4">Error: {error}</p>
          )}
          {!loading && !error && feedbacks.length > 0 ? (
            <ul className="space-y-4">
              {feedbacks.map((feedback, index) => (
                <li
                  // Use feedback_id or _id if available, otherwise fallback
                  key={feedback.feedback_id || feedback._id || index}
                  className="p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200"
                >
                  <p className="text-sm text-gray-600">
                    <strong>Rating:</strong> {feedback.rating}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Comments:</strong>{" "}
                    {feedback.comments || "No comments"}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Date Submitted:</strong>{" "}
                    {feedback.date_submitted
                      ? new Date(feedback.date_submitted).toLocaleDateString(
                          "en-US",
                          { year: "numeric", month: "long", day: "numeric" }
                        )
                      : "N/A"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            !loading &&
            !error && (
              <p className="text-gray-500 text-center py-4">
                No feedbacks found for this shop.
              </p>
            )
          )}
        </div>
      </div>
    </div>
  );
}
