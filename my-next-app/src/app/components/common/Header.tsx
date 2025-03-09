import { useState } from "react";
import { FaRegBell, FaRegUserCircle } from "react-icons/fa";

export default function Header() {
  const [notifications, setNotifications] = useState(0);

  return (
    <div className="bg-white shadow p-4 flex items-center justify-between">
      <h1 className="text-xl font-bold">Welcome Back!</h1>
      <div className="flex items-center space-x-4">
        <button className="relative">
          <FaRegBell className="h-6 w-6 text-gray-600" />
          {notifications > 0 && (
            <span className="absolute top-0 right-0 inline-block w-2 h-2 bg-red-600 rounded-full"></span>
          )}
        </button>
        <button>
          <FaRegUserCircle className="h-8 w-8 text-gray-600" />
        </button>
      </div>
    </div>
  );
}
