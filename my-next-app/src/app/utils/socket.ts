import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const initializeSocket = () => {
  if (!socket) {
    socket = io("http://localhost:3000/api/socket", {
      transports: ["websocket", "polling"],
    });
  }
  return socket;
};

export const getSocket = () => {
  if (!socket) {
    throw new Error("Socket not initialized. Call initializeSocket first.");
  }
  return socket;
};
