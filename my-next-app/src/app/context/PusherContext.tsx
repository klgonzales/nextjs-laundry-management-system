"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useMemo,
} from "react";
import PusherClient from "pusher-js";
import { useAuth } from "./AuthContext";
import {
  pusherClient,
  setCurrentUserId,
  clearCurrentUserId,
} from "@/app/lib/pusherClient";

interface PusherContextProps {
  pusher: PusherClient | null;
  isConnected: boolean;
}

const PusherContext = createContext<PusherContextProps | undefined>(undefined);

export const PusherProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [pusher] = useState<PusherClient>(pusherClient);
  const [isConnected, setIsConnected] = useState(
    pusher.connection.state === "connected"
  );
  const { user } = useAuth();

  useEffect(() => {
    const currentUserId = user?.admin_id || user?.customer_id;

    if (currentUserId) {
      console.log(
        `[PusherContext] User detected (${currentUserId}), updating global Pusher auth headers.`
      );
      setCurrentUserId(currentUserId);
    } else {
      console.log(
        "[PusherContext] User logged out or ID not available, clearing Pusher auth header."
      );
      clearCurrentUserId();
    }
  }, [user]);

  useEffect(() => {
    const handleConnectionChange = () => {
      setIsConnected(pusher.connection.state === "connected");
    };
    setIsConnected(pusher.connection.state === "connected");
    pusher.connection.bind("state_change", handleConnectionChange);
    return () => {
      pusher.connection.unbind("state_change", handleConnectionChange);
    };
  }, [pusher]);

  const contextValue = useMemo(
    () => ({
      pusher,
      isConnected,
    }),
    [pusher, isConnected]
  );

  return (
    <PusherContext.Provider value={contextValue}>
      {children}
    </PusherContext.Provider>
  );
};

export const usePusher = (): PusherContextProps => {
  const context = useContext(PusherContext);
  if (context === undefined) {
    throw new Error("usePusher must be used within a PusherProvider");
  }
  return context;
};
