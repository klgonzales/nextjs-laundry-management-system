import Link from "next/link";

interface SidebarProps {
  userType: "client" | "admin";
}

export default function Sidebar({ userType }: SidebarProps) {
  return (
    <div className="w-64 h-full bg-gray-800 text-white flex flex-col">
      <div className="p-4 flex items-center">
        <img
          src="/images/logo.png"
          alt="Elbi Wash Logo"
          className="h-8 w-8 mr-2"
        />
        <span className="text-xl font-bold">Elbi Wash</span>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        <Link href="/" className="block px-4 py-2 rounded hover:bg-gray-700">
          Home
        </Link>
        <Link
          href="/orders"
          className="block px-4 py-2 rounded hover:bg-gray-700"
        >
          Orders
        </Link>
        {userType === "client" && (
          <>
            <Link
              href="/payments"
              className="block px-4 py-2 rounded hover:bg-gray-700"
            >
              Payments
            </Link>
            <Link
              href="/messages"
              className="block px-4 py-2 rounded hover:bg-gray-700"
            >
              Messages
            </Link>
          </>
        )}
        {userType === "admin" && (
          <>
            <Link
              href="/services"
              className="block px-4 py-2 rounded hover:bg-gray-700"
            >
              Services
            </Link>
            <Link
              href="/customer-feedback"
              className="block px-4 py-2 rounded hover:bg-gray-700"
            >
              Customer Feedback
            </Link>
            <Link
              href="/messages"
              className="block px-4 py-2 rounded hover:bg-gray-700"
            >
              Messages
            </Link>
            <Link
              href="/payments"
              className="block px-4 py-2 rounded hover:bg-gray-700"
            >
              Payments
            </Link>
            <Link
              href="/analytics"
              className="block px-4 py-2 rounded hover:bg-gray-700"
            >
              Analytics
            </Link>
          </>
        )}
        <Link
          href="/settings"
          className="block px-4 py-2 rounded hover:bg-gray-700"
        >
          Settings
        </Link>
        <button className="block w-full text-left px-4 py-2 rounded hover:bg-gray-700">
          Logout
        </button>
      </nav>
    </div>
  );
}
