"use client";

import { useState, useEffect, useRef } from "react";
import { FaRegBell } from "react-icons/fa";
import Link from "next/link";
import io, { Socket } from "socket.io-client"; // Import socket.io-client

// Define the structure of a notification item
interface NotificationItem {
  _id: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
  recipient_id: string | number;
  recipient_type: "customer" | "admin";
}

interface NotificationProps {
  userType: "admin" | "client";
  userId?: string | number;
  customer_id?: string;
  admin_id?: string;
}

// Define the Socket.IO server URL
// If integrated with Next.js custom server, might be '/'
// If separate server, use its full URL e.g., 'http://localhost:3001'
const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "/"; // Use env variable or default

export default function Notification({ userType, userId }: NotificationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null); // Ref to store the socket instance

  // --- Initial Fetch (remains mostly the same) ---
  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      return;
    }
    const fetchNotifications = async () => {
      setLoading(true);
      setError(null);
      const apiUrl =
        userType === "admin"
          ? `/api/notifications/admin/${userId}`
          : `/api/notifications/customer/${userId}`;
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
          const errorData = await response.json();
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
  }, [userId, userType]);

  // --- Socket.IO Connection and Event Handling ---
  useEffect(() => {
    // Only connect if we have a userId
    if (!userId) {
      // Disconnect if userId becomes null (e.g., logout)
      if (socketRef.current) {
        console.log("Disconnecting socket due to missing userId");
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Avoid reconnecting if already connected
    if (socketRef.current) {
      return;
    }

    // Connect to the Socket.IO server
    // Pass userId for server-side identification/room joining
    console.log(`Attempting to connect socket for ${userType} ${userId}...`);
    const socket = io(SOCKET_SERVER_URL, {
      path: "/api/socket",
      query: { userId: String(userId), userType }, // Send user info for room joining
      reconnectionAttempts: 5, // Limit reconnection attempts
      reconnectionDelay: 5000, // Wait 5s before trying to reconnect
    });
    socketRef.current = socket;

    // --- Socket Event Listeners ---

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      // Optional: Explicitly join a room if your server requires it
      // socket.emit('join_room', `user_${userId}`);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      socketRef.current = null; // Clear ref on disconnect
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setError("Real-time connection failed."); // Update UI feedback
      socketRef.current = null; // Clear ref on connection error
    });

    // Listen for new notifications specific to this user
    socket.on("new_notification", (newNotification: NotificationItem) => {
      console.log("Received new notification via socket:", newNotification);
      // Prepend the new notification to the list for immediate visibility
      setNotifications((prevNotifications) => {
        // Optional: Prevent adding duplicates if the initial fetch might overlap
        if (prevNotifications.some((n) => n._id === newNotification._id)) {
          return prevNotifications;
        }
        return [newNotification, ...prevNotifications];
      });
      // Optional: Show a browser notification or highlight the bell icon
    });

    // --- Cleanup Function ---
    return () => {
      if (socketRef.current) {
        console.log("Disconnecting socket on component unmount");
        socketRef.current.off("connect"); // Remove listeners
        socketRef.current.off("disconnect");
        socketRef.current.off("connect_error");
        socketRef.current.off("new_notification");
        socketRef.current.disconnect(); // Disconnect socket
        socketRef.current = null; // Clear the ref
      }
    };
  }, [userId, userType]); // Re-run effect if userId or userType changes

  // --- Click Outside Handler (remains the same) ---
  useEffect(() => {
    // ... (existing click outside logic) ...
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
    // ... (existing click logic - TODO: mark as read API call) ...
    setIsOpen(false);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  // --- Render Logic (remains the same) ---
  return (
    <div className="relative" ref={dropdownRef}>
      {/* ... (Bell Icon Button) ... */}
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

      {/* ... (Dropdown Box) ... */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 md:w-96 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-30">
          {/* ... (Dropdown Header) ... */}
          <div className="py-2 px-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800">
              Notifications
            </h3>
          </div>
          {/* ... (Notification List) ... */}
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
            {!loading &&
              !error &&
              notifications.map((notification) => (
                <li
                  key={notification._id}
                  className={`${!notification.read ? "bg-blue-50" : "bg-white"} hover:bg-gray-50`}
                >
                  <Link
                    href={notification.link || "#"}
                    onClick={() => handleNotificationClick(notification._id)}
                    className="block px-4 py-3"
                    passHref
                    legacyBehavior={!notification.link}
                  >
                    <a className="block">
                      <p
                        className={`text-sm ${!notification.read ? "font-semibold text-gray-800" : "text-gray-600"} mb-1`}
                      >
                        {" "}
                        {notification.message}{" "}
                      </p>
                      <p className="text-xs text-gray-400">
                        {" "}
                        {new Date(notification.timestamp).toLocaleString()}{" "}
                      </p>
                    </a>
                  </Link>
                </li>
              ))}
          </ul>
          {/* ... (Optional Footer) ... */}
        </div>
      )}
    </div>
  );
}
