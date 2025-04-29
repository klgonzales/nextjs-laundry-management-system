"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react"; // Added useRef
import {
  pusherClient,
  setCurrentUserId,
  clearCurrentUserId,
} from "@/app/lib/pusherClient";
import PusherClient from "pusher-js";
import { useAuth } from "./AuthContext"; // Make sure this path is correct

interface PusherContextProps {
  pusher: PusherClient | null;
  isConnected: boolean;
}

const PusherContext = createContext<PusherContextProps>({
  pusher: null,
  isConnected: false,
});

export const usePusher = () => useContext(PusherContext);

export const PusherProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, isLoading: authLoading } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  // Use a ref to hold the instance to avoid re-renders triggering useEffect unnecessarily
  const pusherInstanceRef = useRef<PusherClient | null>(null);
  // State to track if user ID has been set for this session
  const [userIdSet, setUserIdSet] = useState(false);

  useEffect(() => {
    console.log(
      "[PusherContext] useEffect triggered. Auth Loading:",
      authLoading,
      "User:",
      user
    );

    // 1. Wait for authentication to finish loading
    if (authLoading) {
      console.log("[PusherContext] Waiting for authentication...");
      // If logging out, ensure cleanup happens
      if (!user && pusherInstanceRef.current) {
        console.log(
          "[PusherContext] User logged out during auth check, disconnecting."
        );
        clearCurrentUserId();
        setUserIdSet(false);
        pusherInstanceRef.current.disconnect();
        pusherInstanceRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // 2. Handle User Login/Update
    if (user && (user.admin_id || user.customer_id)) {
      const currentPusherId = user.admin_id || user.customer_id;
      console.log(
        `[PusherContext] User detected (ID: ${currentPusherId}). Setting Pusher User ID.`
      );
      if (currentPusherId !== undefined) {
        setCurrentUserId(currentPusherId); // Set the ID in pusherClient.ts
      } else {
        console.error("[PusherContext] currentPusherId is undefined.");
      }
      setUserIdSet(true); // Mark that ID is set

      // 3. Initialize and Connect Pusher *only if* ID is set and instance doesn't exist
      if (!pusherInstanceRef.current) {
        console.log("[PusherContext] Initializing Pusher connection...");
        pusherInstanceRef.current = pusherClient; // Assign the imported client

        pusherInstanceRef.current.connection.bind("connected", () => {
          console.log("[PusherContext] Pusher connected!");
          setIsConnected(true);
        });
        pusherInstanceRef.current.connection.bind("disconnected", () => {
          console.log("[PusherContext] Pusher disconnected.");
          setIsConnected(false);
        });
        pusherInstanceRef.current.connection.bind("error", (err: any) => {
          console.error("[PusherContext] Pusher connection error:", err);
          setIsConnected(false);
        });

        // Explicitly connect if needed, though subscribe often handles it.
        // pusherInstanceRef.current.connect();
      }
    }
    // 4. Handle User Logout
    else if (!user && pusherInstanceRef.current) {
      console.log(
        "[PusherContext] No user detected or logged out. Disconnecting Pusher."
      );
      clearCurrentUserId();
      setUserIdSet(false);
      pusherInstanceRef.current.disconnect();
      pusherInstanceRef.current = null; // Clear the ref
      setIsConnected(false);
    } else if (!user) {
      console.log("[PusherContext] No user and no active Pusher instance.");
      clearCurrentUserId(); // Ensure ID is cleared if no user
      setUserIdSet(false);
    }

    // Cleanup function (optional, depends on desired behavior)
    // return () => {
    //   if (pusherInstanceRef.current) {
    //     console.log("[PusherContext] Unmounting, disconnecting Pusher.");
    //     pusherInstanceRef.current.disconnect();
    //   }
    // };

    // Depend on user and authLoading to re-run when auth state changes
  }, [user, authLoading]);

  // Provide the current instance from the ref
  return (
    <PusherContext.Provider
      value={{ pusher: pusherInstanceRef.current, isConnected }}
    >
      {/* Render children only when auth is done and ID is set (or no user) */}
      {/* This prevents child components from subscribing too early */}
      {!authLoading && (userIdSet || !user) ? (
        children
      ) : (
        <div>Loading authentication...</div>
      )}
    </PusherContext.Provider>
  );
};
