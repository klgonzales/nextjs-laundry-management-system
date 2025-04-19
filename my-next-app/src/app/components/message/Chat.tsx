"use client";

import { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

// Define the shape of a message
interface Message {
  sender: string;
  text: string;
  timestamp: string | Date; // Allow both string (from fetch) and Date (optimistic)
  // Add other fields if necessary, like _id from DB
}

// Define the shape of the data emitted for sending a message
interface SendMessageData {
  room_id: string;
  customer_id: string;
  shop_id: string;
  sender: string;
  text: string;
}

// Define the shape of shop and customer data
interface Shop {
  shop_id: string;
  name: string;
  // Add other shop properties if needed
}

interface Customer {
  customer_id: string;
  name: string;
  // Add other customer properties if needed
}

// Define component props
interface ChatProps {
  userType: "client" | "admin";
  shop_id?: string; // Provided for admin user
  customer_id?: string; // Provided for client user
}

// Initialize socket connection outside the component
// Ensure this runs only once on the client-side
let socket: Socket | null = null;
if (typeof window !== "undefined") {
  // Check if running in the browser
  socket = io({
    path: "/api/socket",
    autoConnect: false, // Connect manually after room_id is determined
  });
}

export default function Chat({ userType, shop_id, customer_id }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShop, setSelectedShop] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(socket?.connected || false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Determine the IDs relevant for the current room
  const current_customer_id =
    userType === "client" ? customer_id : selectedCustomer;
  const current_shop_id = userType === "client" ? selectedShop : shop_id;

  // Generate room_id only when both IDs are available
  const room_id =
    current_customer_id && current_shop_id
      ? `${current_customer_id}_${current_shop_id}`
      : null;

  // Flag to indicate if a conversation can be started/shown
  const isChatReady = !!room_id;

  // --- Data Fetching Effects ---

  // Fetch shops for client user
  useEffect(() => {
    if (userType === "client") {
      fetch("/api/shops") // Adjust API endpoint if needed
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch shops");
          return res.json();
        })
        .then((data) => setShops(data.shops || []))
        .catch((err) => console.error("Error fetching shops:", err));
    }
  }, [userType]);

  // Fetch unique customers for admin user based on shop's orders
  useEffect(() => {
    const fetchUniqueCustomers = async () => {
      if (userType === "admin" && shop_id) {
        try {
          // Fetch shop details to get order list
          const shopResponse = await fetch(`/api/shops/${shop_id}`); // Adjust API endpoint
          if (!shopResponse.ok) throw new Error("Failed to fetch shop details");
          const shopData = await shopResponse.json();
          const orders = shopData?.shop?.orders || [];

          if (orders.length === 0) {
            setCustomers([]);
            return;
          }

          // Get unique customer IDs from orders
          const customerIds = [
            ...new Set(orders.map((order: any) => order.customer_id)),
          ];

          // Fetch details for each unique customer
          const customerPromises = customerIds.map(async (cId) => {
            try {
              const customerResponse = await fetch(`/api/customers/${cId}`); // Adjust API endpoint
              if (!customerResponse.ok) return null; // Skip if fetch fails
              const customerData = await customerResponse.json();
              return customerData?.customer || null;
            } catch {
              return null; // Handle individual fetch errors
            }
          });

          const detailedCustomers = (
            await Promise.all(customerPromises)
          ).filter((customer): customer is Customer => customer !== null);

          setCustomers(detailedCustomers);
        } catch (error) {
          console.error("Error fetching shop or customers:", error);
          setCustomers([]); // Reset customers on error
        }
      }
    };

    fetchUniqueCustomers();
  }, [userType, shop_id]);

  // --- Socket and Message Handling Effect ---

  // Define message handler using useCallback to keep its reference stable
  const handleReceiveMessage = useCallback((message: Message) => {
    console.log("Client received message:", message);
    // Add message only if it's not already present (simple check by text/timestamp)
    setMessages((prevMessages) => {
      // Basic duplicate check - might need refinement based on message structure (_id?)
      if (
        prevMessages.some(
          (m) => m.text === message.text && m.sender === message.sender
        )
      ) {
        return prevMessages;
      }
      return [...prevMessages, message];
    });
  }, []);

  useEffect(() => {
    if (!socket) return; // Socket not initialized

    // Connect socket manually when room_id becomes available
    if (room_id && !socket.connected) {
      console.log("Attempting to connect socket...");
      socket.connect();
    }

    // Disconnect if room becomes invalid (e.g., user deselects shop/customer)
    if (!room_id && socket.connected) {
      console.log("Disconnecting socket as room is no longer valid.");
      socket.disconnect();
      setMessages([]); // Clear messages when disconnecting
    }

    const handleConnect = () => {
      console.log("Socket connected:", socket?.id);
      setIsConnected(true);
      if (room_id) {
        console.log(`Socket joining room: ${room_id}`);
        socket?.emit("joinRoom", { room_id });

        // Fetch initial messages only after joining the room
        setIsLoadingMessages(true);
        fetch(`/api/messages/room/${room_id}`) // Adjust API endpoint
          .then((res) => {
            if (!res.ok) throw new Error("Failed to fetch messages");
            return res.json();
          })
          .then((data) => {
            console.log("Fetched initial messages:", data.messages);
            setMessages(data.messages || []);
          })
          .catch((err) => {
            console.error("Error fetching messages:", err);
            setMessages([]); // Clear messages on error
          })
          .finally(() => {
            setIsLoadingMessages(false);
          });
      }
    };

    const handleDisconnect = () => {
      console.log("Socket disconnected");
      setIsConnected(false);
      setMessages([]); // Clear messages on disconnect
    };

    // Setup listeners
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("receiveMessage", handleReceiveMessage);

    // Cleanup: remove listeners when component unmounts or room_id changes
    return () => {
      console.log("Cleaning up socket listeners for room:", room_id);
      socket?.off("connect", handleConnect);
      socket?.off("disconnect", handleDisconnect);
      socket?.off("receiveMessage", handleReceiveMessage);

      // Optional: Leave room explicitly if needed, though disconnect handles server-side cleanup
      // if (room_id) {
      //   socket?.emit('leaveRoom', { room_id });
      // }

      // Do not disconnect here if the component might re-render with the same room_id
      // Disconnection is handled above if room_id becomes null
    };
  }, [room_id, handleReceiveMessage]); // Depend on room_id and the stable handler

  // --- Send Message Function ---

  const sendMessage = () => {
    // Ensure all required data is present
    if (
      !socket ||
      !isConnected ||
      !inputValue.trim() ||
      !room_id ||
      !current_customer_id ||
      !current_shop_id
    ) {
      console.warn("Cannot send message. Requirements not met:", {
        isConnected,
        inputValue: inputValue.trim(),
        room_id,
        current_customer_id,
        current_shop_id,
      });
      return;
    }

    const messageData: SendMessageData = {
      room_id,
      customer_id: current_customer_id,
      shop_id: current_shop_id,
      sender: userType === "client" ? "Customer" : "Admin",
      text: inputValue.trim(),
    };

    console.log("Client sending message:", messageData);
    socket.emit("sendMessage", messageData);

    // Clear the input field *after* successfully emitting
    setInputValue("");

    // Note: No optimistic UI update here. We rely on the server
    // broadcasting the message back via 'receiveMessage' for consistency.
  };

  // --- Render Logic ---

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto p-4 border rounded-lg shadow-md bg-white">
      <h3 className="text-xl font-semibold mb-4 text-center text-gray-700">
        {userType === "client" ? "Chat with Shop" : "Chat with Customer"}
      </h3>

      {/* Shop Selection for Customers */}
      {userType === "client" && (
        <div className="mb-4">
          <label
            htmlFor="shop-select"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Select a Shop:
          </label>
          <select
            id="shop-select"
            value={selectedShop || ""}
            onChange={(e) => setSelectedShop(e.target.value || null)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
          >
            <option value="">-- Select a Shop --</option>
            {shops.map((shop) => (
              <option key={shop.shop_id} value={shop.shop_id}>
                {shop.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Customer Selection for Admins */}
      {userType === "admin" && (
        <div className="mb-4">
          <label
            htmlFor="customer-select"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Select a Customer:
          </label>
          <select
            id="customer-select"
            value={selectedCustomer || ""}
            onChange={(e) => setSelectedCustomer(e.target.value || null)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
          >
            <option value="">-- Select a Customer --</option>
            {customers.map((customer) => (
              <option key={customer.customer_id} value={customer.customer_id}>
                {customer.name} (ID: {customer.customer_id})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-grow mt-4 h-64 overflow-y-auto border p-3 bg-gray-50 rounded mb-4">
        {!isChatReady ? (
          <p className="text-gray-500 text-center my-auto">
            Please select a {userType === "client" ? "shop" : "customer"} above
            to start chatting.
          </p>
        ) : isLoadingMessages ? (
          <p className="text-gray-500 text-center my-auto">
            Loading messages...
          </p>
        ) : messages.length === 0 ? (
          <p className="text-gray-500 text-center my-auto">
            No messages yet. Start the conversation!
          </p>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index} // Consider using a unique message ID from DB if available
              className={`mb-2 p-2 rounded max-w-[80%] ${
                msg.sender === (userType === "client" ? "Customer" : "Admin")
                  ? "bg-blue-100 ml-auto text-right" // User's own message
                  : "bg-gray-200 mr-auto text-left" // Other user's message
              }`}
            >
              <strong className="text-sm block">{msg.sender}</strong>
              <span className="text-md">{msg.text}</span>
              {/* Optional: Display timestamp */}
              {/* <span className="text-xs text-gray-500 block mt-1">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span> */}
            </div>
          ))
        )}
      </div>

      {/* Input Field and Send Button */}
      <div className="mt-auto flex">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={
            isChatReady && isConnected
              ? "Type your message..."
              : "Select conversation above"
          }
          className="flex-1 border rounded-l px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
          disabled={!isChatReady || !isConnected}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }} // Send on Enter key
        />
        <button
          onClick={sendMessage}
          className="px-4 py-2 bg-blue-500 text-white rounded-r hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:bg-gray-400 disabled:cursor-not-allowed"
          disabled={!isChatReady || !isConnected || !inputValue.trim()}
        >
          Send
        </button>
      </div>
      {/* Connection Status Indicator (Optional) */}
      <p
        className={`text-xs text-center mt-2 ${isConnected ? "text-green-600" : "text-red-600"}`}
      >
        {isConnected ? "Connected" : "Disconnected"}
      </p>
    </div>
  );
}
