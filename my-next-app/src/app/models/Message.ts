import mongoose, { Schema, Document } from "mongoose";

interface MessageDocument extends Document {
  sender: string;
  shop_id: string; // Shop ID for filtering messages
  customer_id: string; // Customer ID of the sender
  text: string;
  timestamp: Date;
}

const MessageSchema = new mongoose.Schema(
  {
    sender: { type: String, required: true },
    shop_id: { type: String, required: true }, // Shop ID for filtering messages
    customer_id: { type: String, required: true }, // Customer ID of the sender
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }, // Timestamp for sorting
  },
  { collection: "messages" }
);

export const Message =
  mongoose.models.Message ||
  mongoose.model<MessageDocument>("Message", MessageSchema);
