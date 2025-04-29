import PusherClient from "pusher-js";

const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY || "";
const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "";

// We'll create a function to get the current user ID that can be updated
let currentUserId: string | number | null = null;

export const setCurrentUserId = (userId: string | number): void => {
  currentUserId = String(userId);
  console.log(`[PusherClient] Updated current user ID to: ${userId}`);
};

export const clearCurrentUserId = () => {
  currentUserId = null;
  console.log("[PusherClient] Cleared current user ID");
};

export const pusherClient = new PusherClient(pusherKey, {
  cluster: pusherCluster,
  authEndpoint: "/api/pusher/auth",
  // Override the authorizer to include our custom headers
  authorizer: (channel) => {
    return {
      authorize: (socketId, callback) => {
        // Add check to prevent authorization attempts with no userId
        if (!currentUserId) {
          console.error(
            `[PusherClient] Cannot authorize ${channel.name} - no user ID set yet`
          );
          // Return error so Pusher doesn't keep retrying immediately
          callback(new Error("User ID not available yet"), null);
          return;
        }

        console.log(
          `[PusherClient] Attempting to authorize channel: ${channel.name} with ID: ${currentUserId}`
        );

        fetch("/api/pusher/auth", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
            // Add the user ID header if available
            ...(currentUserId && { "X-User-ID": String(currentUserId) }),
          } as HeadersInit,
          body: new URLSearchParams({
            socket_id: socketId,
            channel_name: channel.name,
          }),
          credentials: "include", // Add this line
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error ${response.status}`);
            }
            return response.json();
          })
          .then((data) => {
            callback(null, data);
          })
          .catch((error) => {
            callback(error, null);
          });
      },
    };
  },
});

PusherClient.logToConsole = true;
