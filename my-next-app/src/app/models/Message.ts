import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  room_id: {
    type: String,
    required: [true, "Room ID is required"],
    index: true,
  },
  customer_id: {
    type: String,
    required: [true, "Customer ID is required"],
    index: true,
  },
  shop_id: {
    type: String,
    required: [true, "Shop ID is required"],
    index: true,
  },
  sender: {
    type: String,
    required: [true, "Sender is required"],
  },
  text: {
    type: String,
    required: [true, "Message text is required"],
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

export const Message =
  mongoose.models.Message || mongoose.model("Message", MessageSchema);
