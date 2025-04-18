"use client";

import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation"; // Import useRouter for navigation
import { useAuth } from "@/app/context/AuthContext"; // Import useAuth to get shop_id

// Initialize the socket connection outside the component
const socket = io("http://localhost:3000/api/socket", {
  transports: ["websocket", "polling"],
});

export default function AdminChat() {
  const router = useRouter(); // Initialize the router
  const { user } = useAuth();
  const shop_id = user?.shops?.[0]?.shop_id; // Dynamically get the shop_id from the user's shops

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null); // Selected user for chat
  const [uniqueUsers, setUniqueUsers] = useState<string[]>([]); // List of unique users

  useEffect(() => {
    if (!shop_id) return; // Ensure shop_id is available

    // Fetch messages for the current shop from the database
    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/messages/shop/${shop_id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch messages");
        }
        const data = await response.json();
        setMessages(data); // Set messages from the database

        // Extract unique users who have messaged the shop
        const users = Array.from(
          new Set(data.map((msg: any) => msg.customer_id))
        ) as string[];
        setUniqueUsers(users);
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages();

    // Listen for incoming messages directed to this shop
    socket.on("receiveMessage", (newMessage: any) => {
      if (newMessage.shop_id === shop_id) {
        setMessages((prevMessages) => [...prevMessages, newMessage]);

        // Update the unique users list if a new user sends a message
        if (!uniqueUsers.includes(newMessage.customer_id)) {
          setUniqueUsers((prevUsers) => [...prevUsers, newMessage.customer_id]);
        }
      }
    });

    // Cleanup the socket connection and event listener on component unmount
    return () => {
      socket.off("receiveMessage"); // Remove the listener
      socket.disconnect(); // Disconnect the socket
    };
  }, [shop_id, uniqueUsers]); // Re-run the effect if shop_id or uniqueUsers changes

  const sendMessage = async () => {
    if (message.trim() && selectedUser) {
      const newMessage = {
        sender: "Admin",
        shop_id,
        customer_id: selectedUser,
        text: message,
      }; // Include shop_id and customer_id in the message

      // Save the message to the database
      try {
        const response = await fetch(`/api/messages/shop/${shop_id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newMessage),
        });

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        const savedMessage = await response.json();
        setMessages((prevMessages) => [...prevMessages, savedMessage]);
        setMessage("");
      } catch (error) {
        console.error("Error sending message:", error);
      }
    }
  };

  const handleExit = () => {
    if (user?.shops?.[0]?.type === "self-service") {
      router.push("/admin/shop-self-service/dashboard");
    } else if (user?.shops?.[0]?.type === "pickup-delivery") {
      router.push("/admin/shop-pickup-delivery/dashboard");
    } else {
      router.push("/dashboard"); // Default fallback
    }
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-1/4 border-r p-4">
        <h3 className="text-lg font-semibold mb-4">Users</h3>
        <ul>
          {uniqueUsers.map((userId) => (
            <li
              key={userId}
              onClick={() => setSelectedUser(userId)} // Set the selected user
              className={`cursor-pointer p-2 rounded ${
                selectedUser === userId
                  ? "bg-blue-500 text-white"
                  : "hover:bg-gray-200"
              }`}
            >
              {userId}
            </li>
          ))}
        </ul>
        <button
          onClick={handleExit}
          className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Exit
        </button>
      </div>

      {/* Chat Section */}
      <div className="flex-1 p-4">
        <h3 className="text-lg font-semibold">Admin Chat</h3>
        <div className="mt-4 h-64 overflow-y-auto border p-2">
          {messages
            .filter((msg) => msg.customer_id === selectedUser) // Show messages for the selected user
            .map((msg, index) => (
              <div key={index} className="mb-2">
                <strong>{msg.sender}:</strong> {msg.text}
              </div>
            ))}
        </div>
        {selectedUser && (
          <div className="mt-4 flex">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 border rounded px-2 py-1"
            />
            <button
              onClick={sendMessage}
              className="ml-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
