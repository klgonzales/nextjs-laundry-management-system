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
