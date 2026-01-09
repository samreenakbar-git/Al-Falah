"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectCoverflow, FreeMode } from "swiper/modules";
import Image from "next/image";

import "swiper/css";
import "swiper/css/effect-coverflow";

const projects = [
    { src: "/projects/1.png", alt: "Project 1" },
    { src: "/projects/2.png", alt: "Project 2" },
    { src: "/projects/3.png", alt: "Project 3" },
    { src: "/projects/4.png", alt: "Project 4" },
  ];
const infiniteProjects = [...projects, ...projects, ...projects];

  
  export default function ProjectsSlider() {
    return (
      <section className="relative  py-28 overflow-hidden">
        <div className="mx-auto max-w-7xl px-6">
  
          <div className="mb-16">
            <h2 className="text-3xl font-semibold text-white">
              Ausgewählte Projekte
            </h2>
            <p className="mt-2 max-w-xl text-sm text-white/60">
              Websites, die Marken definieren, Vertrauen aufbauen und messbare
              Ergebnisse liefern.
            </p>
          </div>
  
          <Swiper
            modules={[Autoplay, FreeMode]}
            slidesPerView="auto"
            spaceBetween={80}
            loop
            freeMode={{
              enabled: true,
              momentum: false,
            }}
            speed={8000}              // 🔥 controls scroll speed
            autoplay={{
              delay: 0,
              disableOnInteraction: false,
            }}
            grabCursor
            className="projects-swiper"
          >
            {infiniteProjects.map((project, index) => (
              <SwiperSlide
                key={index}
                className="!w-[420px]"
              >
                <div className="project-3d">
                  <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-black/30">
                    <Image
                      src={project.src}
                      alt={project.alt}
                      fill
                      className="object-cover"
                      sizes="420px"
                    />
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
  
        </div>
      </section>
    );
  }