import { Server as SocketIOServer } from "socket.io";
import { NextApiRequest } from "next";
import { NextApiResponseServerIO } from "@/app/types/io"; // Ensure this path is correct relative to your tsconfig baseUrl
import dbConnect from "@/app/lib/mongodb"; // Ensure this path is correct
import { Message } from "@/app/models/Message"; // Ensure this path is correct

// Define a type alias for clarity if needed, though NextApiResponseServerIO might suffice
type NextApiResponseWithSocket = NextApiResponseServerIO;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  // Check if the Socket.IO server is already initialized
  if (!res.socket.server.io) {
    console.log("Initializing WebSocket server...");
    // Get the underlying HTTP server instance
    const httpServer = res.socket.server; // No need for 'as any' if types are correct
    // Create a new Socket.IO server and attach it to the HTTP server
    const io = new SocketIOServer(httpServer, {
      path: "/api/socket", // Client must connect to this path
      addTrailingSlash: false,
    });

    // Store the io instance on the server object so it's available globally
    res.socket.server.io = io;

    // Connect to the database (only needed once during initialization)
    await dbConnect();

    // Define Socket.IO connection logic
    io.on("connection", (socket) => {
      console.log("New client connected:", socket.id);

      // Join Room Logic
      socket.on("joinRoom", async (data: { room_id: string }) => {
        const { room_id } = data;
        if (!room_id) return; // Basic validation
        socket.join(room_id);
        console.log(`Client ${socket.id} joined room: ${room_id}`);

        try {
          const roomData = await Message.findOne({ room_id });
          if (roomData?.messages) {
            socket.emit("previousMessages", roomData.messages);
          }
        } catch (error) {
          console.error("Error fetching previous messages:", error);
        }
      });

      // Send Message Logic
      socket.on("sendMessage", async (message) => {
        console.log("Message received:", message);
        const { room_id, customer_id, shop_id, sender, text } = message;

        if (!room_id || !sender || !text) {
          console.error("Invalid message data:", message);
          // Consider emitting an error back to the client
          return;
        }

        try {
          const newMessage = { sender, text, timestamp: new Date() };
          await Message.findOneAndUpdate(
            { room_id },
            {
              $setOnInsert: { room_id, customer_id, shop_id },
              $push: { messages: newMessage },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          console.log("Message saved for room:", room_id);
          // Broadcast to the specific room
          io.to(room_id).emit("receiveMessage", newMessage);
        } catch (error) {
          console.error("Error saving or broadcasting message:", error);
          // Consider emitting an error back to the client
        }
      });

      // Disconnect Logic
      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
      });

      // Socket Error Logic
      socket.on("error", (error: Error) => {
        console.error(`Socket error for client ${socket.id}:`, error);
      });
    });

    // Engine Error Logic (Optional but good practice)
    io.engine.on("connection_error", (err: any) => {
      console.log("Socket.IO connection error:", err.message);
      // console.log(err.req);      // Request object
      // console.log(err.code);     // Error code
      // console.log(err.context);  // Error context
    });
  } else {
    console.log("WebSocket server already running.");
  }

  // End the HTTP response for the initial polling request
  res.end();
}

// import { Server as HttpServer } from "http";
// import { Server as SocketIOServer } from "socket.io";
// import { NextApiRequest } from "next";
// import { NextApiResponseServerIO } from "@/app/types/io";
// import { createClient, RedisClientType, RedisClientOptions } from "redis"; // Import Redis

// type NextApiResponseWithSocket = NextApiResponseServerIO;

// // Store subscriber client globally within this module's scope (or manage differently if needed)
// let redisSubscriber: RedisClientType | undefined;

// // Helper function to initialize and connect Redis subscriber
// async function getRedisSubscriber(): Promise<RedisClientType> {
//   if (!redisSubscriber || !redisSubscriber.isOpen) {
//     console.log("Initializing Redis subscriber client...");
//     const options: RedisClientOptions = { url: process.env.REDIS_URL };
//     redisSubscriber = createClient(options) as RedisClientType;

