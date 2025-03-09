import Link from "next/link";
import { FaArrowLeft } from "react-icons/fa";

interface BackButtonProps {
  href: string;
  className?: string;
}

export default function BackButton({
  href,
  className = "text-purple-600 hover:text-purple-800",
}: BackButtonProps) {
  return (
    <div className="absolute top-4 left-4 z-10">
      <Link href={href} className={`block p-1 ${className}`}>
        <FaArrowLeft className="h-3 w-3" />
      </Link>
    </div>
  );
}
