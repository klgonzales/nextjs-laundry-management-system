"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePusher } from "./PusherContext";
import { useAuth } from "./AuthContext";
import type { Channel } from "pusher-js";

interface RealTimeUpdatesContextType {
  registerPaymentHandler: (handler: (data: any) => void) => void;
  unregisterPaymentHandler: () => void;
  paymentsUpdates: any[];
}

const RealTimeUpdatesContext = createContext<
  RealTimeUpdatesContextType | undefined
>(undefined);

export function RealTimeUpdatesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const { pusher, isConnected } = usePusher();
  const channelRef = useRef<Channel | null>(null);
  const [paymentsUpdates, setPaymentsUpdates] = useState<any[]>([]);

  // Payment handler registry
  const paymentHandlerRef = useRef<((data: any) => void) | null>(null);

  // Register a handler for payment updates
  const registerPaymentHandler = (handler: (data: any) => void) => {
    console.log(`[RealTime] Registering payment update handler`);
    paymentHandlerRef.current = handler;
  };

  // Unregister the payment handler
  const unregisterPaymentHandler = () => {
    console.log(`[RealTime] Unregistering payment update handler`);
    paymentHandlerRef.current = null;
  };

  useEffect(() => {
    if (!pusher || !isConnected || !user?.admin_id) {
      console.log(
        `[RealTime] Skipping Pusher subscription: Missing prerequisites.`
      );
      return;
    }

    const adminId = user.admin_id;
    const channelName = `private-admin-${adminId}`;
    console.log(`[RealTime] Setting up subscription to ${channelName}`);

    // Create subscription
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    // Bind to payment status update event
    channel.bind("update-payment-status", (data: any) => {
      console.log(`[RealTime] Received payment status update:`, data);

      // Add to updates list
      setPaymentsUpdates((prev) => [data, ...prev].slice(0, 10));

      // Call the registered handler if it exists
      if (paymentHandlerRef.current) {
        paymentHandlerRef.current(data);
      }
    });

    return () => {
      console.log(`[RealTime] Cleaning up Pusher subscription`);
      channel.unbind_all();
      pusher.unsubscribe(channelName);
    };
  }, [pusher, isConnected, user?.admin_id]);

  return (
    <RealTimeUpdatesContext.Provider
      value={{
        registerPaymentHandler,
        unregisterPaymentHandler,
        paymentsUpdates,
      }}
    >
      {children}
    </RealTimeUpdatesContext.Provider>
  );
}

export const useRealTimeUpdates = () => {
  const context = useContext(RealTimeUpdatesContext);
  if (context === undefined) {
    throw new Error(
      "useRealTimeUpdates must be used within a RealTimeUpdatesProvider"
    );
  }
  return context;
};
