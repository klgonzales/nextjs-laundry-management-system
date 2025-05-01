"use client";

// Update the imports to include additional outline icons
import { useState, useEffect, useRef } from "react";
import { FaRegBell } from "react-icons/fa";
import { useAuth } from "@/app/context/AuthContext";
import { usePusher } from "@/app/context/PusherContext";
import type { Channel } from "pusher-js";
import { useSession } from "next-auth/react";
// Add these new icon imports
// To this:
import {
  FiBox,
  FiTruck,
  FiCalendar,
  FiDroplet,
  FiShoppingCart,
  FiTag,
  FiAlertTriangle,
  FiCheck,
  FiDollarSign,
  FiStar,
  FiFile,
  FiTrash,
} from "react-icons/fi";

// Define the structure of a notification item
interface NotificationItem {
  _id: string;
  message: string;
  timestamp: string;
  read: boolean;
  recipient_id: string | number;
  recipient_type: "customer" | "admin";
}

export default function Notification() {
  const { user, isLoading: authLoading } = useAuth(); // Add isLoading if available in your AuthContext
  const { pusher, isConnected } = usePusher();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<Channel | null>(null); // Ref to store the Pusher channel

  const currentUserId = user?.admin_id || user?.customer_id;
  const currentUserType = user?.admin_id
    ? "admin"
    : user?.customer_id
      ? "customer"
      : null;

  // --- Initial Fetch (remains the same) ---
  useEffect(() => {
    // Early return if user is null and auth is not loading
    if (!currentUserId && !authLoading) {
      // Cleanup if needed
      if (channelRef.current) {
        try {
          channelRef.current.unbind_all();
          if (pusher) {
            pusher.unsubscribe(channelRef.current.name);
          }
          channelRef.current = null;
        } catch (error) {
          console.error(
            "[Notification] Error cleaning up on user logout:",
            error
          );
        }
      }
      return;
    }
    // Early return with better logging if essential data is missing
    // if (!pusher || !isConnected) {
    //   console.log(
    //     `[Notifications] Pusher not ready yet. Connected: ${isConnected}`
    //   );
    //   return;
    // }

    // if (!currentUserId || !currentUserType) {
    //   // Only log this as an error if we're not in a loading state
    //   if (!authLoading) {
    //     console.log(
    //       `[Notifications] No user ID found and not in loading state.`
    //     );
    //   } else {
    //     console.log(`[Notifications] Auth still loading, will try again soon.`);
    //   }
    //   return;
    // }

    // if (!currentUserId || !currentUserType) {
    //   setNotifications([]);
    //   setLoading(false);
    //   return;
    // }
    if (currentUserId && currentUserType && !authLoading) {
      const fetchNotifications = async () => {
        setLoading(true);
        setError(null);
        const apiUrl =
          currentUserType === "admin"
            ? `/api/notifications/admin/${currentUserId}`
            : `/api/notifications/customer/${currentUserId}`;
        try {
          const response = await fetch(apiUrl);
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to fetch notifications");
          }
          const data = await response.json();
          setNotifications(data.notifications || []);
        } catch (err: any) {
          console.error("Error fetching notifications:", err);
          setError(err.message || "An error occurred");
          setNotifications([]);
        } finally {
          setLoading(false);
        }
      };
      fetchNotifications();
    }
  }, [pusher, isConnected, currentUserId, currentUserType, authLoading]);

  // --- Pusher Event Handling (Modified + Cleaned Up) ---
  useEffect(() => {
    // Early return if essential data is missing
    if (!pusher || !isConnected || !currentUserId || !currentUserType) {
      console.log(`[Notifications] Skipping subscription: Missing data.`);

      // Unsubscribe if previously subscribed
      if (channelRef.current) {
        console.log(
          `[Notifications] Unsubscribing from ${channelRef.current.name} due to missing user/connection`
        );
        pusher?.unsubscribe(channelRef.current.name);
        channelRef.current = null;
      }

      return;
    }

    // Inside the Pusher Event Handling useEffect, modify this line:
    const channelName = `private-${currentUserType === "customer" ? "client" : currentUserType}-${currentUserId}`;

    // Prevent duplicate subscriptions
    if (
      channelRef.current &&
      channelRef.current.name === channelName &&
      channelRef.current.subscribed
    ) {
      console.log(`[Notifications] Already subscribed to ${channelName}`);
      return;
    }

    // Unsubscribe from previous channel if it differs
    if (channelRef.current && channelRef.current.name !== channelName) {
      console.log(
        `[Notifications] Switching channel. Unsubscribing from ${channelRef.current.name}`
      );
      pusher.unsubscribe(channelRef.current.name);
      channelRef.current = null;
    }

    console.log(`[Notifications] Subscribing to ${channelName}`);
    const channel = pusher.subscribe(channelName);

    if (!channel) {
      console.warn(`[Notifications] Failed to subscribe to ${channelName}`);
      return;
    }

    channelRef.current = channel;

    const handleNewNotification = (newNotification: NotificationItem) => {
      console.log(`[Notifications] New notification:`, newNotification);
      setNotifications((prev) => {
        if (prev.some((n) => n._id === newNotification._id)) {
          return prev;
        }
        return [newNotification, ...prev];
      });
    };

    channel.bind("pusher:subscription_succeeded", () => {
      console.log(`[Notifications] Successfully subscribed to ${channelName}`);
      setError(null);
    });

    channel.bind("pusher:subscription_error", (status: any) => {
      console.error(
        `[Notifications] Subscription error for ${channelName}:`,
        status
      );
      setError(
        `Real-time connection failed. Status: ${JSON.stringify(status)}. Check console/server logs.`
      );
    });

    channel.bind("new-notification", handleNewNotification);

    // Inside the useEffect where you set up channel.bind events:
    channel.bind("notifications-all-read", () => {
      console.log("[Notifications] Received all-read event");
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, read: true }))
      );
    });

    // Cleanup on component unmount or dependency change
    return () => {
      if (channelRef.current?.name === channelName) {
        console.log(
          `[Notifications] Cleanup: Unsubscribing from ${channelName}`
        );
        channelRef.current.unbind("new-notification", handleNewNotification);
        pusher.unsubscribe(channelName);
        channelRef.current = null;
      }
    };
  }, [pusher, isConnected, currentUserId, currentUserType]); // <- include currentUserType too!

  // --- Click Outside Handler (remains the same) ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Add this function inside your component, before the return statement
  const markAllAsRead = async () => {
    // if (!currentUserId || !currentUserType || unreadCount === 0) {
    //   return;
    // }

    try {
      // setLoading(true);

      console.log(
        `[Notifications] Marking all as read for ${currentUserType} ${currentUserId}`
      );

      const response = await fetch("/api/notifications/mark-all-as-read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentUserId,
          userType: currentUserType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || "Failed to mark notifications as read"
        );
      }

      // Update local state to mark all notifications as read
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, read: true }))
      );

      console.log("[Notifications] All notifications marked as read");
    } catch (err: any) {
      console.error("[Notifications] Error marking all as read:", err);
      setError(err.message || "Failed to mark all as read");
    } finally {
      setLoading(false);
    }
  };

  // --- Notification Click Handler (remains the same) ---
  const handleNotificationClick = async (notificationId: string) => {
    // Mark notification as read locally immediately
    setNotifications((prev) =>
      prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n))
    );
    setIsOpen(false); // Close dropdown

    // API call to mark notification as read on the server
    try {
      if (currentUserId && currentUserType) {
        await fetch(`/api/notifications/${notificationId}/read`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch (error) {
      console.error("Failed to mark notification as read on server:", error);
    }
  };

  // Render null during auth loading or when user is not available
  // if (authLoading) {
  //   return null; // Or return a loading spinner specifically for notifications
  // }
  // --- Render Logic (remains the same) ---
  // if (!currentUserId) {
  //   return null; // Don't render if not logged in
  // }
  // Add these logs to debug
  useEffect(() => {
    console.log("[Notifications] Auth user:", user);
    console.log("[Notifications] Determined user type:", currentUserType);
    console.log("[Notifications] Determined user ID:", currentUserId);
  }, [user, currentUserType, currentUserId]);

  // Update your return JSX to style the notifications
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={toggleDropdown}
        className="relative border-0 p-2 rounded-full shadow-sm hover:bg-[#EADDFF]"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <FaRegBell className="h-6 w-6 text-black" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-300 text-xs font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Box */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 md:w-96 origin-top-right rounded-lg bg-white shadow-lg z-30 p-4">
          {/* Dropdown Header */}
          <div className="py-3 px-4 border-b border-gray-100">
            <h3 className="text-lg font-medium text-gray-700">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent dropdown from closing
                  markAllAsRead();
                }}
                disabled={loading}
                className={`text-xs mt-1 px-3 py-1 rounded ${
                  loading
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                }`}
              >
                {loading ? "Processing..." : "Mark all read"}
              </button>
            )}
          </div>
          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <div className="px-4 py-6 text-sm text-gray-500 text-center">
                Loading...
              </div>
            )}
            {error && (
              <div className="px-4 py-6 text-sm text-red-600 text-center">
                {error}
              </div>
            )}
            {!loading && !error && notifications.length === 0 && (
              <div className="px-4 py-6 text-sm text-gray-500 text-center">
                No new notifications.
              </div>
            )}
            <div>
              {!loading &&
                !error &&
                notifications.map((notification) => {
                  // Determine which icon to use based on notification content
                  let icon = <FiBox className="h-6 w-6" />;

                  if (notification.message.includes("delivery")) {
                    icon = <FiTruck className="h-6 w-6" />;
                  } else if (notification.message.includes("appointment")) {
                    icon = <FiCalendar className="h-6 w-6" />;
                  } else if (notification.message.includes("washing")) {
                    icon = <FiDroplet className="h-6 w-6" />;
                  } else if (notification.message.includes("picked up")) {
                    icon = <FiShoppingCart className="h-6 w-6" />;
                  } else if (
                    notification.message.includes("off") ||
                    notification.message.includes("discount") ||
                    notification.message.includes("Service added") ||
                    notification.message.includes("Machine added")
                  ) {
                    icon = <FiTag className="h-6 w-6" />;
                  } else if (notification.message.includes("unpaid")) {
                    icon = <FiAlertTriangle className="h-6 w-6" />;
                  } else if (notification.message.includes("Payment")) {
                    icon = <FiDollarSign className="h-6 w-6" />;
                  } else if (
                    notification.message.includes("Feedback") ||
                    notification.message.includes("feedback")
                  ) {
                    icon = <FiStar className="h-6 w-6" />;
                  } else if (notification.message.includes("deleted")) {
                    icon = <FiTrash className="h-6 w-6" />;
                  } else if (notification.message.includes("status updated")) {
                    icon = <FiFile className="h-6 w-6" />;
                  } else if (
                    notification.message.includes("completed") ||
                    notification.message.includes("done")
                  ) {
                    icon = <FiCheck className="h-6 w-6" />;
                  }

                  // Modify the notification rendering section by removing the tracking link
                  // Replace the return inside your map function with this updated version:

                  return (
                    <div
                      key={notification._id}
                      className={`${!notification.read ? "border-l-4 border-blue-400" : ""} hover:bg-[#EADDFF] cursor-pointer rounded-lg`}
                      onClick={() => handleNotificationClick(notification._id)}
                    >
                      <div className="flex items-start p-4">
                        <div className={`p-2 rounded-lg mr-3`}>{icon}</div>
                        <div className="flex-1">
                          <p
                            className={`text-sm ${!notification.read ? "font-semibold text-gray-800" : "text-gray-700"} mb-1`}
                          >
                            {notification.message}
                          </p>
                          <div className="flex items-center">
                            <p className="text-xs text-gray-400">
                              {new Date(
                                notification.timestamp
                              ).toLocaleString()}
                            </p>
                            {!notification.read && (
                              <span className="ml-2 inline-block w-2 h-2 rounded-full bg-blue-400"></span>
                            )}
                          </div>
                          {/* Track/Action link removed */}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
