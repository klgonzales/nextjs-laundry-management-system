import AdminRegisterForm from "@/app/components/admin/RegisterForm";
import BackButton from "@/app/components/common/Home";
import Link from "next/link";

export default function AdminRegisterPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      {/* <BackButton href="/" /> */}
      <AdminRegisterForm />
      {/* <div className="text-center mt-4">
        <p className="text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            href="/admin/login"
            className="text-[#3D4EB0] hover:text-[#4653A0]"
          >
            Sign in here
          </Link>
        </p>
      </div> */}
    </div>
  );
}
