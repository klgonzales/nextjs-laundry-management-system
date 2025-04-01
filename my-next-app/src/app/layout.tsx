import { Poppins } from "next/font/google";
import "./globals.css";
import type { Metadata } from "next";
import Header from "./components/common/Header";
import { AuthProvider } from "./context/AuthContext"; // Import the AuthProvider

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Elbi Wash - Laundry Management System",
  description: "Modern laundry management system for efficient service",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${poppins.className} min-h-screen bg-gray-50`}>
        <AuthProvider>
          {/* <Header userType="client" /> */}
          <main className="container mx-auto px-4">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
