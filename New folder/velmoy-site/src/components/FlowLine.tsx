"use client";
import { useEffect, useRef } from "react";

export default function FlowLine(props?: React.SVGProps<SVGSVGElement>) {
  const pathRef = useRef<SVGPathElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const path = pathRef.current;
    const svg = svgRef.current;
    if (!path || !svg) return;

    const pathLength = path.getTotalLength();
    path.style.strokeDasharray = pathLength.toString();
    path.style.strokeDashoffset = pathLength.toString();

    const handleScroll = () => {
      const rect = svg.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // When the SVG enters the viewport
      if (rect.top < windowHeight && rect.bottom > 0) {
        // progress from 0 (top enters) to 1 (bottom enters)
        let progress = 1 - (rect.bottom / (windowHeight + rect.height));
        progress = Math.min(Math.max(progress * 1.5, 0), 1); // clamp 0-1

        // Animate stroke
        path.style.strokeDashoffset = (pathLength * (1 - progress)).toString();
      }
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleScroll);

    // trigger once on mount
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      width={1128}
      height={2391}
      viewBox="0 0 1128 2391"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="pointer-events-none absolute left-1/2 top-[420px] -translate-x-1/2"
      {...props}
    >
      <path
        ref={pathRef}
        d="M226.5 166.835C450.5 71.1678 933.4 -73.5655 1073 112.834C1247.5 345.834 662.5 587.335 360.5 463.835C58.4999 340.335 685 174.835 908 428.335C1131 681.835 467.5 962.334 385 1075.83C306.166 1133.39 146 1295.2 136 1482C123.5 1715.5 531.5 1918.5 607 1743C682.5 1567.5 191 1290 -12.0001 1752.5C-174.4 2122.5 396 2336.5 659 2368.5"
        stroke="url(#paint0_linear_4088_160)"
        strokeWidth={45}
        strokeLinecap="round"
      />
      <defs>
        <linearGradient
          id="paint0_linear_4088_160"
          x1={532.133}
          y1={22.4996}
          x2={532.133}
          y2={2368.5}
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#2AFFDF" />
          <stop offset={1} stopColor="#199986" />
        </linearGradient>
      </defs>
    </svg>
  );
}




// <path
// ref={pathRef}
// d="
//   M 80 20
//   C 60 100, 140 180, 120 280
//   C 100 380, 250 420, 400 460
//   C 580 500, 650 580, 600 700
//   C 560 800, 420 840, 300 880
//   C 150 940, 100 1040, 180 1160
//   C 280 1240, 450 1280, 550 1360
//   C 600 1420, 520 1480, 400 1520
//   C 250 1560, 150 1580, 180 1600
// "
// stroke="#11f7d5"
// strokeWidth="50"
// strokeLinecap="round"
// strokeLinejoin="round"
// strokeOpacity="0.95"
// fill="none"
// className="drop-shadow-[0_0_45px_rgba(17,247,213,0.45)]"
// />

// "use client";
// import { useEffect, useRef } from "react";

// export default function FlowLine(props?: React.SVGProps<SVGSVGElement>) {
//   const pathRef = useRef<SVGPathElement | null>(null);
//   const svgRef = useRef<SVGSVGElement | null>(null);

//   useEffect(() => {
//     const path = pathRef.current;
//     const svg = svgRef.current;
//     if (!path || !svg) return;

//     const pathLength = path.getTotalLength();
//     path.style.strokeDasharray = pathLength.toString();
//     path.style.strokeDashoffset = pathLength.toString();

//     const handleScroll = () => {
//       const rect = svg.getBoundingClientRect();
//       const windowHeight = window.innerHeight;
//       const scrollTop = window.scrollY;
      
//       // Get SVG position relative to the page
//       const svgTop = scrollTop + rect.top;
//       const svgHeight = rect.height;

//       // Calculate progress: 0 when scrollTop reaches SVG top,
//       // 1 when scrollTop reaches SVG bottom
//       let progress = (scrollTop + windowHeight - svgTop) / (svgHeight + windowHeight);
//       progress = Math.min(Math.max(progress, 0), 1); // clamp 0-1

//       path.style.strokeDashoffset = (pathLength * (1 - progress)).toString();
//     };

//     window.addEventListener("scroll", handleScroll);
//     window.addEventListener("resize", handleScroll);
//     handleScroll();

//     return () => {
//       window.removeEventListener("scroll", handleScroll);
//       window.removeEventListener("resize", handleScroll);
//     };
//   }, []);

//   return (
//     <svg
//       ref={svgRef}
//       width={1128}
//       height={2391}
//       viewBox="0 0 1128 2391"
//       fill="none"
//       xmlns="http://www.w3.org/2000/svg"
//       className="pointer-events-none absolute left-1/2 top-[420px] -translate-x-1/2"
//       {...props}
//     >
//       <path
//         ref={pathRef}
//         d="M226.5 166.835C450.5 71.1678 933.4 -73.5655 1073 112.834C1247.5 345.834 662.5 587.335 360.5 463.835C58.4999 340.335 685 174.835 908 428.335C1131 681.835 467.5 962.334 385 1075.83C306.166 1133.39 146 1295.2 136 1482C123.5 1715.5 531.5 1918.5 607 1743C682.5 1567.5 191 1290 -12.0001 1752.5C-174.4 2122.5 396 2336.5 659 2368.5"
//         stroke="url(#paint0_linear_4088_160)"
//         strokeWidth={45}
//         strokeLinecap="round"
//       />
//       <defs>
//         <linearGradient
//           id="paint0_linear_4088_160"
//           x1={532.133}
//           y1={22.4996}
//           x2={532.133}
//           y2={2368.5}
//           gradientUnits="userSpaceOnUse"
//         >
//           <stop stopColor="#2AFFDF" />
//           <stop offset={1} stopColor="#199986" />
//         </linearGradient>
//       </defs>
//     </svg>
//   );
// }
