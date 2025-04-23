"use client";

import { useState } from "react";
import { FaRegBell, FaRegUserCircle } from "react-icons/fa";
import { useAuth } from "@/app/context/AuthContext";
//import { checkUserRole } from "@/app/utils/authUtils"; // Adjust the path as needed
import Notification from "@/app/components/common/Notification"; // Ensure this component exists

interface HeaderProps {
  userType: "client" | "admin"; // Define the userType prop
}

export default function Header({ userType }: HeaderProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState(0);
  console.log(user);

  return (
    <div className="bg-white p-4 flex items-center justify-between">
      <h2 className="text-2xl font-bold text-black">
        Welcome Back,{" "}
        {userType === "admin"
          ? user?.shops?.[0]?.name || ""
          : user?.name
            ? user.name.charAt(0).toUpperCase() + user.name.slice(1)
            : ""}
      </h2>

      <div className="flex items-center space-x-4"></div>
      {/* Icons Container */}
      <div className="flex items-center space-x-3 md:space-x-4">
        {/* Adjusted spacing */}
        {/* Notifications Component */}
        {user && (
          // Remove userType and userId props
          <Notification />
        )}
        {/* Profile Icon Link */}
        <a
          href={userType === "admin" ? "/admin/profile" : "/auth/profile"}
          className="p-1 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" // Added padding and focus ring
          aria-label="View Profile"
        >
          <FaRegUserCircle className="h-6 w-6 text-black" />
        </a>
      </div>
    </div>
  );
}
