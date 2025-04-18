"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // Import useRouter
import { io } from "socket.io-client";
import { useAuth } from "@/app/context/AuthContext"; // Import useAuth

// Initialize the socket connection outside the component
const socket = io("http://localhost:3000/api/socket", {
  transports: ["websocket", "polling"],
});

export default function Chat() {
  const router = useRouter(); // Initialize the router
  const { user } = useAuth(); // Get the current user from useAuth
  const customer_id = user?.customer_id; // Extract the customer_id from the user object

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]); // List of shops
  const [selectedShop, setSelectedShop] = useState<string | null>(null); // Selected shop

  useEffect(() => {
    // Fetch the list of shops from the API
    const fetchShops = async () => {
      try {
        const response = await fetch("/api/shops");
        if (!response.ok) {
          throw new Error("Failed to fetch shops");
        }
        const data = await response.json();
        setShops(data.shops); // Use `data.shops` to set the shops
      } catch (error) {
        console.error("Error fetching shops:", error);
      }
    };

    // Fetch messages for the current customer
    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/messages/customer/${customer_id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch messages");
        }
        const data = await response.json();
        setMessages(data); // Set messages from the database
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchShops();
    fetchMessages();

    // Listen for incoming messages
    socket.on("receiveMessage", (newMessage: any) => {
      setMessages((prevMessages) => [...prevMessages, newMessage]);
    });

    // Cleanup the socket connection on component unmount
    return () => {
      socket.off("receiveMessage"); // Remove the listener
      socket.disconnect();
    };
  }, [customer_id]);

  const sendMessage = async () => {
    if (message.trim() && selectedShop) {
      const newMessage = {
        sender: user?.name, // Use the user's name or a default value
        shop_id: selectedShop,
        customer_id, // Include the customer_id in the message
        text: message,
      };

      // Save the message to the database
      try {
        const response = await fetch(`/api/messages/customer/${customer_id}`, {
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
    router.push("/auth/dashboard"); // Navigate back to the dashboard
  };

  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-semibold">Chat</h3>
      <button
        onClick={handleExit}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Exit
      </button>
      {/* Shop Selection */}
      {/* Shop Selection */}
      <div className="mb-4">
        <label className="block mb-2 font-semibold">Select a Shop:</label>
        <select
          value={selectedShop || ""}
          onChange={(e) => setSelectedShop(e.target.value)}
          className="w-full border rounded px-2 py-1"
        >
          <option value="" disabled>
            -- Select a Shop --
          </option>
          {shops.map((shop, index) => (
            <option
              key={shop.shop_id || shop._id || index}
              value={shop.shop_id || shop._id}
            >
              {shop.name}
            </option>
          ))}
        </select>
      </div>

      {/* Chat Messages */}
      <div className="mt-4 h-64 overflow-y-auto border p-2">
        {messages
          .filter((msg) => msg.shop_id === selectedShop) // Show messages for the selected shop
          .map((msg, index) => (
            <div key={index} className="mb-2">
              <strong>{msg.sender}:</strong> {msg.text}
            </div>
          ))}
      </div>

      {/* Message Input */}
      <div className="mt-4 flex">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 border rounded px-2 py-1"
          disabled={!selectedShop} // Disable input if no shop is selected
        />
        <button
          onClick={sendMessage}
          className="ml-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          disabled={!selectedShop} // Disable button if no shop is selected
        >
          Send
        </button>
      </div>
    </div>
  );
}
