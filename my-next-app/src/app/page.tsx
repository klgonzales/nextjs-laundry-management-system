import Link from "next/link";
import { FiLogIn, FiUserPlus, FiTool } from "react-icons/fi";
import "./globals.css";
import Header from "./components/common/Footer";
import Footer from "./components/common/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center">
      <img
        src="/images/logo.png"
        alt="Elbi Wash Logo"
        className="mb-4 w-16 h-16"
      />
      <h1 className="text-4xl font-regular text-[#3D4EB0] mb-4">Elbi Wash</h1>
      <p className="text-lg text-gray-600 mb-12 max-w-2xl">
        Your one-stop solution for efficient laundry management.
      </p>
      <div className="space-y-2 flex flex-col items-center w-full max-w-xs">
        <div className="w-full">
          <Link
            href="/auth/login"
            className="inline-block w-full bg-white text-black border border-black px-6 py-3 rounded-md hover:bg-[#F468BB] hover:text-white transition-colors flex items-center justify-center"
          >
            <FiLogIn className="w-5 h-5 mr-2 inline stroke-current" />
            <span className="inline">Sign In</span>
          </Link>
        </div>
        <div className="w-full">
          <Link
            href="/auth/register"
            className="inline-block w-full bg-white text-black border border-black px-6 py-3 rounded-md hover:bg-[#F468BB] hover:text-white transition-colors flex items-center justify-center"
          >
            <FiUserPlus className="w-5 h-5 mr-2 inline stroke-current" />
            <span className="inline">Register</span>
          </Link>
        </div>
        <div className="mt-2 pt-4 border-t border-gray-300 w-full flex justify-center">
          <Link
            href="/admin/login"
            className="inline-block w-full bg-white text-black border border-black px-6 py-3 rounded-md hover:bg-[#F468BB] hover:text-white transition-colors flex items-center justify-center"
          >
            <FiTool className="w-5 h-5 mr-2 inline stroke-current" />
            <span className="inline">Continue as Admin</span>
          </Link>
        </div>
        <Footer />
      </div>
    </div>
  );
}
