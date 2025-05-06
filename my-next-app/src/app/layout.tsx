import { Poppins } from "next/font/google";
import "./globals.css";
import type { Metadata } from "next";
import Header from "./components/common/Header";
import { AuthProvider } from "./context/AuthContext";
import { PusherProvider } from "./context/PusherContext";
import { RealTimeUpdatesProvider } from "@/app/context/RealTimeUpdatesContext";
import Image from "next/image";

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Elbi Wash - Laundry Management System",
  description: "Modern laundry management system for efficient service",
  icons: {
    icon: "/images/logo.png",
    apple: "/images/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${poppins.className} bg-gray-50`}>
        <AuthProvider>
          <PusherProvider>
            <RealTimeUpdatesProvider>
              {/* Logo in top left corner */}
              {/* <div className="fixed top-4 left-4 z-50">
                <div className="w-12 h-12 rounded-lg bg-[#3D4EB0] flex items-center justify-center shadow-md">
                  <Image
                    src="/images/logo.png"
                    alt="Elbi Wash Logo"
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                </div>
              </div> */}
              <main className="w-full px-4">{children}</main>
            </RealTimeUpdatesProvider>
          </PusherProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
