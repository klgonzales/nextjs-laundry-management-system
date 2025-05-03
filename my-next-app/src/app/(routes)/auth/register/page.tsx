import RegisterForm from "@/app/components/auth/RegisterForm";
import BackButton from "@/app/components/common/Home";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <BackButton href="/" />
      <RegisterForm />
      <div className="text-center mt-4">
        <p className="text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="text-[#3D4EB0] hover:text-[#4653A0]"
          >
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
