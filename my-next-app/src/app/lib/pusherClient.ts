// filepath: src/app/lib/pusherClient.ts
import PusherClient from "pusher-js";

// Ensure environment variables are loaded
const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

if (!pusherKey || !pusherCluster) {
  throw new Error(
    "Pusher environment variables NEXT_PUBLIC_PUSHER_KEY and NEXT_PUBLIC_PUSHER_CLUSTER must be set."
  );
}

export const pusherClient = new PusherClient(pusherKey, {
  cluster: pusherCluster,
  // Add authEndpoint if using private/presence channels
  // authEndpoint: '/api/pusher/auth',
  // authTransport: 'ajax', // or 'jsonp'
  // auth: {
  //   headers: { /* Optional: headers for auth request */ }
  // }
});

// Optional: Enable logging for debugging
// PusherClient.logToConsole = true;
