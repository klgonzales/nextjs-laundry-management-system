"use client";

import Chat from "@/app/components/message/Chat";
import { useAuth } from "@/app/context/AuthContext";

export default function ChatPage() {
  const { user } = useAuth();

  return (
    <div className="p-4">
      <Chat userType="client" customer_id={user?.customer_id} />
    </div>
  );
}
