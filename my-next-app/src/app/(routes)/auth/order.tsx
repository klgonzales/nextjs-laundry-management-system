"use client";

import { useRouter } from "next/navigation";

export default function Order() {
  const router = useRouter();

  const navigateBackToDashboard = () => {
    router.push("/auth/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 container mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold mb-4">HIII</h2>
        <p className="text-gray-600">Details about self-service options...</p>
        <button
          onClick={navigateBackToDashboard}
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
        >
          Back to Dashboard
        </button>
      </main>
    </div>
  );
}
