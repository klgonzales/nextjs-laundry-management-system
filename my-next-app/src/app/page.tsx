import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">
        Welcome to Elbi Wash
      </h1>
      <p className="text-xl text-gray-600 mb-8 text-center max-w-2xl">
        Your one-stop solution for efficient laundry management.
      </p>
      <div className="space-y-4 flex flex-col items-center">
        <div className="space-x-4">
          <Link
            href="/auth/login"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors"
          >
            Sign In
          </Link>
        </div>
        <Link
          href="/auth/register"
          className="inline-block bg-gray-600 text-white px-6 py-3 rounded-md hover:bg-gray-700 transition-colors"
        >
          Register
        </Link>
        <div></div>
        <div className="mt-4 pt-4 border-t border-gray-300 w-full text-center">
          <Link
            href="/admin/login"
            className="inline-block bg-purple-600 text-white px-6 py-3 rounded-md hover:bg-purple-700 transition-colors"
          >
            Continue as Admin
          </Link>
        </div>
      </div>
    </div>
  );
}
