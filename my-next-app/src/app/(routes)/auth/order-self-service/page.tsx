"use client";

import { useRouter } from "next/navigation";
import Header from "../../../components/common/Header";
import Footer from "../../../components/common/Footer";

export default function SelfService() {
  const router = useRouter();

  const navigateBackToDashboard = () => {
    router.push("/auth/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold mb-4">Self-Service</h2>
        <p className="text-gray-600">Details about self-service options...</p>
        <button
          onClick={navigateBackToDashboard}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
        >
          Back to Dashboard
        </button>
      </main>
      <Footer />
    </div>
  );
}
