"use client";

import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();

  const handleLogout = () => {
    // For now, just redirect to login page
    // Later we can add session management
    router.push("/auth/login");
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">Laundry Management System</h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="ml-4 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 p-4">
            <h2 className="text-2xl font-bold mb-4">
              Welcome to your Dashboard
            </h2>
            <p className="text-gray-600">
              This is a simple dashboard. You can add more features here like:
            </p>
            <ul className="list-disc list-inside mt-2 text-gray-600">
              <li>Order History</li>
              <li>Current Orders</li>
              <li>Profile Settings</li>
              <li>Payment Methods</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
