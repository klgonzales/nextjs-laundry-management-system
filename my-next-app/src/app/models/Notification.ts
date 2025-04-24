import mongoose, { Document, Schema, Model } from "mongoose";

// Interface describing the Notification document structure
export interface INotification extends Document {
  message: string;
  timestamp: Date;
  read: boolean;
  link?: string; // Optional link (e.g., to an order page)
  recipient_id: string | number; // customer_id or admin_id (use String if IDs are strings)
  recipient_type: "customer" | "admin";
}

// Mongoose Schema definition
const NotificationSchema: Schema<INotification> = new Schema({
  message: {
    type: String,
    required: [true, "Notification message is required."],
    trim: true,
  },
  timestamp: {
    type: Date,
    default: Date.now, // Automatically set timestamp on creation
    index: true, // Index for efficient sorting/querying by time
  },
  read: {
    type: Boolean,
    default: false, // Notifications are unread by default
  },
  link: {
    type: String,
    trim: true,
  },
  recipient_id: {
    // Use String if your customer_id and admin_id are strings, Number if they are numbers
    type: Schema.Types.Mixed, // Use Mixed if IDs can be either string or number, or choose one type
    required: [true, "Recipient ID is required."],
    index: true, // Index for efficient querying by recipient
  },
  recipient_type: {
    type: String,
    enum: ["customer", "admin"], // Only allow these two values
    required: [true, "Recipient type is required."],
    index: true, // Index for efficient querying by recipient type
  },
});

// Create and export the Mongoose model
// Check if the model already exists to prevent OverwriteModelError in Next.js dev mode
export const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);
