import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import {
  FiShoppingBag,
  FiList,
  FiMessageSquare,
  FiTool,
  FiStar,
  FiDollarSign,
  FiBarChart2,
  FiLogOut,
  FiHome,
} from "react-icons/fi";

interface SidebarProps {
  userType: "client" | "admin";
  handleScroll: (section: string) => void;
  shopType?: string;
  activePath?: string;
}

export default function Sidebar({
  userType,
  handleScroll,
  shopType,
  activePath,
}: SidebarProps) {
  const router = useRouter();
  const { logout } = useAuth();

  // Enhanced isPathActive function to check current route
  const isPathActive = (path: string) => {
    if (!activePath) return false;

    switch (path) {
      case "home":
        return (
          activePath.endsWith("/dashboard") ||
          activePath.endsWith("/shop-self-service")
        );
      case "orders":
        return activePath.includes("/orders");
      case "services":
        return activePath.includes("/services");
      case "machines":
        return activePath.includes("/machines");
      case "feedback":
        return activePath.includes("/feedback");
      case "payments":
        return activePath.includes("/payments");
      case "analytics":
        return activePath.includes("/analytics");
      default:
        return false;
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  // Function to determine button class based on active state
  const getButtonClass = (path: string) => {
    const baseClass =
      "flex items-center w-full text-left px-4 py-2 rounded transition-colors";
    const activeClass = "bg-[#EADDFF] text-[#3D4EB0] font-medium";
    const inactiveClass =
      "text-gray-700 hover:bg-[#EADDFF] hover:text-[#3D4EB0]";

    return `${baseClass} ${isPathActive(path) ? activeClass : inactiveClass}`;
  };

  return (
    <div className="w-64 h-162 bg-[#F3F5FB] shadow-md flex flex-col overflow-y-auto sticky top-0 my-4 rounded-lg">
      <div className="p-4 flex items-center">
        <div className="w-8 h-8 bg-[#3D4EB0] rounded flex items-center justify-center mr-3">
          <img
            src="/images/logo.png"
            alt="Elbi Wash Logo"
            className="h-5 w-5"
          />
        </div>
        <span className="text-xl font-semibold text-[#3D4EB0]">Elbi Wash</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {userType === "client" && (
          <nav className="flex-1 px-2 py-4 space-y-6">
            <div>
              <h3 className="px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                General
              </h3>
              <div className="mt-2 space-y-1">
                <button
                  onClick={() => handleScroll("orders")}
                  className={getButtonClass("orders")}
                >
                  <FiShoppingBag className="mr-3 h-4 w-4" />
                  Orders
                </button>
                <button
                  onClick={() => handleScroll("payments")}
                  className={getButtonClass("payments")}
                >
                  <FiDollarSign className="mr-3 h-4 w-4" />
                  Payments
                </button>
                <Link
                  href="/auth/chat"
                  className="flex items-center w-full text-left px-4 py-2 rounded text-gray-700 hover:bg-[#EADDFF] hover:text-[#3D4EB0] transition-colors"
                >
                  <FiMessageSquare className="mr-3 h-4 w-4" />
                  Messages
                </Link>
              </div>
            </div>
          </nav>
        )}

        {userType === "admin" && shopType === "pickup-delivery" && (
          <nav className="flex-1 px-2 py-4 space-y-6">
            <div>
              <h3 className="px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                General
              </h3>

              <div className="mt-2 space-y-1">
                <button
                  onClick={() => handleScroll("home")}
                  className={getButtonClass("home")}
                >
                  <FiHome className="mr-3 h-4 w-4" />
                  Home
                </button>
                <button
                  onClick={() => handleScroll("orders")}
                  className={getButtonClass("orders")}
                >
                  <FiShoppingBag className="mr-3 h-4 w-4" />
                  Orders
                </button>
                <button
                  onClick={() => handleScroll("services")}
                  className={getButtonClass("services")}
                >
                  <FiList className="mr-3 h-4 w-4" />
                  Services
                </button>
              </div>
            </div>

            <div>
              <h3 className="px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </h3>
              <div className="mt-2 space-y-1">
                <button
                  onClick={() => handleScroll("feedback")}
                  className={getButtonClass("feedback")}
                >
                  <FiStar className="mr-3 h-4 w-4" />
                  Feedbacks
                </button>
                <Link
                  href="/admin/chat"
                  className="flex items-center w-full text-left px-4 py-2 rounded text-gray-700 hover:bg-[#EADDFF] hover:text-[#3D4EB0] transition-colors"
                >
                  <FiMessageSquare className="mr-3 h-4 w-4" />
                  Messages
                </Link>
              </div>
            </div>

            <div>
              <h3 className="px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payments
              </h3>
              <div className="mt-2 space-y-1">
                <button
                  onClick={() => handleScroll("payments")}
                  className={getButtonClass("payments")}
                >
                  <FiDollarSign className="mr-3 h-4 w-4" />
                  Payments
                </button>
                <button
                  onClick={() => handleScroll("analytics")}
                  className={getButtonClass("analytics")}
                >
                  <FiBarChart2 className="mr-3 h-4 w-4" />
                  Analytics
                </button>
              </div>
            </div>
          </nav>
        )}

        {userType === "admin" && shopType === "self-service" && (
          <nav className="flex-1 px-2 py-4 space-y-6">
            <div>
              <h3 className="px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                General
              </h3>

              <div className="mt-2 space-y-1">
                <button
                  onClick={() => handleScroll("home")}
                  className={getButtonClass("home")}
                >
                  <FiHome className="mr-3 h-4 w-4" />
                  Home
                </button>
                <button
                  onClick={() => handleScroll("orders")}
                  className={getButtonClass("orders")}
                >
                  <FiShoppingBag className="mr-3 h-4 w-4" />
                  Orders
                </button>
                <button
                  onClick={() => handleScroll("services")}
                  className={getButtonClass("services")}
                >
                  <FiList className="mr-3 h-4 w-4" />
                  Services
                </button>
                <button
                  onClick={() => handleScroll("machines")}
                  className={getButtonClass("machines")}
                >
                  <FiTool className="mr-3 h-4 w-4" />
                  Machines
                </button>
              </div>
            </div>

            <div>
              <h3 className="px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Customer
              </h3>
              <div className="mt-2 space-y-1">
                <button
                  onClick={() => handleScroll("feedback")}
                  className={getButtonClass("feedback")}
                >
                  <FiStar className="mr-3 h-4 w-4" />
                  Feedbacks
                </button>
                <Link
                  href="/admin/chat"
                  className="flex items-center w-full text-left px-4 py-2 rounded text-gray-700 hover:bg-[#EADDFF] hover:text-[#3D4EB0] transition-colors"
                >
                  <FiMessageSquare className="mr-3 h-4 w-4" />
                  Messages
                </Link>
              </div>
            </div>

            <div>
              <h3 className="px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payments
              </h3>
              <div className="mt-2 space-y-1">
                <button
                  onClick={() => handleScroll("payments")}
                  className={getButtonClass("payments")}
                >
                  <FiDollarSign className="mr-3 h-4 w-4" />
                  Payments
                </button>
                <button
                  onClick={() => handleScroll("analytics")}
                  className={getButtonClass("analytics")}
                >
                  <FiBarChart2 className="mr-3 h-4 w-4" />
                  Analytics
                </button>
              </div>
            </div>
          </nav>
        )}
      </div>
      {/* Logout button at the bottom */}
      <div className="mt-auto px-2 pb-4">
        <button
          onClick={handleLogout}
          className="flex items-center w-full text-left px-4 py-2 rounded text-gray-700 hover:bg-[#EADDFF] hover:text-[#3D4EB0] transition-colors"
        >
          <FiLogOut className="mr-3 h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );
}
