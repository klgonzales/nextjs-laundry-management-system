import LoginForm from "@/app/components/auth/LoginForm";
import BackButton from "@/app/components/common/Home";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <BackButton href="/" />
      <LoginForm />
      <div className="text-center mt-4">
        <p className="text-sm text-gray-600">
          Don't have an account?{" "}
          <Link
            href="/auth/register"
            className="text-[#3D4EB0] hover:text-[#4653A0]"
          >
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
