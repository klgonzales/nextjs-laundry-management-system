"use client";

import { useState } from "react";
import { FaRegBell, FaRegUserCircle } from "react-icons/fa";
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
      {/* Notifications Icon */}
      <div className="flex items-center space-x-2">
        <Notification />

        <a
          href={userType === "admin" ? "/admin/profile" : "/auth/profile"}
          className="border-0 hover:bg-transparent focus:outline-none"
        >
          <FaRegUserCircle className="h-6 w-6 text-black hover:text-[#3D4EB0]" />
        </a>
      </div>
    </div>
  );
}
