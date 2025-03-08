import AdminLoginForm from "@/app/components/admin/LoginForm";
import BackButton from "@/app/components/common/Home";
import Link from "next/link";

export default function AdminLoginPage() {
  return (
    <div>
      <BackButton href="/" />
      <AdminLoginForm />
      <div className="text-center mt-4">
        <p className="text-sm text-gray-600">
          Don't have an account?{" "}
          <Link
            href="/admin/register"
            className="text-purple-600 hover:text-purple-800"
          >
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
