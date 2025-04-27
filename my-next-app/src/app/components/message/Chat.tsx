"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePusher } from "@/app/context/PusherContext";
import {
  FiSearch,
  FiSend,
  FiChevronLeft,
  FiShoppingBag,
  FiUser,
} from "react-icons/fi";
import { MdStorefront, MdPerson } from "react-icons/md";
import { useAuth } from "@/app/context/AuthContext";

// Define the shape of a message
interface Message {
  sender: string;
  text: string;
  timestamp: string | Date;
  // Add other fields if necessary, like _id from DB
}

// Define the shape of shop and customer data
interface Shop {
  shop_id: string;
  name: string;
  logo?: string; // Optional logo URL
}

interface Customer {
  customer_id: string;
  name: string;
  profile_image?: string | null; // Optional profile image
}

// Define the shape of a contact
interface Contact {
  id: string;
  name: string;
  image?: string | null;
  type: "shop" | "customer";
  lastMessage?: string;
  lastMessageTime?: string | Date;
  unread?: number;
}

// Define component props
interface ChatProps {
  userType: "client" | "admin";
  shop_id?: string; // Provided for admin user
  customer_id?: string; // Provided for client user
}

export default function Chat({ userType, shop_id, customer_id }: ChatProps) {
  // State for messages in current conversation
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // State for contacts and search
  const [shops, setShops] = useState<Shop[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // State for selected contact
  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    null
  );
  const [isMobileViewingMessages, setIsMobileViewingMessages] = useState(false);

  // Refs for scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get Pusher from context
  const { pusher, isConnected } = usePusher();
  const channelRef = useRef<any>(null);

  // Determine current contact IDs based on user type
  const current_customer_id =
    userType === "client" ? (customer_id ?? null) : (selectedContactId ?? null);
  const current_shop_id =
    userType === "client" ? (selectedContactId ?? null) : (shop_id ?? null);

  // Generate room_id only when both IDs are available
  const room_id =
    current_customer_id && current_shop_id
      ? `${current_customer_id}_${current_shop_id}`
      : null;

  // Flag to indicate if a conversation can be started/shown
  const isChatReady = !!room_id;

  // --- Data Fetching Effects ---

  // Fetch initial data based on user type
  useEffect(() => {
    const fetchInitialData = async () => {
      if (userType === "client") {
        // For clients, fetch all shops
        try {
          const res = await fetch("/api/shops");
          if (!res.ok) throw new Error("Failed to fetch shops");
          const data = await res.json();

          setShops(data.shops || []);

          // Convert shops to contacts format
          const shopContacts = (data.shops || []).map(
            (shop: Shop): Contact => ({
              id: shop.shop_id,
              name: shop.name,
              image: shop.logo || null,
              type: "shop",
            })
          );

          setContacts(shopContacts);
        } catch (err) {
          console.error("Error fetching shops:", err);
        }
      } else if (userType === "admin" && shop_id) {
        // For admins, fetch customers who have ordered from their shop
        try {
          const res = await fetch(`/api/shops/${shop_id}/customers`);
          if (!res.ok) throw new Error("Failed to fetch customers");
          const data = await res.json();

          setCustomers(data.customers || []);

          // Convert customers to contacts format
          const customerContacts = (data.customers || []).map(
            (customer: Customer): Contact => ({
              id: customer.customer_id,
              name: customer.name,
              image: customer.profile_image || null,
              type: "customer",
            })
          );

          setContacts(customerContacts);
        } catch (err) {
          console.error("Error fetching customers:", err);
        }
      }
    };

    fetchInitialData();
  }, [userType, shop_id]);

  // Fetch chat history for all contacts
  useEffect(() => {
    const fetchChatHistory = async () => {
      if (!contacts.length) return;

      const updatedContacts = [...contacts];

      for (const contact of updatedContacts) {
        let roomId;
        if (userType === "client" && customer_id) {
          roomId = `${customer_id}_${contact.id}`;
        } else if (userType === "admin" && shop_id) {
          roomId = `${contact.id}_${shop_id}`;
        } else {
          continue;
        }

        try {
          const response = await fetch(`/api/messages/room/${roomId}/latest`);
          if (!response.ok) continue;

          const data = await response.json();
          const latestMessage = data.latestMessage;

          if (latestMessage) {
            contact.lastMessage =
              latestMessage.text.substring(0, 30) +
              (latestMessage.text.length > 30 ? "..." : "");
            contact.lastMessageTime = latestMessage.timestamp;
            // Set unread count if needed based on your application logic
            // contact.unread = ...
          }
        } catch (error) {
          console.error(
            `[Chat] Error fetching latest message for ${roomId}:`,
            error
          );
        }
      }

      // Sort contacts by last message time (most recent first)
      updatedContacts.sort((a, b) => {
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return (
          new Date(b.lastMessageTime).getTime() -
          new Date(a.lastMessageTime).getTime()
        );
      });

      setContacts(updatedContacts);
    };

    fetchChatHistory();
  }, [contacts.length, userType, shop_id, customer_id]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- Pusher Subscription and Message Handling ---
  useEffect(() => {
    if (!pusher || !isConnected || !room_id) {
      console.log("[Chat] Not ready to subscribe:", {
        pusher,
        isConnected,
        room_id,
      });
      return;
    }

    console.log(`[Chat] Setting up subscription to channel: chat-${room_id}`);

    // Clean up previous subscription
    if (channelRef.current) {
      channelRef.current.unbind_all();
      pusher.unsubscribe(channelRef.current.name);
    }

    // Create new subscription - use a public channel for chat
    const channelName = `chat-${room_id}`;
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    // Debug subscription events
    channel.bind("pusher:subscription_succeeded", () => {
      console.log(`[Chat] Successfully subscribed to ${channelName}`);

      // Fetch initial messages after joining the channel
      fetchMessages();
    });

    channel.bind("pusher:subscription_error", (status: any) => {
      console.error(`[Chat] Failed to subscribe to ${channelName}:`, status);
    });

    // Bind to new-message event
    channel.bind("new-message", (message: Message) => {
      console.log(`[Chat] Received message:`, message);

      setMessages((prevMessages) => {
        // Skip duplicate messages
        const isDuplicate = prevMessages.some(
          (m) =>
            m.text === message.text &&
            m.sender === message.sender &&
            m.timestamp === message.timestamp
        );

        if (isDuplicate) {
          return prevMessages;
        }

        return [...prevMessages, message];
      });

      // Update contact's last message
      const { user } = useAuth();
      updateContactLastMessage(
        userType === "client"
          ? message.sender === user?.name
            ? current_shop_id
            : current_customer_id
          : message.sender === user?.name
            ? current_customer_id
            : current_shop_id,
        message
      );
    });

    // Cleanup function
    return () => {
      console.log(`[Chat] Cleaning up subscription to ${channelName}`);
      if (channelRef.current) {
        channelRef.current.unbind_all();
        pusher.unsubscribe(channelName);
        channelRef.current = null;
      }
    };
  }, [pusher, isConnected, room_id]);

  // Fetch messages function
  const fetchMessages = useCallback(async () => {
    if (!room_id) return;

    setIsLoadingMessages(true);
    try {
      const response = await fetch(`/api/messages/room/${room_id}`);
      if (!response.ok) throw new Error("Failed to fetch messages");

      const data = await response.json();
      console.log("[Chat] Fetched messages:", data.messages?.length || 0);
      setMessages(data.messages || []);
    } catch (error) {
      console.error("[Chat] Error fetching messages:", error);
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [room_id]);

  // --- Send Message Function ---
  const sendMessage = async () => {
    if (
      !room_id ||
      !current_customer_id ||
      !current_shop_id ||
      !inputValue.trim()
    ) {
      console.warn("[Chat] Cannot send message. Requirements not met");
      return;
    }

    const messageData = {
      room_id,
      customer_id: current_customer_id,
      shop_id: current_shop_id,
      sender: userType === "client" ? "Customer" : "Admin",
      text: inputValue.trim(),
      timestamp: new Date().toISOString(),
    };

    try {
      // Send the message to your API endpoint
      const response = await fetch(`/api/messages/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messageData),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      // Clear input after successful send
      setInputValue("");

      // No need for optimistic updates - the message will come back through Pusher
    } catch (error) {
      console.error("[Chat] Error sending message:", error);
      // Optionally show error to user
    }
  };

  // Update a contact's last message info
  const updateContactLastMessage = (
    contactId: string | null,
    message: Message
  ) => {
    if (!contactId) return;

    setContacts((prevContacts) => {
      const updatedContacts = prevContacts.map((contact) => {
        if (contact.id === contactId) {
          return {
            ...contact,
            lastMessage:
              message.text.substring(0, 30) +
              (message.text.length > 30 ? "..." : ""),
            lastMessageTime: message.timestamp,
            unread:
              contact.id !== selectedContactId ? (contact.unread || 0) + 1 : 0,
          };
        }
        return contact;
      });

      // Sort contacts to bring the one with new message to top
      return updatedContacts.sort((a, b) => {
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return (
          new Date(b.lastMessageTime).getTime() -
          new Date(a.lastMessageTime).getTime()
        );
      });
    });
  };

  // Handle contact selection
  const handleContactSelect = (contactId: string) => {
    setSelectedContactId(contactId);

    // Reset unread count
    setContacts((prevContacts) =>
      prevContacts.map((contact) =>
        contact.id === contactId ? { ...contact, unread: 0 } : contact
      )
    );

    // For mobile view, show conversation
    setIsMobileViewingMessages(true);
  };

  // Filter contacts based on search term
  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle back button for mobile view
  const handleBackToContacts = () => {
    setIsMobileViewingMessages(false);
  };

  // Get name of selected contact
  const selectedContactName =
    contacts.find((c) => c.id === selectedContactId)?.name || "Chat";

  // --- Render UI ---
  return (
    <div className="flex h-[calc(100vh-180px)] md:h-[calc(100vh-220px)] bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Contacts sidebar - hidden in mobile when viewing messages */}
      <div
        className={`w-full md:w-1/3 lg:w-1/4 bg-gray-50 border-r ${
          isMobileViewingMessages ? "hidden md:block" : "block"
        }`}
      >
        <div className="p-4 border-b">
          <h3 className="text-xl font-semibold text-gray-700">
            {userType === "client" ? "Shops" : "Customers"}
          </h3>

          {/* Search bar */}
          <div className="mt-3 relative">
            <div className="flex items-center">
              <input
                type="text"
                placeholder={`Search ${userType === "client" ? "shops" : "customers"}...`}
                className="w-full p-2 pl-10 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute left-3 top-2.5 text-gray-500">
                <FiSearch size={18} />
              </div>
            </div>
          </div>
        </div>

        {/* Contacts list */}
        <div className="overflow-y-auto h-[calc(100%-80px)]">
          {filteredContacts.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No {userType === "client" ? "shops" : "customers"} found
            </div>
          ) : (
            <ul>
              {filteredContacts.map((contact) => (
                <li
                  key={contact.id}
                  className={`p-3 border-b hover:bg-gray-100 cursor-pointer transition-colors ${
                    selectedContactId === contact.id
                      ? "bg-blue-50 border-l-4 border-l-blue-500"
                      : ""
                  }`}
                  onClick={() => handleContactSelect(contact.id)}
                >
                  <div className="flex items-start">
                    {/* Contact image */}
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                      {contact.image ? (
                        <img
                          src={contact.image}
                          alt={contact.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white text-xl">
                          {contact.type === "shop" ? (
                            <MdStorefront size={24} />
                          ) : (
                            <MdPerson size={24} />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Contact details */}
                    <div className="ml-3 flex-1">
                      <div className="flex justify-between">
                        <h4 className="font-medium text-gray-900">
                          {contact.name}
                        </h4>
                        {contact.lastMessageTime && (
                          <span className="text-xs text-gray-500">
                            {new Date(
                              contact.lastMessageTime
                            ).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {/* Last message preview */}
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-sm text-gray-500 truncate w-40">
                          {contact.lastMessage || "No messages yet"}
                        </p>

                        {/* Unread badge */}
                        {contact.unread && contact.unread > 0 && (
                          <span className="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {contact.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Messages container - shown in mobile when viewing messages */}
      <div
        className={`w-full md:w-2/3 lg:w-3/4 flex flex-col ${
          isMobileViewingMessages || !selectedContactId
            ? "block"
            : "hidden md:flex"
        }`}
      >
        {/* Conversation header */}
        <div className="p-4 border-b flex items-center">
          {/* Back button for mobile */}
          <button
            className="md:hidden mr-2 text-gray-600"
            onClick={handleBackToContacts}
          >
            <FiChevronLeft size={24} />
          </button>

          {selectedContactId ? (
            <>
              {/* Selected contact info */}
              <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                {contacts.find((c) => c.id === selectedContactId)?.image ? (
                  <img
                    src={
                      contacts.find((c) => c.id === selectedContactId)?.image ??
                      undefined
                    }
                    alt={selectedContactName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white">
                    {contacts.find((c) => c.id === selectedContactId)?.type ===
                    "shop" ? (
                      <MdStorefront size={20} />
                    ) : (
                      <MdPerson size={20} />
                    )}
                  </div>
                )}
              </div>
              <h3 className="ml-3 text-lg font-semibold text-gray-800">
                {selectedContactName}
              </h3>
            </>
          ) : (
            <h3 className="text-lg font-semibold text-gray-800">
              Select a {userType === "client" ? "shop" : "customer"} to start
              chatting
            </h3>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-grow overflow-y-auto p-4 bg-gray-50">
          {!isChatReady ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-500">
                Please select a {userType === "client" ? "shop" : "customer"} to
                start chatting
              </p>
            </div>
          ) : isLoadingMessages ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-500">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-500">
                No messages yet. Start the conversation!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${
                    msg.sender ===
                    (userType === "client" ? "Customer" : "Admin")
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-4 py-2 shadow-sm ${
                      msg.sender ===
                      (userType === "client" ? "Customer" : "Admin")
                        ? "bg-blue-500 text-white rounded-br-none"
                        : "bg-white rounded-bl-none"
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                    <p className="text-xs mt-1 opacity-75 text-right">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="p-3 border-t">
          {isChatReady ? (
            <div className="flex items-center">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message..."
                className="flex-grow rounded-l-lg border border-r-0 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!inputValue.trim()}
                className="bg-blue-500 hover:bg-blue-600 text-white rounded-r-lg px-4 py-2 disabled:bg-gray-400"
              >
                <FiSend size={20} />
              </button>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-2">
              Select a {userType === "client" ? "shop" : "customer"} to start
              chatting
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
