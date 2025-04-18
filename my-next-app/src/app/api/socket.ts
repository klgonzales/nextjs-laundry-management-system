import { Server } from "socket.io";
import dbConnect from "@/app/lib/mongodb";
import { Message } from "@/app/models/Message";

let io: any;

export default async function handler(req: any, res: any) {
  if (!res.socket.server.io) {
    console.log("Initializing WebSocket server...");
    io = new Server(res.socket.server);
    res.socket.server.io = io;

    // Connect to the database
    await dbConnect();

    io.on(
      "connection",
      (socket: {
        id: any;
        on: (
          event: string,
          callback: (message: any) => void | Promise<void>
        ) => void;
      }) => {
        console.log("New client connected:", socket.id);

        // Handle incoming messages
        socket.on("sendMessage", async (message) => {
          console.log("Message received:", message);

          // Save the message to the database
          try {
            const savedMessage = await Message.create(message);
            console.log("Message saved:", savedMessage);

            // Broadcast the message to all connected clients
            io.emit("receiveMessage", savedMessage);
          } catch (error) {
            console.error("Error saving message:", error);
          }
        });

        socket.on("disconnect", () => {
          console.log("Client disconnected:", socket.id);
        });
      }
    );
  } else {
    console.log("WebSocket server already running.");
  }
  res.end();
}