//     redisSubscriber.on("error", (err) =>
//       console.error("Redis Subscriber Error:", err)
//     );
//     await redisSubscriber.connect();
//     console.log("Redis subscriber connected.");
//   }
//   return redisSubscriber;
// }

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponseWithSocket
// ) {
//   if (!res.socket.server.io) {
//     console.log("*Initializing Socket.IO server...");
//     const httpServer: HttpServer = res.socket.server as any;
//     const io = new SocketIOServer(httpServer, {
//       path: "/api/socket",
//       addTrailingSlash: false,
//       cors: { origin: "*", methods: ["GET", "POST"] },
//     });

//     // Initialize Redis Subscriber
//     try {
//       await getRedisSubscriber(); // Ensure subscriber is connected
//     } catch (err) {
//       console.error("Failed to connect Redis subscriber on init:", err);
//       // Handle error appropriately - maybe prevent socket server start?
//     }

//     io.on("connection", async (socket) => {
//       console.log(`Socket connected: ${socket.id}`);
//       const userId = socket.handshake.query.userId as string;
//       const userType = socket.handshake.query.userType as string;

//       if (userId && userType && redisSubscriber?.isOpen) {
//         // Check if subscriber is ready
//         const adminId = userType === "admin" ? userId : null; // Assuming only admins need these updates for now

//         if (adminId) {
//           const adminRoom = `admin_${adminId}`;
//           socket.join(adminRoom);
//           console.log(`Socket ${socket.id} joined room: ${adminRoom}`);

//           // Subscribe to Redis channels for this admin
//           const notificationChannel = `admin-notifications:${adminId}`;
//           const orderChannel = `new-orders:admin:${adminId}`;

//           try {
//             // Subscribe to Notification Channel
//             await redisSubscriber.subscribe(notificationChannel, (message) => {
//               console.log(
//                 `Redis msg on ${notificationChannel} for room ${adminRoom}`
//               );
//               try {
//                 const notificationData = JSON.parse(message);
//                 io.to(adminRoom).emit("new_notification", notificationData);
//               } catch (e) {
//                 console.error("Failed to parse/emit notification:", e);
//               }
//             });
//             console.log(`Subscribed to Redis channel: ${notificationChannel}`);

//             // Subscribe to New Order Channel
//             await redisSubscriber.subscribe(orderChannel, (message) => {
//               console.log(`Redis msg on ${orderChannel} for room ${adminRoom}`);
//               try {
//                 const orderData = JSON.parse(message);
//                 io.to(adminRoom).emit("new_order_added", orderData);
//               } catch (e) {
//                 console.error("Failed to parse/emit new order:", e);
//               }
//             });
//             console.log(`Subscribed to Redis channel: ${orderChannel}`);
//           } catch (subError) {
//             console.error(
//               `Failed to subscribe socket ${socket.id} to Redis channels:`,
//               subError
//             );
//           }

//           // Handle disconnect: Unsubscribe from Redis
//           socket.on("disconnect", async () => {
//             console.log(
//               `Socket disconnected: ${socket.id}, unsubscribing from Redis.`
//             );
//             try {
//               if (redisSubscriber?.isOpen) {
//                 await redisSubscriber.unsubscribe(notificationChannel);
//                 await redisSubscriber.unsubscribe(orderChannel);
//                 console.log(
//                   `Unsubscribed from Redis channels for admin ${adminId}`
//                 );
//               }
//             } catch (unsubError) {
//               console.error(
//                 `Error unsubscribing socket ${socket.id} from Redis:`,
//                 unsubError
//               );
//             }
//           });
//         } else {
//           console.log(
//             `Socket ${socket.id} connected (userType: ${userType}), but not subscribing to admin channels.`
//           );
//         }
//       } else {
//         console.warn(
//           `Socket ${socket.id} connected without userId/userType or Redis subscriber not ready.`
//         );
//       }
//     });

//     res.socket.server.io = io;
//   } else {
//     console.log("Socket.IO server already running.");
//   }
//   res.end();
// }
