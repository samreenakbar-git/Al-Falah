"use client"

import type React from "react"

import { Heart, Shield, Users, HeartIcon, ChevronDown, ArrowRight, Award, Zap, CheckCircle, Menu, X } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"

export default function Home() {
  const pathname = usePathname()
  const [activeSection, setActiveSection] = useState("home")
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    element?.scrollIntoView({ behavior: "smooth" })
    setActiveSection(sectionId)
    setIsMobileMenuOpen(false) // Close mobile menu when navigating
  }

  const navLink = (sectionId: string) =>
    `text-sm font-medium transition cursor-pointer
    ${activeSection === sectionId ? "border-b-2 border-white pb-1 text-white" : "text-white/80 hover:text-white"}`

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* ================= HEADER ================= */}
      <header
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          isScrolled ? "bg-[#97AE2C]/95 shadow-lg backdrop-blur-sm" : "bg-[#97AE2C]/70"
        } px-4 sm:px-6 lg:px-10 py-4 flex items-center justify-between text-white`}
      >
        <div className="flex items-center gap-2 font-bold text-lg flex-shrink-0">
          <Image
            src="/logo2.svg"
            alt="Al Falah Logo"
            width={170}
            height={170}
            priority
            className="w-32 sm:w-40 lg:w-[170px] h-auto"
          />
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
          <button onClick={() => scrollToSection("home")} className={navLink("home")}>
            Home
          </button>
          <button onClick={() => scrollToSection("about")} className={navLink("about")}>
            About Us
          </button>
          <button onClick={() => scrollToSection("services")} className={navLink("services")}>
            Services
          </button>
          <button onClick={() => scrollToSection("reviews")} className={navLink("reviews")}>
            Reviews
          </button>
          <button onClick={() => scrollToSection("faq")} className={navLink("faq")}>
            FAQ's
          </button>

          <Link
            href="/staff/login"
            className="bg-white text-[#97AE2C]/95 px-4 xl:px-5 py-2 rounded-full text-sm font-semibold hover:bg-gray-100 hover:shadow-lg transition whitespace-nowrap"
          >
            Admin Login
          </Link>
        </nav>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden p-2 text-white hover:bg-[#97AE2C]/95 rounded-lg transition"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="absolute top-full left-0 w-full bg-[#97AE2C]/95 shadow-xl lg:hidden">
            <nav className="flex flex-col py-4">
              <button
                onClick={() => scrollToSection("home")}
                className={`px-6 py-3 text-left transition ${activeSection === "home" ? "bg-[#97AE2C] text-white" : "text-white/80 hover:bg-[#97AE2C] hover:text-white"}`}
              >
                Home
              </button>
              <button
                onClick={() => scrollToSection("about")}
                className={`px-6 py-3 text-left transition ${activeSection === "about" ? "bg-[#97AE2C]/95 text-white" : "text-white/80 hover:bg-[#97AE2C]/95 hover:text-white"}`}
              >
                About Us
              </button>
              <button
                onClick={() => scrollToSection("services")}
                className={`px-6 py-3 text-left transition ${activeSection === "services" ? "bg-[#97AE2C]/95 text-white" : "text-white/80 hover:bg-[#97AE2C]/95 hover:text-white"}`}
              >
                Services
              </button>
              <button
                onClick={() => scrollToSection("reviews")}
                className={`px-6 py-3 text-left transition ${activeSection === "reviews" ? "bg-[#97AE2C]/95 text-white" : "text-white/80 hover:bg-[#97AE2C]/95 hover:text-white"}`}
              >
                Reviews
              </button>
              <button
                onClick={() => scrollToSection("faq")}
                className={`px-6 py-3 text-left transition ${activeSection === "faq" ? "bg-[#97AE2C]/95 text-white" : "text-white/80 hover:bg-[#97AE2C]/95 hover:text-white"}`}
              >
                FAQ's
              </button>
              <Link
                href="/staff/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="mx-6 mt-2 mb-4 bg-white bg-[#97AE2C]/95 px-5 py-2 rounded-full text-sm font-semibold hover:bg-gray-100 hover:shadow-lg transition text-center"
              >
                Admin Login
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* ================= HERO SECTION ================= */}
      <section
        id="home"
        className="relative w-full min-h-screen bg-cover bg-center pt-15"
        style={{
          backgroundImage: "url('Vector.png')",
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-[#97AE2C]/90"></div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 md:py-32 flex flex-col md:flex-row items-center gap-8 md:gap-12 text-white">
          {/* Text */}
          <div className="flex-1 animate-fadeInUp text-center md:text-left">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight mb-4 sm:mb-6 text-balance">
              Compassionate Assistance,
              <br />
              <span className="text-black">Delivered with Dignity</span>
            </h1>

            <p className="text-base sm:text-lg text-white/90 max-w-xl mx-auto md:mx-0 mb-6 sm:mb-8 leading-relaxed">
              A secure and compassionate platform connecting those in need with mercy-based support.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center md:justify-start">
              <Link href="/form" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-black rounded-lg font-semibold hover:shadow-xl hover:scale-105 transition-all text-sm sm:text-base">
                  Apply for Assistance
                </button>
              </Link>

              <Link href="/application-status" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-all text-sm sm:text-base">
                  Check Status
                </button>
              </Link>
            </div>
          </div>

          {/* Image */}
          <div className="flex-1 flex justify-center md:justify-end animate-slideInRight">
            <div className="animate-float">
              <Image
                src="/mosque.png"
                alt="Help Illustration"
                width={420}
                height={420}
                priority
                className="drop-shadow-xl w-full max-w-[280px] sm:max-w-[350px] md:max-w-[420px] h-auto"
              />
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce cursor-pointer"
          onClick={() => scrollToSection("about")}
        >
          <ChevronDown className="w-8 h-8 text-white" />
        </div>
      </section>

      {/* ================= ABOUT SECTION ================= */}
      <section id="about" className="py-24 px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 animate-fadeInUp">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              About <span className="bg-[#97AE2C]/150">Us</span>
            </h2>
            <p className="text-gray-600 text-lg max-w-3xl mx-auto leading-relaxed">
              Al-Falah is a faith-inspired initiative rooted in compassion, connecting generous hearts with those
              in need. We believe in the power of community and the importance of dignity in giving.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <div
              className="p-8 bg-gradient-to-br from-[#97AE2C]/50 to-white border-2 border-[#97AE2C]/200 rounded-2xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 animate-fadeInUp"
              style={{ animationDelay: "0.1s" }}
            >
              <div className="w-14 h-14 bg-[#97AE2C]/95 rounded-full flex items-center justify-center mb-4 text-white">
                <Heart className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Compassionate Care</h3>
              <p className="text-gray-600">
                We treat every person with dignity and respect, understanding that true support goes beyond financial
                assistance.
              </p>
            </div>

            <div
              className="p-8 bg-gradient-to-br from-[#97AE2C]/50 to-white border-2 border-[#97AE2C]/200 rounded-2xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 animate-fadeInUp"
              style={{ animationDelay: "0.2s" }}
            >
              <div className="w-14 h-14 bg-[#97AE2C]/95 rounded-full flex items-center justify-center mb-4 text-white">
                <Shield className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Secure & Transparent</h3>
              <p className="text-gray-600">
                Your information is protected with the highest security standards, and all processes are transparent and
                accountable.
              </p>
            </div>

            <div
              className="p-8 bg-gradient-to-br from-[#97AE2C]/50 to-white border-2 border-[#97AE2C]/200 rounded-2xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 animate-fadeInUp"
              style={{ animationDelay: "0.3s" }}
            >
              <div className="w-14 h-14 bg-[#97AE2C]/95 rounded-full flex items-center justify-center mb-4 text-white">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Community-Driven</h3>
              <p className="text-gray-600">
                Built on the foundation of community support, bringing generous donors and those in need together.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SERVICES SECTION ================= */}
      <section id="services" className="px-8 py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fadeInUp">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Our <span className="bg-[#97AE2C]/95">Services</span>
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              We offer comprehensive support services tailored to meet the diverse needs of our community.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <ServiceCard
              icon={<Heart className="w-12 h-12" />}
              title="Zakah and Sadaqah Services"
              description="Lorem Ipsum is simply dummy text of the printing and typesetting Lorem Ipsum is simply dummy text of the printing and typesetting"
              delay="0s"
            />
            <ServiceCard
              icon={<Shield className="w-12 h-12" />}
              title="Emergency Relief"
              description="Quick and compassionate response to urgent needs. We understand that some situations require immediate assistance and are ready to help."
              delay="0.1s"
            />
            <ServiceCard
              icon={<Users className="w-12 h-12" />}
              title="Community Support Programs"
              description="Long-term sustainable support programs designed to help individuals and families achieve self-sufficiency and improve their quality of life."
              delay="0.2s"
            />
            <ServiceCard
              icon={<HeartIcon className="w-12 h-12" />}
              title="Mentorship & Guidance"
              description="Personal guidance and mentorship programs connecting beneficiaries with experienced mentors who provide support and wisdom."
              delay="0.3s"
            />
          </div>
        </div>
      </section>

      {/* ================= FEATURES SECTION ================= */}
      <section className="px-8 py-24 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fadeInUp">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Why Choose <span className="text-[#97AE2C]/200">Al-Falah</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Feature
              icon={<Zap className="w-8 h-8" />}
              title="Fast & Easy"
              description="Simple application process that takes just minutes to complete."
              delay="0s"
            />
            <Feature
              icon={<Award className="w-8 h-8" />}
              title="Verified & Trusted"
              description="All applications are carefully verified to ensure funds reach those truly in need."
              delay="0.1s"
            />
            <Feature
              icon={<CheckCircle className="w-8 h-8" />}
              title="Transparent Process"
              description="Complete transparency at every step of your application and approval journey."
              delay="0.2s"
            />
          </div>
        </div>
      </section>

      {/* ================= REVIEWS SECTION ================= */}
      <section id="reviews" className="py-24 px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fadeInUp">
            <p className="text-[#97AE2C]/600 font-semibold text-sm mb-2">TESTIMONIAL</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              What People <span className="text-[#97AE2C]/600">Say About Us</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <ReviewCard
              title="Kindness"
              quote="Lorem Ipsum is simply dummy text Lorem Ipsum is simply dummy text Lorem Ipsum is simply dummy text Lorem Ipsum is simply dummy text"
              author="Bashir Muhammad"
              role="Senior Gardener Farmer"
              delay="0s"
            />
            <ReviewCard
              title="Humanity"
              quote="Lorem Ipsum is simply dummy text Lorem Ipsum is simply dummy text Lorem Ipsum is simply dummy text Lorem Ipsum is simply dummy text"
              author="Bashir Muhammad"
              role="Senior Gardener Farmer"
              delay="0.1s"
            />
            <ReviewCard
              title="Ethics & Morality"
              quote="Lorem Ipsum is simply dummy text Lorem Ipsum is simply dummy text Lorem Ipsum is simply dummy text Lorem Ipsum is simply dummy text"
              author="Bashir Muhammad"
              role="Senior Gardener Farmer"
              delay="0.2s"
            />
          </div>
        </div>
      </section>

      {/* ================= FAQ SECTION ================= */}
      <section id="faq" className="py-24 px-8 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16 animate-fadeInUp">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Frequently Asked <span className="text-[#97AE2C]/600">Questions</span>
            </h2>
            <p className="text-gray-600 text-lg">
              Find answers to common questions about our application process and services.
            </p>
          </div>

          <div className="space-y-4">
            <FAQItem
              question="How to apply?"
              answer="To apply for assistance, click the 'Apply for Assistance' button on our homepage. You'll be guided through a simple step-by-step process. Fill in your basic information, provide details about your situation, and upload any supporting documents. Our team will review your application within 3-5 business days."
            />
            <FAQItem
              question="Which types of documents are needed?"
              answer="Required documents typically include: Government-issued ID, Proof of residence (utility bill or rental agreement), Income documentation (if applicable), Medical records (if health-related), and any other documents supporting your case. Specific requirements depend on your situation."
            />
            <FAQItem
              question="How many days to complete this process?"
              answer="The typical timeline is 5-10 business days from application submission to final decision. This includes: 1-2 days for initial review, 2-3 days for verification, 2-3 days for assessment, and 1-2 days for final approval. Urgent cases may be expedited."
            />
            <FAQItem
              question="How to contact us?"
              answer="You can reach us through multiple channels: Phone: 000-123-4567, Email: support@rahmahexchange.com, or use our contact form on the website. For urgent matters, please call our hotline. We're available Monday-Friday, 9 AM - 5 PM."
            />
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="bg-gradient-to-b from-gray-900 to-black text-gray-400 px-8 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="animate-fadeInUp" style={{ animationDelay: "0s" }}>
              <div className="flex items-center gap-3 mb-4">
              <Image
              src="/logo2.svg"
              alt="Al Falah Logo"
              width={170}
              height={170}
              priority
            />
              </div>
              <p className="text-sm leading-relaxed text-gray-300">
                Mercy-based giving network for verified need. Compassionate assistance delivered with dignity.
              </p>
            </div>

            <div className="animate-fadeInUp" style={{ animationDelay: "0.1s" }}>
              <h4 className="text-white font-bold mb-4 flex items-center gap-2">Quick Links</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <button
                    onClick={() => scrollToSection("home")}
                    className="hover:text-white transition-colors hover:translate-x-1 inline-flex items-center gap-1"
                  >
                    <ArrowRight className="w-4 h-4" /> Home
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("about")}
                    className="hover:text-white transition-colors hover:translate-x-1 inline-flex items-center gap-1"
                  >
                    <ArrowRight className="w-4 h-4" /> About
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("services")}
                    className="hover:text-white transition-colors hover:translate-x-1 inline-flex items-center gap-1"
                  >
                    <ArrowRight className="w-4 h-4" /> Services
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("reviews")}
                    className="hover:text-white transition-colors hover:translate-x-1 inline-flex items-center gap-1"
                  >
                    <ArrowRight className="w-4 h-4" /> Reviews
                  </button>
                </li>
              </ul>
            </div>

            <div className="animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
              <h4 className="text-white font-bold mb-4">Resources</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <button
                    onClick={() => scrollToSection("faq")}
                    className="hover:text-white transition-colors hover:translate-x-1 inline-flex items-center gap-1"
                  >
                    <ArrowRight className="w-4 h-4" /> FAQ's
                  </button>
                </li>
                <li>
                  <Link
                    href="/form"
                    className="hover:text-white transition-colors hover:translate-x-1 inline-flex items-center gap-1"
                  >
                    <ArrowRight className="w-4 h-4" /> Apply Now
                  </Link>
                </li>
                <li>
                  <Link
                    href="/application-status"
                    className="hover:text-white transition-colors hover:translate-x-1 inline-flex items-center gap-1"
                  >
                    <ArrowRight className="w-4 h-4" /> Check Status
                  </Link>
                </li>
              </ul>
            </div>

            <div className="animate-fadeInUp" style={{ animationDelay: "0.3s" }}>
              <h4 className="text-white font-bold mb-4">Support</h4>
              <p className="text-sm mb-3 text-gray-300">
                <span className="block font-semibold text-white">Phone</span>
                000-123-4567
              </p>
              <p className="text-sm text-gray-300">
                <span className="block font-semibold text-white">Email</span>
                support@rahmahexchange.com
              </p>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center text-center md:text-left text-sm text-gray-500">
              <p>&copy; 2026 Al-Falah. All rights reserved.</p>
              <div className="flex gap-6 mt-4 md:mt-0">
                <Link href="#" className="hover:text-white transition">
                  Privacy Policy
                </Link>
                <Link href="#" className="hover:text-white transition">
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ================= SERVICE CARD COMPONENT ================= */
function ServiceCard({
  icon,
  title,
  description,
  delay,
}: {
  icon: React.ReactNode
  title: string
  description: string
  delay: string
}) {
  return (
    <div
      className="bg-[#97AE2C]/700 text-white p-10 rounded-2xl flex flex-col justify-between h-full hover:shadow-2xl hover:scale-105 transition-all duration-300 animate-fadeInUp"
      style={{ animationDelay: delay }}
    >
      <div>
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-6">{icon}</div>
        <h3 className="text-2xl font-bold mb-4">{title}</h3>
        <p className="text-white/90 leading-relaxed mb-6">{description}</p>
      </div>
      {/* <Link href="#" className="text-white font-semibold flex items-center gap-2 hover:gap-4 transition">
        View More <ArrowRight className="w-4 h-4" />
      </Link> */}
    </div>
  )
}

/* ================= FEATURE CARD COMPONENT ================= */
function Feature({
  icon,
  title,
  description,
  delay,
}: {
  icon: React.ReactNode
  title: string
  description?: string
  delay: string
}) {
  return (
    <div
      className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 text-center border border-gray-200 border-l-4 border-l-[#97AE2C]/600 animate-fadeInUp"
      style={{ animationDelay: delay }}
    >
      <div className="w-14 h-14 mx-auto mb-4 text-[#97AE2C]/600 bg-[#97AE2C]/10 rounded-full flex items-center justify-center">
        {icon}
      </div>
      <h4 className="font-bold text-lg mb-2 text-gray-900">{title}</h4>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}

/* ================= REVIEW CARD COMPONENT ================= */
function ReviewCard({
  title,
  quote,
  author,
  role,
  delay,
}: {
  title: string
  quote: string
  author: string
  role: string
  delay: string
}) {
  return (
    <div
      className="bg-white p-8 rounded-2xl border-2 border-[#97AE2C]/600 hover:shadow-xl hover:scale-105 transition-all duration-300 animate-fadeInUp"
      style={{ animationDelay: delay }}
    >
      <div className="text-[#97AE2C]/600 text-5xl mb-4 leading-none">"</div>
      <h4 className="font-bold text-lg mb-2 text-gray-900">{title}</h4>
      <p className="text-gray-600 text-sm leading-relaxed mb-6">{quote}</p>
      <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
        <div className="w-12 h-12 bg-gradient-to-br from-[#97AE2C]/400 to-[#97AE2C]/600 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold">
          {author.charAt(0)}
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{author}</p>
          <p className="text-gray-600 text-xs">{role}</p>
        </div>
      </div>
    </div>
  )
}

/* ================= FAQ ITEM COMPONENT ================= */
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden hover:border-[#97AE2C]/600 hover:shadow-lg transition-all duration-300 group">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 bg-white hover:bg-[#97AE2C]/50 transition text-left"
      >
        <h3 className="font-semibold text-gray-900 group-hover:text-[#97AE2C]/600 transition">{question}</h3>
        <ChevronDown
          className={`w-5 h-5 text-[#97AE2C]/600 transition-transform flex-shrink-0 ${isOpen ? "transform rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="px-6 py-4 bg-[#97AE2C]/50 border-t border-gray-200 animate-fadeInUp">
          <p className="text-gray-600 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  )
}
