import Link from "next/link";
import { FaArrowLeft } from "react-icons/fa";
import Image from "next/image";

interface BackButtonProps {
  href: string;
  className?: string;
}

export default function BackButton({
  href,
  className = "text-black hover:text-[#3d4eb0]",
}: BackButtonProps) {
  return (
    <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
      <Link href={href} className={`block p-1 ${className}`}>
        <FaArrowLeft className="h-3 w-3" />
      </Link>
      <Image src="/images/logo.png" alt="Logo" width={24} height={24} />
    </div>
  );
}
