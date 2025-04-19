import mongoose, { Schema, Document } from "mongoose";

interface MessageDocument extends Document {
  room_id: string; // Unique identifier for the chat room
  customer_id: string; // Customer ID
  shop_id: string; // Shop ID
  messages: {
    sender: string; // "Customer" or "Admin"
    text: string;
    timestamp: Date;
  }[];
}

const MessageSchema = new Schema<MessageDocument>({
  room_id: { type: String, required: true }, // Unique identifier for the chat room
  customer_id: { type: String, required: true }, // Customer ID
  shop_id: { type: String, required: true }, // Shop ID
  messages: [
    {
      sender: { type: String, required: true }, // "Customer" or "Admin"
      text: { type: String, required: true },
      timestamp: { type: Date, default: Date.now }, // Timestamp for sorting
    },
  ],
});

export const Message =
  mongoose.models.Message ||
  mongoose.model<MessageDocument>("Message", MessageSchema);
