import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";

interface SidebarProps {
  userType: "client" | "admin";
  handleScroll: (section: string) => void;
  shopType?: string;
}

export default function Sidebar({
  userType,
  handleScroll,
  shopType,
}: SidebarProps) {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <div className="w-64 h-screen max-h-screen bg-white shadow rounded-lg p-4 mb-6 text-white flex flex-col">
      <div className="p-4 flex items-center">
        <img
          src="/images/logo.png"
          alt="Elbi Wash Logo"
          className="h-8 w-8 mr-2"
        />
        <span className="text-xl font-semibold" style={{ color: "#3D4EB0" }}>
          Elbi Wash
        </span>
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
            <Link
              href="/auth/chat"
              className="block w-full text-left px-4 py-2 rounded hover:bg-gray-700"
            >
              Messages
            </Link>
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
            <Link
              href="/admin/chat"
              className="block w-full text-left px-4 py-2 rounded hover:bg-gray-700"
            >
              Messages
            </Link>
            {shopType === "self-service" && (
              <button
                onClick={() => handleScroll("machines")}
                className="block w-full text-left px-4 py-2 rounded hover:bg-gray-700"
              >
                Machines
              </button>
            )}
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
