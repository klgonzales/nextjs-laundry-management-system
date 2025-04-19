// filepath: src/app/types/io.ts
import { Server as NetServer, Socket } from "net";
import { NextApiResponse } from "next";
import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http"; // Import HttpServer

// Define a type for the socket server that includes the underlying http server and the io instance
export type SocketServer = HttpServer & {
  io?: SocketIOServer;
};

// Define a type for the socket within the response, including the server
export type ResponseSocket = Socket & {
  server: SocketServer;
};

// Define the final response type extending NextApiResponse
export type NextApiResponseServerIO = NextApiResponse & {
  socket: ResponseSocket;
};
