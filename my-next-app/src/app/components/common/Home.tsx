import Link from "next/link";

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
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3 w-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </Link>
    </div>
  );
}
