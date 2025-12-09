"use client";

import Link from "next/link";
import Image from "next/image";
import { LogOut, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { removeAuthToken } from "@/lib/auth-utils";

export default function Header() {
  const router = useRouter();

  const handleLogout = () => {
    removeAuthToken();
    router.push("/staff/login");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-8 py-4 max-w-7xl mx-auto w-full">
        {/* Logo */}
        <Link href="/staff/dashboard" className="flex items-center gap-3">
          <Image
            src="/logo1.svg"
            alt="Rahmah Exchange Logo"
            width={140}
            height={140}
            priority
          />
        </Link>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          <Link href="/messages" className="hidden md:flex items-center gap-2 px-4 py-2 text-gray-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition font-medium">
            <Mail className="w-4 h-4 text-teal-600" />
            Messages
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-red-50 hover:text-red-600 rounded-lg transition font-medium"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
