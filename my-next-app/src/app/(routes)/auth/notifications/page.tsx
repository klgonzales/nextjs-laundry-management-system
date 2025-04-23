"use client";

import Notification from "@/app/components/common/Notification";
import { useAuth } from "@/app/context/AuthContext";

export default function ChatPage() {
  const { user } = useAuth();

  return (
    <div className="p-4">
      <Notification />
    </div>
  );
}
