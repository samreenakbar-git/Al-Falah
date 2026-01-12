/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  // Disable Turbopack to use webpack for production builds (fixes font loading issues)
  turbopack: undefined,

  // Add redirects
  async redirects() {
    return [
      {
        source: '/messages-applicants',          // old URL
        destination: '/staff/messages-applicants', // new URL
        permanent: true,                        // 301 redirect
      },
    ]
  },
}

export default nextConfig
