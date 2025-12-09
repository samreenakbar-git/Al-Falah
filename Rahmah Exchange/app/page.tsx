// import { Heart, Shield, Users, HeartIcon, ArrowRight, LogIn } from "lucide-react"
// import Link from "next/link"

// export default function Home() {
//   return (
//     <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
//       {/* Header */}
//       <header className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full border-b border-gray-200">
//         <div className="flex items-center gap-3">
//           <div className="w-10 h-10 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-full flex items-center justify-center shadow-lg">
//             <Heart className="w-6 h-6 text-white fill-white" />
//           </div>
//           <h1 className="text-2xl font-bold text-gray-900">Rahmah Exchange</h1>
//         </div>
//         <div className="flex items-center gap-6">
//           <Link href="/staff/login">
//             <button className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-teal-600 border border-teal-600 rounded-lg hover:bg-teal-50 transition">
//               <LogIn className="w-4 h-4" />
//               Admin Login
//             </button>
//           </Link>
//         </div>
//       </header>

//       {/* Hero Section */}
//       <section className="px-8 py-24 max-w-7xl mx-auto w-full text-center">
//         {/* <div className="mb-8">
//           <span className="inline-block px-2 py-2 bg-teal-50 border border-teal-200 rounded-full text-teal-700 text-sm font-semibold mb-1">
//             Welcome to Rahmah Exchange
//           </span>
//         </div> */}
//         <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-8 text-balance leading-tight">
//           Compassionate Assistance,{" "}
//           <span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
//             Delivered with Dignity
//           </span>
//         </h2>
//         <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12 text-balance leading-relaxed">
//           A secure and compassionate platform connecting those in need with mercy-based support. Apply for assistance
//           with confidence and transparency.
//         </p>
//         <div className="flex flex-col sm:flex-row gap-4 justify-center">
//           <Link href="/form">
//             <button className="px-8 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg font-semibold hover:shadow-lg transition inline-flex items-center gap-2 text-lg">
//               Apply for Assistance
//               <ArrowRight className="w-5 h-5" />
//             </button>
//           </Link>
//           <Link href="/application-status">
//             <button className="px-8 py-4 border-2 border-gray-300 text-gray-900 rounded-lg font-semibold hover:border-gray-400 hover:bg-gray-50 transition inline-flex items-center gap-2 text-lg">
//               Check Status
//               <ArrowRight className="w-5 h-5" />
//             </button>
//           </Link>
//         </div>
//       </section>

//       {/* Features Section */}
//       <section className="px-8 py-24 max-w-7xl mx-auto w-full bg-gradient-to-b from-gray-50 to-white">
//         <h3 className="text-3xl font-bold text-gray-900 text-center mb-4">Why Choose Us</h3>
//         <p className="text-center text-gray-600 max-w-2xl mx-auto mb-16">
//           We're committed to making the assistance process transparent, respectful, and accessible to all.
//         </p>

//         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
//           {/* Feature Card 1 */}
//           <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg border border-gray-200 transition group">
//             <div className="w-14 h-14 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-lg flex items-center justify-center mb-6 group-hover:shadow-lg transition">
//               <Shield className="w-7 h-7 text-teal-600" />
//             </div>
//             <h3 className="text-xl font-bold text-gray-900 mb-3">Secure & Private</h3>
//             <p className="text-gray-600 leading-relaxed">
//               Enterprise-grade security protects your information. All data is encrypted with the utmost
//               confidentiality.
//             </p>
//           </div>

//           {/* Feature Card 2 */}
//           <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg border border-gray-200 transition group">
//             <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg flex items-center justify-center mb-6 group-hover:shadow-lg transition">
//               <Users className="w-7 h-7 text-blue-600" />
//             </div>
//             <h3 className="text-xl font-bold text-gray-900 mb-3">Simple Process</h3>
//             <p className="text-gray-600 leading-relaxed">
//               Easy step-by-step application. Track your status and receive updates throughout the entire process.
//             </p>
//           </div>

//           {/* Feature Card 3 */}
//           <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg border border-gray-200 transition group">
//             <div className="w-14 h-14 bg-gradient-to-br from-cyan-100 to-teal-100 rounded-lg flex items-center justify-center mb-6 group-hover:shadow-lg transition">
//               <HeartIcon className="w-7 h-7 text-cyan-600" />
//             </div>
//             <h3 className="text-xl font-bold text-gray-900 mb-3">Compassionate Care</h3>
//             <p className="text-gray-600 leading-relaxed">
//               Our dedicated team reviews applications with care and respect, ensuring fair assistance for eligible
//               applicants.
//             </p>
//           </div>
//         </div>
//       </section>

