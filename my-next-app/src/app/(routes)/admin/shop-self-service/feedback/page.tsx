"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext"; // Import useAuth

export default function Feedback() {
  const { user } = useAuth(); // Get the user from the AuthContext
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      try {
        const shopId = user?.shops?.[0]?.shop_id; // Dynamically get the shop_id from the user's shops
        if (!shopId) {
          console.log("Shop ID not found");
        }

        const response = await fetch(`/api/shops/${shopId}/feedbacks`);
        if (!response.ok) {
          console.log("Failed to fetch feedbacks");
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
