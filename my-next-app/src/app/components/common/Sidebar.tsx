import { useRouter } from "next/navigation";
import Link from "next/link";

interface SidebarProps {
  userType: "client" | "admin";
  handleScroll: (section: string) => void; // Add this prop
}

export default function Sidebar({ userType, handleScroll }: SidebarProps) {
  const router = useRouter();

  const handleLogout = () => {
    router.push("/");
  };

  return (
    <div className="w-64 h-screen max-h-screen bg-gray-800 text-white flex flex-col">
      <div className="p-4 flex items-center">
        <img
          src="/images/logo.png"
          alt="Elbi Wash Logo"
          className="h-8 w-8 mr-2"
        />
        <span className="text-xl font-bold">Elbi Wash</span>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-1">
        {userType === "client" && (
          <>
            <button
              onClick={() => handleScroll("orders")}
              className="block w-full text-left px-4 py-2 rounded hover:bg-gray-700"
            >
              Orders
            </button>

            <button
              onClick={() => handleScroll("payments")}
              className="block w-full text-left px-4 py-2 rounded hover:bg-gray-700"
            >
              Payments
            </button>
          </>
        )}

        {userType === "admin" && (
          <>
            <button
              onClick={() => handleScroll("orders")}
              className="block w-full text-left px-4 py-2 rounded hover:bg-gray-700"
            >
              Orders
            </button>
            <button
              onClick={() => handleScroll("services")}
              className="block w-full text-left px-4 py-2 rounded hover:bg-gray-700"
            >
              Services
            </button>
            <button
              onClick={() => handleScroll("feedback")}
              className="block w-full text-left px-4 py-2 rounded hover:bg-gray-700"
            >
              Customer Feedback
            </button>
            <button
              onClick={() => handleScroll("payments")}
              className="block w-full text-left px-4 py-2 rounded hover:bg-gray-700"
            >
              Payments
            </button>
            <button
              onClick={() => handleScroll("analytics")}
              className="block w-full text-left px-4 py-2 rounded hover:bg-gray-700"
            >
              Analytics
            </button>
          </>
        )}

        <button
          onClick={handleLogout}
          className="block w-full text-left px-4 py-2 rounded hover:bg-gray-700"
        >
          Logout
        </button>
      </nav>
    </div>
  );
}
