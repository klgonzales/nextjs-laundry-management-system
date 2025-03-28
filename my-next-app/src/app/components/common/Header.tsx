import { useState } from "react";
import { FaRegBell, FaRegUserCircle } from "react-icons/fa";

interface HeaderProps {
  userType: "client" | "admin"; // Define the userType prop
}

export default function Header({ userType }: HeaderProps) {
  const [notifications, setNotifications] = useState(0);

  return (
    <div className="bg-white p-4 flex items-center justify-between">
      <h2 className="text-2xl font-bold">Welcome Back, France!</h2>
      <div className="flex items-center space-x-4">
        {/* Notifications Icon */}
        <a
          href={
            userType === "admin"
              ? "/admin/notifications"
              : "/auth/notifications"
          }
          className="border-0 hover:bg-transparent focus:outline-none"
        >
          <FaRegBell className="h-6 w-6 text-gray-600 hover:text-[#3D4EB0]" />
        </a>

        {/* User Profile Icon */}
        <a
          href={userType === "admin" ? "/admin/profile" : "/auth/profile"}
          className="border-0 hover:bg-transparent focus:outline-none"
        >
          <FaRegUserCircle className="h-6 w-6 text-gray-600 hover:text-[#3D4EB0]" />
        </a>
      </div>
    </div>
  );
}
