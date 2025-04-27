"use client";

import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { usePusher } from "@/app/context/PusherContext"; // Add this import
import { useEffect, useState, useRef } from "react"; // Add useRef
import Home from "@/app/components/common/Home";

export default function ChooseService() {
  const router = useRouter();
  const { shop_id } = useParams() as { shop_id: string }; // Explicitly type shop_id
  const { user } = useAuth(); // Get current user
  const { pusher, isConnected } = usePusher(); // Add Pusher hook
  const channelRef = useRef<any>(null); // For keeping track of subscriptions

  interface Shop {
    name: string;
    services: Service[];
    type: string;
  }

  interface Service {
    name: string;
    description: string;
    price_per_kg: number;
    service_id: string;
  }

  const [shop, setShop] = useState<Shop | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [hasNewServices, setHasNewServices] = useState(false); // State to track new services

  useEffect(() => {
    const fetchShopDetails = async () => {
      try {
        const response = await fetch(`/api/shops/${shop_id}`);
        if (!response.ok) {
          throw new Error("Failed to fetch shop details");
        }
        const data = await response.json();
        setShop(data.shop); // Assuming the API returns { shop: {...} }
      } catch (error) {
        console.error("Error fetching shop details:", error);
      }
    };

    if (shop_id) {
      fetchShopDetails();
    }
  }, [shop_id]);

  interface Service {
    name: string;
    description: string;
    price_per_kg: number;
  }

  // Set up Pusher subscription for service updates
  useEffect(() => {
    if (!pusher || !isConnected || !user?.customer_id) {
      return;
    }

    // Subscribe to personal channel for this customer
    const privateChannelName = `private-customer-${user.customer_id}`;
    console.log(`[Services] Setting up subscription to ${privateChannelName}`);

    // Clean up existing subscription
    if (channelRef.current) {
      channelRef.current.unbind_all();
      pusher.unsubscribe(channelRef.current.name);
    }

    try {
      // Subscribe to private customer channel
      const privateChannel = pusher.subscribe(privateChannelName);
      channelRef.current = privateChannel;

      // Listen for new service added events
      privateChannel.bind("new-service-added", (data: any) => {
        console.log("[Services] Received new service notification:", data);

        // Only process if it's from the current shop
        if (data.shop_id === shop_id) {
          // Add the new service to the shop's services
          if (shop) {
            setShop({
              ...shop,
              services: [...shop.services, data.service],
            });

            // Visual indicator that new services were added
            setHasNewServices(true);

            // Could also highlight the new service with animation
            setTimeout(() => setHasNewServices(false), 5000);
          }
        }
      });

      // Also subscribe to the global new services channel
      const publicChannel = pusher.subscribe("new-services");

      publicChannel.bind("service-added", (data: any) => {
        console.log("[Services] Received global service update:", data);
      });
    } catch (error) {
      console.error("[Services] Error setting up Pusher:", error);
    }

    return () => {
      // Clean up subscriptions
      if (channelRef.current) {
        channelRef.current.unbind_all();
        pusher.unsubscribe(privateChannelName);
      }
      pusher.unsubscribe("new-services");
    };
  }, [pusher, isConnected, user?.customer_id, shop_id]);

  const handleServiceSelection = (serviceName: string): void => {
    if (selectedServices.includes(serviceName)) {
      // Remove service if already selected
      setSelectedServices(
        selectedServices.filter((service: string) => service !== serviceName)
      );
    } else {
      // Add service if not already selected
      setSelectedServices([...selectedServices, serviceName]);
    }
  };

  const handleProceed = () => {
    if (selectedServices.length > 0) {
      if (shop?.type === "self-service") {
        // Navigate to the machine page for self-service shops
        router.push(
          `/auth/order/${shop_id}/machine?services=${encodeURIComponent(selectedServices.join(","))}`
        );
      } else {
        // Navigate to the quantity page for other shop types
        router.push(
          `/auth/order/${shop_id}/quantity?services=${encodeURIComponent(selectedServices.join(","))}`
        );
      }
    } else {
      alert("Please select at least one service to proceed.");
    }
  };

  const handleCancel = () => {
    router.push("/auth/order"); // Navigate back to the shop selection page
  };

  if (!shop) {
    return <p>Loading...</p>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="max-w-3xl w-full bg-white shadow rounded-lg p-6">
        <Home href="/auth/order" />
        <h2 className="text-2xl font-bold mb-4">Step 2: Choose Your Service</h2>
        <p className="text-gray-600 mb-6">
          Select the services you want from <strong>{shop.name}</strong>.
        </p>

        {/* Services List */}
        <div className="space-y-4">
          {shop.services.map((service, index) => (
            <div key={index} className="flex items-center">
              <input
                type="checkbox"
                id={`service-${index}`}
                value={service.name}
                checked={selectedServices.includes(service.name)}
                onChange={() => handleServiceSelection(service.name)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label
                htmlFor={`service-${index}`}
                className="ml-2 text-sm text-gray-700"
              >
                {service.name} - ₱{service.price_per_kg}/kg
              </label>
            </div>
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="flex space-x-4 mt-8">
          <button
            onClick={handleCancel}
            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleProceed}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
