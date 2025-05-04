"use client";

import { useState } from "react";
import { FiBell, FiUser } from "react-icons/fi";
import { useAuth } from "@/app/context/AuthContext";
//import { checkUserRole } from "@/app/utils/authUtils"; // Adjust the path as needed
import Notification from "./Notification"; // Assuming Notification.tsx is in the same directory

interface HeaderProps {
  userType: "client" | "admin"; // Define the userType prop
}

export default function Header({ userType }: HeaderProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState(0);
  console.log(user);

  return (
    <div className="bg-white p-4 mt-5 flex items-center justify-between">
      <div>
        <h4 className="text-2xl font-semibold text-black">
          Welcome Back,{" "}
          {userType === "admin"
            ? user?.shops?.[0]?.name || ""
            : user?.name
              ? user.name.charAt(0).toUpperCase() + user.name.slice(1)
              : ""}{" "}
          ! 👋
        </h4>
        <p className="text-sm text-gray-500">
          {userType === "admin"
            ? "Manage your laundry business with ease"
            : "Track your orders and manage your laundry services"}
        </p>
      </div>

      <div className="flex items-center space-x-4"></div>
      {/* Notifications Icon */}
      <div className="flex items-center space-x-2">
        <Notification />

        <button
          onClick={() =>
            (window.location.href =
              userType === "admin" ? "/admin/profile" : "/auth/profile")
          }
          className="relative border-0 p-2 rounded-full h-10 w-10 flex items-center justify-center hover:bg-[#EADDFF]"
        >
          <FiUser className="h-6 w-6 text-black" />
        </button>
      </div>
    </div>
  );
}
