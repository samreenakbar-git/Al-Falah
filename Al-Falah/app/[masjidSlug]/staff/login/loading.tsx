export default function Loading() {
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* LEFT SIDE */}
      <div className="relative bg-cover bg-center flex items-center bg-teal-900"></div>

      {/* RIGHT SIDE */}
      <div className="flex items-center justify-center px-6 bg-white">
        <div className="animate-pulse space-y-6 w-full max-w-md">
          <div className="h-10 bg-gray-200 rounded w-3/4"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-100 rounded"></div>
          </div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-100 rounded"></div>
          </div>
          <div className="h-10 bg-teal-200 rounded"></div>
        </div>
      </div>
    </div>
  )
}
