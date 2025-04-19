"use client";

import Chat from "@/app/components/message/Chat";
import { useAuth } from "@/app/context/AuthContext";

export default function AdminChatPage() {
  const { user } = useAuth();
  const shop_id = user?.shops?.[0]?.shop_id; // Assuming the admin has access to a shop

  return (
    <div className="p-4">
      <Chat userType="admin" shop_id={shop_id} />
    </div>
  );
}
