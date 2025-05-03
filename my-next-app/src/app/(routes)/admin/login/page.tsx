import AdminLoginForm from "@/app/components/admin/LoginForm";
import BackButton from "@/app/components/common/Home";
import Link from "next/link";

export default function AdminLoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <BackButton href="/" />
      <AdminLoginForm />
      <div className="text-center mt-4">
        <p className="text-sm text-gray-600">
          Don't have an account?{" "}
          <Link
            href="/admin/register"
            className="text-[#3D4EB0] hover:text-[#4653A0]"
          >
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
