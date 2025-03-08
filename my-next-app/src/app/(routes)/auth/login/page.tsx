import LoginForm from "@/app/components/auth/LoginForm";
import BackButton from "@/app/components/common/Home";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div>
      <BackButton href="/" />
      <LoginForm />
      <div className="text-center mt-4">
        <p className="text-sm text-gray-600">
          Don't have an account?{" "}
          <Link
            href="/auth/register"
            className="text-blue-600 hover:text-blue-800"
          >
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}