//       {/* CTA Section */}
//       <section className="px-8 py-24 max-w-4xl mx-auto w-full text-center">
//         <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-12 text-white shadow-lg">
//           <h3 className="text-3xl font-bold mb-4">Ready to Apply?</h3>
//           <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
//             The application process typically takes 10-15 minutes. Gather your documents and start your application
//             today.
//           </p>
//           <Link href="/form">
//             <button className="px-8 py-3 bg-white text-teal-600 rounded-lg font-semibold hover:shadow-lg transition">
//               Start Application Now
//             </button>
//           </Link>
//         </div>
//       </section>

//       {/* Footer */}
//       <footer className="px-8 py-12 bg-gray-900 text-white border-t border-gray-800">
//         <div className="max-w-7xl mx-auto w-full">
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 pb-8 border-b border-gray-800">
//             <div>
//               <h4 className="font-bold mb-4 flex items-center gap-2">
//                 <Heart className="w-5 h-5 fill-white" />
//                 Rahmah Exchange
//               </h4>
//               <p className="text-gray-400 text-sm">Mercy-based giving network for verified need.</p>
//             </div>
//             <div>
//               <h4 className="font-bold mb-4">Quick Links</h4>
//               <ul className="space-y-2 text-sm">
//                 <li>
//                   <Link href="/form" className="text-gray-400 hover:text-white transition">
//                     Apply
//                   </Link>
//                 </li>
//                 <li>
//                   <Link href="/application-status" className="text-gray-400 hover:text-white transition">
//                     Check Status
//                   </Link>
//                 </li>
//               </ul>
//             </div>
//             <div>
//               <h4 className="font-bold mb-4">Support</h4>
//               <p className="text-gray-400 text-sm">For questions or assistance, please contact our support team.</p>
//               <br/>000-123-4567<br />
//             </div>
//           </div>
//           <p className="text-center text-gray-500 text-sm">2025 Rahmah Exchange. All rights reserved.</p>
//         </div>
//       </footer>
//     </div>
//   )
// }
"use client";
import { Heart, Shield, Users, HeartIcon, ArrowRight, LogIn, PlayCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import Header from "@/components/header";

export default function Home() {
  const [playing, setPlaying] = useState(false);

  const toggleAudio = () => {
    const audio = document.getElementById("quranAudio") as HTMLAudioElement;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 relative overflow-hidden">
        <Header />
      {/* Hero Section */}
    <section className="px-8 pt-40 max-w-7xl mx-auto w-full flex flex-col md:flex-row items-center gap-12">

        {/* Text Side */}
        <div className="flex-1 text-left">
        <h3 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 leading-tight">
            Compassionate Assistance,{" "}
            <span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
              Delivered with Dignity
            </span>
          </h3>
          <p className="text-xl text-gray-600 mb-12 leading-relaxed max-w-lg">
            A secure and compassionate platform connecting those in need with mercy-based support. Apply for
            assistance with confidence and transparency.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/form">
              <button className="px-8 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg font-semibold hover:shadow-lg transition inline-flex items-center gap-2 text-lg">
                Apply for Assistance
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/application-status">
              <button className="px-8 py-4 border-2 border-gray-300 text-gray-900 rounded-lg font-semibold hover:border-gray-400 hover:bg-gray-50 transition inline-flex items-center gap-2 text-lg">
                Check Status
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
          </div>
        </div>

        {/* Image Side */}
       <div className="flex-1 -mt-16">
          <Image
            src="/31.svg"
            alt="Compassionate Help"
            width={600}
            height={600}
          />
        </div>
      </section>
        {/* About Us Section */}
        <section className="relative py-24 px-8 bg-gradient-to-b from-white via-gray-50 to-white overflow-hidden">
          {/* Background Image Wrapper */}
          <div className="absolute inset-0 flex justify-center items-center -z-10 opacity-20">
            <Image
              src="/32.svg"
              alt="About Rahmah Exchange background"
              width={200}
              height={200}
              className="object-contain"
            />
          </div>

          {/* Light overlay for readability */}
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] -z-10" />

          {/* Content */}
          <div className="max-w-5xl mx-auto text-center relative">
            <h3 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">
              About{" "}
              <span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                Us
              </span>
            </h3>
            <p className="text-gray-700 text-lg md:text-xl leading-relaxed max-w-3xl mx-auto">
              <span className="font-semibold text-teal-700">Rahmah Exchange</span> is a faith-inspired initiative rooted in
              compassion and mercy. Our mission is to connect generous hearts with those in need — ensuring every act of giving
              is filled with{" "}
              <span className="text-teal-600 font-semibold">dignity, trust,</span> and{" "}
              <span className="text-cyan-600 font-semibold">transparency.</span>
            </p>
          </div>
        </section>



     {/* Features Section */}
       <section className="px-8 py-24 max-w-7xl mx-auto w-full bg-gradient-to-b from-gray-50 to-white">
         <h3 className="text-3xl font-bold text-gray-900 text-center mb-4">Why Choose Us</h3>
         <p className="text-center text-gray-600 max-w-2xl mx-auto mb-16">
           We're committed to making the assistance process transparent, respectful, and accessible to all.
         </p>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {/* Feature Card 1 */}
           <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg border border-gray-200 transition group">
             <div className="w-14 h-14 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-lg flex items-center justify-center mb-6 group-hover:shadow-lg transition">
               <Shield className="w-7 h-7 text-teal-600" />
             </div>
             <h3 className="text-xl font-bold text-gray-900 mb-3">Secure & Private</h3>
             <p className="text-gray-600 leading-relaxed">
               Enterprise-grade security protects your information. All data is encrypted with the utmost
               confidentiality.
             </p>
           </div>

           {/* Feature Card 2 */}
           <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg border border-gray-200 transition group">
             <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg flex items-center justify-center mb-6 group-hover:shadow-lg transition">
               <Users className="w-7 h-7 text-blue-600" />
             </div>
             <h3 className="text-xl font-bold text-gray-900 mb-3">Simple Process</h3>
             <p className="text-gray-600 leading-relaxed">
               Easy step-by-step application. Track your status and receive updates throughout the entire process.
             </p>
           </div>

           {/* Feature Card 3 */}
           <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg border border-gray-200 transition group">
             <div className="w-14 h-14 bg-gradient-to-br from-cyan-100 to-teal-100 rounded-lg flex items-center justify-center mb-6 group-hover:shadow-lg transition">
               <HeartIcon className="w-7 h-7 text-cyan-600" />
             </div>
             <h3 className="text-xl font-bold text-gray-900 mb-3">Compassionate Care</h3>
             <p className="text-gray-600 leading-relaxed">
               Our dedicated team reviews applications with care and respect, ensuring fair assistance for eligible
               applicants.
             </p>
           </div>
         </div>
       </section>

       {/* CTA Section */}
           <section
  className="relative py-24 bg-gray-900"
  style={{
    backgroundImage: "url('/32.svg')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  }}
>
  {/* Overlay */}
  <div className="absolute inset-0 bg-gradient-to-r from-teal-600/70 to-cyan-600/70"></div>

  {/* Content */}
  <div className="relative max-w-4xl mx-auto w-full text-center px-8">
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-12 text-white shadow-lg">
      <h3 className="text-3xl font-bold mb-4">Ready to Apply?</h3>
      <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
        The application process typically takes 10-15 minutes. Gather your documents and start your application today.
      </p>
      <Link href="/form">
        <button className="px-8 py-3 bg-white text-teal-600 rounded-lg font-semibold hover:shadow-lg transition">
          Start Application Now
        </button>
      </Link>
    </div>
  </div>
</section>

       {/* Footer */}
       <footer className="px-8 py-12 bg-gray-900 text-white border-t border-gray-800">
         <div className="max-w-7xl mx-auto w-full">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 pb-8 border-b border-gray-800">
             <div>
               <h4 className="font-bold mb-4 flex items-center gap-2">
                 <Heart className="w-5 h-5 fill-white" />
                 Rahmah Exchange
               </h4>
               <p className="text-gray-400 text-sm">Mercy-based giving network for verified need.</p>
             </div>
             <div>
               <h4 className="font-bold mb-4">Quick Links</h4>
               <ul className="space-y-2 text-sm">
                 <li>
                   <Link href="/form" className="text-gray-400 hover:text-white transition">
                     Apply
                   </Link>
                 </li>
                 <li>
                   <Link href="/application-status" className="text-gray-400 hover:text-white transition">
                     Check Status
                   </Link>
                 </li>
               </ul>
             </div>
             <div>
               <h4 className="font-bold mb-4">Support</h4>
               <p className="text-gray-400 text-sm">For questions or assistance, please contact our support team.</p>
               <br/>000-123-4567<br />
             </div>
           </div>
           <p className="text-center text-gray-500 text-sm">2025 Rahmah Exchange. All rights reserved.</p>
         </div>
       </footer>
     </div>
   )
 }
