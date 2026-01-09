import Image from "next/image";
import FlowLine from "@/components/FlowLine";
// import Header from "@/components/header";
import ProjectsSlider from "@/components/ProjectsSlider";
import Link from "next/link";
const partners = [
  { src: "/partners/1.png", alt: "Eightball" },
  { src: "/partners/2.png", alt: "Alt+Shift" },
  { src: "/partners/3.png", alt: "Cubekit" },
  { src: "/partners/4.png", alt: "AlphaWave" },
  { src: "/partners/5.png", alt: "Acme Corp" },
  { src: "/partners/6.png", alt: "3Portals" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#021618] text-white">
      <header className="relative overflow-hidden bg-gradient-to-b from-[#021c21] via-[#022629] to-[#021618]">
        <FlowLine />

        <div className="relative mx-auto max-w-6xl px-5 pt-6 md:px-10 lg:px-6">

          {/* ================= NAV ================= */}
          <nav className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Link href="/" className="nav-logo-wraper w-inline-block w--current">
                <Image
                  src="/velmoy-logo.png"
                  alt="VELMOY DEVELOPMENT"
                  className="nav-logo-img"
                  width={150}
                  height={45}
                  priority
                />
              </Link>
            </div>

            <div className="hidden items-center gap-8 text-sm text-white/70 md:flex">
              {[
                "Home",
                "Projekte",
                "Leistungen",
                "Kundenstimmen",
                "Partner",
                "Über uns",
                "FAQ",
              ].map((item) => (
                <button
                  key={item}
                  className="transition hover:text-white"
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="div-block">
            <Link
      href="#"
      className="group inline-flex items-center gap-3 rounded-full px-2 py-3 transition-all duration-300"
    >
      {/* Circle with Arrow */}
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#0fdac2] transition-transform duration-300 group-hover:rotate-45">
        <img
          src="https://cdn.prod.website-files.com/69520a2c277733cc29083e37/695263b4c33ebffff4fb687f_Arrow%201%20(1).svg"
          alt="Arrow"
          className="h-4 w-4"
        />
      </div>

      {/* Text */}
      <span className="text-sm font-medium text-white">
        Kontaktiere Uns
      </span>
    </Link>
          </div>
          </nav>

          {/* ================= HERO CONTENT ================= */}
          <div className="relative flex flex-col items-center py-20 text-center">
            <div className="relative z-10 max-w-3xl space-y-7">
              <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl">
                Webseiten, die verkaufen, überzeugen und messbare Ergebnisse
                liefern
              </h1>

              <p className="mx-auto max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
                Design. Development. Growth. – Strategisch gestaltet, technisch
                perfekt umgesetzt und auf Wachstum optimiert.
              </p>

              <div className="pt-4">
              <Link
      href="#"
      className="group inline-flex items-center gap-3 rounded-full px-2 py-3 transition-all duration-300 bg-white text-{#92E5BD}"
    >
      {/* Circle with Arrow */}
      <div className="flex h-8 w-14 items-center justify-center rounded-full border transition-transform duration-300 group-hover:rotate-45">
      <img
        src="https://cdn.prod.website-files.com/69520a2c277733cc29083e37/695263b4c33ebffff4fb687f_Arrow%201%20(1).svg"
        alt="Arrow"
        className="h-4 w-4 filter brightness-0"
      />
      </div>

      {/* Text */}
      <span className="text-sm font-medium text-black">
        Kontaktiere Uns
      </span>
    </Link>
              </div>
            </div>
          </div>

          {/* ================= PARTNERS ================= */}
          <div className="pb-32 text-center">
            <p className="mb-4 text-xs uppercase tracking-[0.3em] text-white/40">
              Our Partners
            </p>

            <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
              {partners.map((partner, index) => (
                <div
                  key={index}
                  className="relative h-8 w-28 opacity-70 transition hover:opacity-100"
                >
                  <Image
                    src={partner.src}
                    alt={partner.alt}
                    fill
                    className="object-contain"
                  />
                </div>
              ))}
            </div>
          </div>



        </div>
        <ProjectsSlider />

      </header>
    </div>
  );
}
