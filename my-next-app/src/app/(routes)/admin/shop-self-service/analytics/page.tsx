"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { useAuth } from "@/app/context/AuthContext";
import { usePusher } from "@/app/context/PusherContext";
import {
  format,
  parseISO,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Time period options
const TIME_PERIODS = {
  WEEK: "week",
  MONTH: "month",
  YEAR: "year",
};

interface Rating {
  created_at: string;
  rating: string;
  customer_id?: string;
  order_id?: string;
  comments?: string;
}

export default function Analytics() {
  const { user } = useAuth();
  const { pusher, isConnected } = usePusher();
  const channelRef = useRef<any>(null);

  interface Payment {
    _id: any;
    proof_of_payment?:
      | { payment_date: string; amount_paid: string }[]
      | undefined;
  }

  const [paymentData, setPaymentData] = useState<Payment[]>([]);

  interface Rating {
    created_at: string;
    rating: string;
  }

  const [ratingData, setRatingData] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Group by date and calculate daily averages
  const dailyRatings: Record<string, number> = {};
  const dailyRatingCounts: Record<string, number> = {};

  // State for time period selection
  const [paymentTimePeriod, setPaymentTimePeriod] = useState(
    TIME_PERIODS.MONTH
  );
  const [ratingTimePeriod, setRatingTimePeriod] = useState(TIME_PERIODS.MONTH);

  // Get shop ID from user
  const shopId = user?.shops?.[0]?.shop_id || null;

  // Add this at the top of your component
  useEffect(() => {
    // Globally disable animations and curves in production to prevent rendering issues
    if (process.env.NODE_ENV === "production") {
      ChartJS.defaults.animation = false;
      ChartJS.defaults.elements.line.tension = 0;
    }
  }, []);

  // Fetch initial data
  // Update the fetchData function in your useEffect
  useEffect(() => {
    async function fetchData() {
      if (!shopId) return;

      setLoading(true);
      setError(null);

      try {
        // Fetch payments data
        const paymentsResponse = await fetch(
          `/api/analytics/payments/${shopId}`
        );
        if (!paymentsResponse.ok) {
          throw new Error("Failed to fetch payment data");
        }
        const paymentsData = await paymentsResponse.json();

        // UPDATED: Use the existing feedbacks API
        const ratingsResponse = await fetch(`/api/shops/${shopId}/feedbacks`);
        if (!ratingsResponse.ok) {
          throw new Error("Failed to fetch rating data");
        }
        const ratingsData = await ratingsResponse.json();

        setPaymentData(paymentsData.payments || []);

        // UPDATED: Map feedbacks to the expected rating data format
        const formattedRatings = (ratingsData.feedbacks || []).map(
          (feedback: any) => ({
            created_at: feedback.date_submitted || new Date().toISOString(),
            rating: feedback.rating.toString(),
            customer_id: feedback.customer_id,
            order_id: feedback.order_id,
            comments: feedback.comments,
          })
        );

        setRatingData(formattedRatings);
      } catch (err) {
        console.error("Error fetching analytics data:", err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [shopId]);

  // Set up real-time updates with Pusher
  useEffect(() => {
    if (!pusher || !isConnected || !user?.admin_id || !shopId) {
      console.log("[Analytics] Pusher not ready or missing user/shop data");
      return;
    }

    const adminId = user.admin_id;
    const channelName = `private-admin-${adminId}`;
    console.log(`[Analytics] Subscribing to channel: ${channelName}`);

    try {
      const channel = pusher.subscribe(channelName);
      channelRef.current = channel;

      // Handle new payment
      channel.bind("new-payment", (data: any) => {
        console.log("[Analytics] New payment received:", data);
        if (data.shop_id === shopId) {
          setPaymentData((prevData) => {
            // Check if this payment already exists
            const exists = prevData.some(
              (payment) =>
                payment.proof_of_payment?.[0]?.payment_date ===
                data.proof_of_payment?.[0]?.payment_date
            );

            if (!exists) {
              return [...prevData, data];
            }
            return prevData;
          });
        }
      });

      // Handle payment update
      channel.bind("payment-update", (data: any) => {
        console.log("[Analytics] Payment update received:", data);
        if (data.shop_id === shopId) {
          setPaymentData((prevData) => {
            return prevData.map((payment) => {
              if (payment._id === data._id) {
                return { ...payment, ...data };
              }
              return payment;
            });
          });
        }
      });

      // Replace the existing new-feedback handler
      channel.bind("new-feedback", (data: any) => {
        console.log("[Analytics] New feedback received:", data);
        if (data.shop_id === shopId) {
          // Convert feedback to the expected rating format
          const formattedFeedback = {
            created_at: data.date_submitted || new Date().toISOString(),
            rating: data.rating.toString(),
            customer_id: data.customer_id,
            order_id: data.order_id,
            comments: data.comments,
          };

          setRatingData((prevData) => [...prevData, formattedFeedback]);
        }
      });

      // Handle subscription events for debugging
      channel.bind("pusher:subscription_succeeded", () => {
        console.log(`[Analytics] Successfully subscribed to ${channelName}`);
      });

      channel.bind("pusher:subscription_error", (error: any) => {
        console.error(
          `[Analytics] Failed to subscribe to ${channelName}:`,
          error
        );
      });

      return () => {
        console.log(`[Analytics] Unsubscribing from ${channelName}`);
        if (channelRef.current) {
          channelRef.current.unbind_all();
          pusher.unsubscribe(channelName);
          channelRef.current = null;
        }
      };
    } catch (error) {
      console.error("[Analytics] Error setting up Pusher:", error);
    }
  }, [pusher, isConnected, user?.admin_id, shopId]);

  const createChartData = (
    labels: string[],
    values: number[],
    color: string
  ) => {
    // Ensure we have valid arrays
    if (!Array.isArray(labels) || !Array.isArray(values)) {
      return {
        labels: ["No Data", "No Data"],
        datasets: [
          {
            label: "No Data",
            data: [0, 0],
            borderColor: color,
            backgroundColor: color
              .replace("rgb", "rgba")
              .replace(")", ", 0.2)"),
            fill: true,
            tension: 0,
            pointBackgroundColor: color,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      };
    }
    // Check if we have enough valid data points
    const validValues = values.filter((v) => v !== undefined && v !== null);

    if (validValues.length < 2) {
      return {
        labels: ["No Data", "No Data"],
        datasets: [
          {
            label: "No Data",
            data: [0, 0],
            borderColor: color,
            backgroundColor: color
              .replace("rgb", "rgba")
              .replace(")", ", 0.2)"),
            fill: true,
            tension: 0,
            pointBackgroundColor: color,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      };
    }

    // Return valid chart data
    return {
      labels,
      datasets: [
        {
          label:
            color === "rgb(255, 99, 132)" ? "Average Rating" : "Payment Amount",
          data: values,
          borderColor: color,
          backgroundColor: color.replace("rgb", "rgba").replace(")", ", 0.2)"),
          fill: true,
          tension: values.length > 2 ? 0.3 : 0, // Disable curve for sparse data
          pointBackgroundColor: color,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  };

  // Replace the problematic getFilteredPaymentData function with this fixed version:
  const getFilteredPaymentData = useCallback(() => {
    if (!paymentData.length) return { labels: [], amounts: [] };

    let cutoffDate;
    switch (paymentTimePeriod) {
      case TIME_PERIODS.WEEK:
        cutoffDate = subWeeks(new Date(), 1);
        break;
      case TIME_PERIODS.MONTH:
        cutoffDate = subMonths(new Date(), 1);
        break;
      case TIME_PERIODS.YEAR:
        cutoffDate = subYears(new Date(), 1);
        break;
      default:
        cutoffDate = subMonths(new Date(), 1);
    }

    // Filter and format payment data
    const filteredData = paymentData
      .filter((payment) => {
        if (!payment?.proof_of_payment?.[0]?.payment_date) {
          return false;
        }

        try {
          const paymentDate = parseISO(
            payment.proof_of_payment[0].payment_date
          );
          return paymentDate >= cutoffDate;
        } catch (e) {
          console.error(
            `Error parsing date: ${payment.proof_of_payment[0].payment_date}`,
            e
          );
          return false;
        }
      })
      .sort((a, b) => {
        try {
          const dateA = new Date(a.proof_of_payment?.[0]?.payment_date || 0);
          const dateB = new Date(b.proof_of_payment?.[0]?.payment_date || 0);
          return dateA.getTime() - dateB.getTime();
        } catch (e) {
          return 0;
        }
      });

    // Group by date and calculate daily totals
    const dailyPayments: Record<string, number> = {};
    filteredData.forEach((payment) => {
      try {
        if (payment.proof_of_payment?.[0]?.payment_date) {
          const date = format(
            new Date(payment.proof_of_payment[0].payment_date),
            "yyyy-MM-dd"
          );

          if (!dailyPayments[date]) {
            dailyPayments[date] = 0;
          }

          const amountPaid =
            parseFloat(
              payment.proof_of_payment[0].amount_paid?.toString() || "0"
            ) || 0;
          dailyPayments[date] += amountPaid;
        }
      } catch (e) {
        console.error("Error processing payment for chart:", e);
      }
    });

    return {
      labels: Object.keys(dailyPayments).map((date) => {
        // Format date labels based on time period
        try {
          const dateObj = parseISO(date);
          switch (paymentTimePeriod) {
            case TIME_PERIODS.WEEK:
              return format(dateObj, "EEE");
            case TIME_PERIODS.MONTH:
              return format(dateObj, "MMM dd");
            case TIME_PERIODS.YEAR:
              return format(dateObj, "MMM yyyy");
            default:
              return format(dateObj, "MMM dd");
          }
        } catch (e) {
          console.error(`Error formatting date: ${date}`, e);
          return date; // Return original string if formatting fails
        }
      }),
      amounts: Object.values(dailyPayments),
    };
  }, [paymentData, paymentTimePeriod]);

  const getFilteredRatingData = useCallback(() => {
    if (!ratingData.length) {
      // Return default values with at least 2 data points to avoid errors
      return {
        labels: ["No Data", "No Data"],
        ratings: [0, 0],
      };
    }

    let cutoffDate;
    switch (ratingTimePeriod) {
      case TIME_PERIODS.WEEK:
        cutoffDate = subWeeks(new Date(), 1);
        break;
      case TIME_PERIODS.MONTH:
        cutoffDate = subMonths(new Date(), 1);
        break;
      case TIME_PERIODS.YEAR:
        cutoffDate = subYears(new Date(), 1);
        break;
      default:
        cutoffDate = subMonths(new Date(), 1);
    }

    // Reset dailyRatings for each calculation
    const localDailyRatings: Record<string, number> = {};
    const localDailyRatingCounts: Record<string, number> = {};

    // Filter and format rating data
    const filteredData = ratingData
      .filter((rating) => {
        if (!rating?.created_at) {
          return false;
        }

        try {
          const ratingDate = parseISO(rating.created_at);
          return ratingDate >= cutoffDate;
        } catch (e) {
          console.error(`Error parsing rating date: ${rating.created_at}`, e);
          return false;
        }
      })
      .sort((a, b) => {
        try {
          const dateA = new Date(a.created_at || 0);
          const dateB = new Date(b.created_at || 0);
          return dateA.getTime() - dateB.getTime();
        } catch (e) {
          return 0;
        }
      });

    filteredData.forEach((rating) => {
      try {
        if (rating.created_at) {
          const date = format(new Date(rating.created_at), "yyyy-MM-dd");
          if (!localDailyRatings[date]) {
            localDailyRatings[date] = 0;
            localDailyRatingCounts[date] = 0;
          }

          const ratingValue = parseFloat(rating.rating?.toString() || "0") || 0;
          localDailyRatings[date] += ratingValue;
          localDailyRatingCounts[date]++;
        }
      } catch (e) {
        console.error("Error processing rating for chart:", e);
      }
    });

    // Calculate averages
    const dates = Object.keys(localDailyRatings);
    const averages = dates.map(
      (date) => localDailyRatings[date] / (localDailyRatingCounts[date] || 1)
    );

    return {
      labels: dates.map((date) => {
        // Format date labels based on time period
        try {
          const dateObj = parseISO(date);
          switch (ratingTimePeriod) {
            case TIME_PERIODS.WEEK:
              return format(dateObj, "EEE");
            case TIME_PERIODS.MONTH:
              return format(dateObj, "MMM dd");
            case TIME_PERIODS.YEAR:
              return format(dateObj, "MMM yyyy");
            default:
              return format(dateObj, "MMM dd");
          }
        } catch (e) {
          console.error(`Error formatting date: ${date}`, e);
          return date;
        }
      }),
      ratings: averages,
    };
  }, [ratingData, ratingTimePeriod]);

  // Calculate chart data whenever filtered data changes
  const paymentChartData = getFilteredPaymentData();
  const ratingChartData = getFilteredRatingData();
  // Replace your chart data creation with this safer implementation
  // 3. Apply the same fix to the payment chart:
  // Instead of using createChartData, define charts directly:
  const paymentData_chart = {
    labels:
      paymentChartData.labels.length >= 2
        ? paymentChartData.labels
        : ["No Data", "No Data"],
    datasets: [
      {
        label: "Payment Amount",
        data:
          paymentChartData.amounts.length >= 2
            ? paymentChartData.amounts
            : [0, 0],
        borderColor: "rgb(53, 162, 235)",
        backgroundColor: "rgba(53, 162, 235, 0.2)",
        fill: true,
        // Critical change: Disable curve completely in production
        tension:
          process.env.NODE_ENV === "production"
            ? 0
            : paymentChartData.amounts.length > 2
              ? 0.3
              : 0,
        pointBackgroundColor: "rgb(53, 162, 235)",
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const ratingData_chart = {
    labels:
      ratingChartData.labels.length >= 2
        ? ratingChartData.labels
        : ["No Data", "No Data"],
    datasets: [
      {
        label: "Average Rating",
        data:
          ratingChartData.ratings.length >= 2
            ? ratingChartData.ratings
            : [0, 0],
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        fill: true,
        // Critical change: Disable curve completely in production
        tension:
          process.env.NODE_ENV === "production"
            ? 0
            : ratingChartData.ratings.length > 2
              ? 0.3
              : 0,
        pointBackgroundColor: "rgb(255, 99, 132)",
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  // Chart options
  const paymentOptions = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: "Amount (₱)",
          font: {
            size: 14,
            weight: 700,
          },
        },
        ticks: {
          callback: function (value: any) {
            return "₱" + value;
          },
        },
      },
      x: {
        title: {
          display: true,
          text: "Date",
          font: {
            size: 14,
            weight: 700,
          },
        },
      },
    },
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Payment Amounts Over Time",
        font: {
          size: 16,
          weight: 700,
        },
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            return `Amount: ₱${context.raw}`;
          },
        },
      },
    },
    animation: {
      duration: process.env.NODE_ENV === "production" ? 0 : 1000,
    },
    elements: {
      line: {
        tension: process.env.NODE_ENV === "production" ? 0 : 0.3,
      },
    },
  };

  const ratingOptions = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        max: 5,
        title: {
          display: true,
          text: "Rating (1-5)",
          font: {
            size: 14,
            weight: 700,
          },
        },
      },
      x: {
        title: {
          display: true,
          text: "Date",
          font: {
            size: 14,
            weight: 700,
          },
        },
      },
    },
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Average Customer Ratings Over Time",
        font: {
          size: 16,
          weight: 700,
        },
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            return `Rating: ${context.raw}/5`;
          },
        },
      },
    },
    animation: {
      duration: process.env.NODE_ENV === "production" ? 0 : 1000,
    },
    elements: {
      line: {
        tension: process.env.NODE_ENV === "production" ? 0 : 0.3,
      },
    },
  };

  // Calculate summary stats
  const calculateSummary = useCallback(() => {
    if (!paymentData.length && !ratingData.length)
      return {
        totalPayments: 0,
        avgPaymentAmount: 0,
        avgRating: 0,
        totalOrders: 0,
      };

    const validPayments = paymentData.filter(
      (p) => p.proof_of_payment && p.proof_of_payment[0]
    );
    const totalPayments = validPayments.reduce(
      (sum, payment) =>
        sum +
        (parseFloat(payment.proof_of_payment?.[0]?.amount_paid || "0") || 0),
      0
    );

    const avgPaymentAmount = validPayments.length
      ? (totalPayments / validPayments.length).toFixed(2)
      : 0;

    const totalRatingPoints = ratingData.reduce(
      (sum, r) => sum + (parseFloat(r.rating) || 0),
      0
    );
    const avgRating = ratingData.length
      ? parseFloat((totalRatingPoints / ratingData.length).toFixed(1))
      : 0;

    return {
      totalPayments: totalPayments.toFixed(2),
      avgPaymentAmount,
      avgRating,
      totalOrders: paymentData.length,
    };
  }, [paymentData, ratingData]);

  const summary = calculateSummary();

  // Add this useEffect to force chart re-render when data changes
  useEffect(() => {
    if (
      paymentChartData.labels.length > 0 ||
      ratingChartData.labels.length > 0
    ) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        // Force re-render of the component
        setForceUpdate((prev) => !prev);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [paymentChartData.labels.length, ratingChartData.labels.length]);

  // Add this state at the top of your component
  const [forceUpdate, setForceUpdate] = useState(false);
  // Define proper types for the chart component
  interface SafeChartProps {
    data: {
      labels: string[];
      datasets: {
        label: string;
        data: number[];
        borderColor: string;
        backgroundColor: string;
        fill?: boolean;
        tension?: number;
        pointBackgroundColor?: string;
        pointRadius?: number;
        pointHoverRadius?: number;
      }[];
    };
    options: any;
    type?: string;
    minimumDataPoints?: number;
  }

  const SafeChart = ({
    data,
    options,
    minimumDataPoints = 2,
  }: SafeChartProps) => {
    // Extra safety checks for production environment
    const safeOptions = {
      ...options,
      animation: {
        duration:
          process.env.NODE_ENV === "production"
            ? 0
            : options.animation?.duration || 1000,
      },
      elements: {
        ...options.elements,
        line: {
          ...options.elements?.line,
          tension:
            process.env.NODE_ENV === "production"
              ? 0
              : options.elements?.line?.tension || 0.3,
        },
      },
    };

    // Only render chart if we have valid data
    if (
      data &&
      data.datasets &&
      data.datasets[0] &&
      Array.isArray(data.datasets[0].data) &&
      data.datasets[0].data.length >= minimumDataPoints
    ) {
      // Return chart with safe options
      return <Line options={safeOptions} data={data} />;
    }

    // Fallback for insufficient data
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-2">Not enough data to display chart</p>
          <p className="text-sm text-gray-400">
            At least {minimumDataPoints} data points are needed
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-8 bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Analytics
        </h3>

        {/* Realtime Indicator */}
        <div className="flex items-center mb-4">
          <div
            className={`h-3 w-3 rounded-full mr-2 ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
          ></div>
          <span className="text-sm text-gray-600">
            {isConnected
              ? "Real-time updates active"
              : "Real-time updates disconnected"}
          </span>
          <button
            onClick={() => window.location.reload()}
            className="ml-3 text-xs text-blue-600 hover:underline"
          >
            Reconnect
          </button>
        </div>

        {/* Summary Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500 mb-1">
              Total Revenue
            </p>
            <h4 className="text-lg font-semibold text-gray-800">
              ₱{summary.totalPayments}
            </h4>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500 mb-1">
              Average Payment
            </p>
            <h4 className="text-lg font-semibold text-gray-800">
              ₱{summary.avgPaymentAmount}
            </h4>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500 mb-1">
              Total Orders
            </p>
            <h4 className="text-lg font-semibold text-gray-800">
              {summary.totalOrders}
            </h4>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-500 mb-1">
              Average Rating
            </p>
            <div className="flex items-center">
              <h4 className="text-lg font-semibold text-gray-800">
                {summary.avgRating}
              </h4>
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`h-5 w-5 ${i < Math.round(Number(summary.avgRating)) ? "text-yellow-400" : "text-gray-300"}`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="px-4 py-5 space-y-8">
          {/* Payment Chart Skeleton */}
          <div className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="flex justify-between items-center mb-6">
              <div className="h-6 w-32 bg-gray-200 rounded"></div>
              <div className="flex items-center space-x-2">
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
                <div className="h-8 w-28 bg-gray-200 rounded"></div>
              </div>
            </div>
            <div className="h-80 bg-gray-100 rounded flex items-center justify-center">
              <svg
                className="w-16 h-16 text-gray-300"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M6 18L18 18"
                />
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M3 21L21 21"
                />
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M3 7L7 3L13 9L17 5L21 9"
                />
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M3 7L21 7"
                />
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M3 7L3 21"
                />
              </svg>
            </div>
          </div>

          {/* Rating Chart Skeleton */}
          <div className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="flex justify-between items-center mb-6">
              <div className="h-6 w-40 bg-gray-200 rounded"></div>
              <div className="flex items-center space-x-2">
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
                <div className="h-8 w-28 bg-gray-200 rounded"></div>
              </div>
            </div>
            <div className="h-80 bg-gray-100 rounded flex items-center justify-center">
              <svg
                className="w-16 h-16 text-gray-300"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M6 18L18 18"
                />
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M3 21L21 21"
                />
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M3 7L3 21"
                />
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M3 7L7 3L12 14L17 7L21 10"
                />
              </svg>
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Payment Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                Payment Trends
              </h2>
              <div className="flex items-center space-x-2 mt-2 md:mt-0">
                <span className="text-sm text-gray-600">Time period:</span>
                <select
                  value={paymentTimePeriod}
                  onChange={(e) => setPaymentTimePeriod(e.target.value)}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2"
                >
                  <option value={TIME_PERIODS.WEEK}>This Week</option>
                  <option value={TIME_PERIODS.MONTH}>This Month</option>
                  <option value={TIME_PERIODS.YEAR}>This Year</option>
                </select>
              </div>
            </div>

            {paymentChartData.labels.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <svg
                  className="h-16 w-16 text-gray-400 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <p className="text-lg font-medium">
                  No payment data available for this period
                </p>
                <p className="text-sm mt-2">
                  Try selecting a different time range
                </p>
              </div>
            ) : (
              <div className="h-80">
                <SafeChart
                  key={`payment-chart-${forceUpdate}-${paymentTimePeriod}`}
                  data={paymentData_chart}
                  options={paymentOptions}
                  minimumDataPoints={2}
                />
              </div>
            )}
          </div>

          {/* Rating Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                Customer Satisfaction
              </h2>
              <div className="flex items-center space-x-2 mt-2 md:mt-0">
                <span className="text-sm text-gray-600">Time period:</span>
                <select
                  value={ratingTimePeriod}
                  onChange={(e) => setRatingTimePeriod(e.target.value)}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2"
                >
                  <option value={TIME_PERIODS.WEEK}>This Week</option>
                  <option value={TIME_PERIODS.MONTH}>This Month</option>
                  <option value={TIME_PERIODS.YEAR}>This Year</option>
                </select>
              </div>
            </div>

            {ratingChartData.labels.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <svg
                  className="h-16 w-16 text-gray-400 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
                <p className="text-lg font-medium">
                  No rating data available for this period
                </p>
                <p className="text-sm mt-2">
                  Try selecting a different time range
                </p>
              </div>
            ) : (
              <div className="h-80">
                <Line
                  key={`rating-chart-${JSON.stringify(ratingChartData.labels)}`}
                  options={ratingOptions}
                  data={ratingData_chart}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
