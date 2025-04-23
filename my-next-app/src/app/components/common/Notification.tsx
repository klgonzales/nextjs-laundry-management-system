"use client";

import { useState, useEffect, useRef } from "react";
import { FaRegBell } from "react-icons/fa";
import { useAuth } from "@/app/context/AuthContext";
// --- Remove SocketContext ---
// import { useSocket } from "@/app/context/SocketContext";
// --- Add Pusher Client ---
import { pusherClient } from "@/app/lib/pusherClient";
import type { Channel } from "pusher-js"; // Import Channel type

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
  const { user } = useAuth();
  // --- Remove socket state ---
  // const { socket, isConnected } = useSocket();
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
      ? "client"
      : null;

  // --- Initial Fetch (remains the same) ---
  useEffect(() => {
    if (!currentUserId || !currentUserType) {
      setNotifications([]);
      setLoading(false);
      return;
    }
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
  }, [currentUserId, currentUserType]);

  // --- Pusher Event Handling ---
  useEffect(() => {
    if (!currentUserId || !currentUserType) {
      // If user logs out or changes, unsubscribe from previous channel
      if (channelRef.current) {
        console.log(
          `Notifications: Unsubscribing from Pusher channel ${channelRef.current.name}`
        );
        channelRef.current.unbind_all(); // Unbind all listeners first
        pusherClient.unsubscribe(channelRef.current.name);
        channelRef.current = null;
      }
      return;
    }

    // Determine the channel name (use private channels for security)
    const channelName = `private-${currentUserType}-${currentUserId}`;

    // Avoid re-subscribing if already on the correct channel
    if (channelRef.current && channelRef.current.name === channelName) {
      console.log(`Notifications: Already subscribed to ${channelName}`);
      return;
    }

    // Unsubscribe from any previous channel if name differs
    if (channelRef.current && channelRef.current.name !== channelName) {
      console.log(
        `Notifications: Unsubscribing from old Pusher channel ${channelRef.current.name}`
      );
      channelRef.current.unbind_all();
      pusherClient.unsubscribe(channelRef.current.name);
      channelRef.current = null;
    }

    console.log(`Notifications: Subscribing to Pusher channel ${channelName}`);
    const channel = pusherClient.subscribe(channelName);
    channelRef.current = channel; // Store the channel in the ref

    // Handle subscription success/failure
    channel.bind("pusher:subscription_succeeded", () => {
      console.log(`Notifications: Successfully subscribed to ${channelName}`);
    });

    channel.bind("pusher:subscription_error", (status: number) => {
      console.error(
        `Notifications: Failed to subscribe to ${channelName}, status: ${status}. Check auth endpoint.`
      );
      // Handle auth failure (e.g., show error, redirect)
      setError(
        `Real-time connection failed (Auth Error ${status}). Please refresh.`
      );
    });

    // Bind to the 'new-notification' event
    const handleNewNotification = (newNotification: NotificationItem) => {
      console.log(
        "Notifications: Received new_notification via Pusher:",
        newNotification
      );
      setNotifications((prevNotifications) => {
        // Avoid duplicates
        if (prevNotifications.some((n) => n._id === newNotification._id)) {
          return prevNotifications;
        }
        // Add to the start of the list
        return [newNotification, ...prevNotifications];
      });
      // Optional: Trigger a browser notification or sound
    };

    console.log(
      `Notifications: Binding to 'new-notification' on ${channelName}`
    );
    channel.bind("new-notification", handleNewNotification);

    // Cleanup function
    return () => {
      if (channelRef.current && channelRef.current.name === channelName) {
        console.log(
          `Notifications: Unbinding from 'new-notification' on ${channelName}`
        );
        channelRef.current.unbind("new-notification", handleNewNotification);
        // Decide if you want to unsubscribe immediately on component unmount
        // or keep the subscription active across navigation.
        // For a persistent notification component in a layout, you might not unsubscribe here.
        // If this component unmounts frequently, keep the unsubscribe.
        // console.log(`Notifications: Unsubscribing from Pusher channel ${channelName}`);
        // pusherClient.unsubscribe(channelName);
        // channelRef.current = null;
      }
    };
    // Depend on user ID and type to handle login/logout changes
  }, [currentUserId, currentUserType]);

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

  const unreadCount = notifications.filter((n) => !n.read).length;

  // --- Render Logic (remains the same) ---
  if (!currentUserId) {
    return null; // Don't render if not logged in
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={toggleDropdown}
        className="relative border-0 p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <FaRegBell className="h-6 w-6 text-black" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Box */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 md:w-96 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-30">
          {/* Dropdown Header */}
          <div className="py-2 px-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800">
              Notifications
            </h3>
          </div>
          {/* Notification List */}
          <ul className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {loading && (
              <li className="px-4 py-3 text-sm text-gray-500 text-center">
                {" "}
                Loading...{" "}
              </li>
            )}
            {error && (
              <li className="px-4 py-3 text-sm text-red-600 text-center">
                {" "}
                {error}{" "}
              </li>
            )}
            {!loading && !error && notifications.length === 0 && (
              <li className="px-4 py-3 text-sm text-gray-500 text-center">
                {" "}
                No new notifications.{" "}
              </li>
            )}
            <div>
              {!loading &&
                !error &&
                notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`${!notification.read ? "bg-blue-50" : "bg-white"} hover:bg-gray-50 cursor-pointer`}
                    onClick={() => handleNotificationClick(notification._id)}
                  >
                    <div className="block px-4 py-3">
                      <p
                        className={`text-sm ${!notification.read ? "font-semibold text-gray-800" : "text-gray-600"} mb-1`}
                      >
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(notification.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </ul>
        </div>
      )}
    </div>
  );
}
