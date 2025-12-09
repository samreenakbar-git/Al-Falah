"use client";

import Link from "next/link";
import Image from "next/image";
import { LogIn } from "lucide-react";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="flex items-center justify-between px-8 py-4 max-w-7xl mx-auto w-full">
        {/* Logo Section */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo1.svg"
              alt="Rahmah Exchange Logo"
              width={170}
              height={170}
              priority
            />
          </Link>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-6">
          <Link href="/staff/login">
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-teal-600 border border-teal-600 rounded-lg hover:bg-teal-50 transition">
              <LogIn className="w-4 h-4" />
              Admin Login
            </button>
          </Link>
        </div>
      </div>
    </header>
  );
}
