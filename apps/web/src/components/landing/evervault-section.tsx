"use client"

import { EvervaultCard, Icon } from "@/components/ui/evervault-card"

export function EvervaultSection() {
  return (
    <section className="relative w-full h-screen bg-white flex flex-col items-center justify-center overflow-hidden mb-24">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

      {/* Content container */}
      <div className="relative z-10 max-w-7xl w-full mx-auto px-6 sm:px-8 md:px-12 lg:px-16 flex flex-col lg:flex-row items-center justify-between gap-12">
        {/* Left side - Text content */}
        <div className="max-w-xl">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6"> AI that understands  your business context</h2>
          <p className="text-lg text-gray-700 mb-8">
            Experience the power of Meta Task's AI with more appropriate responses.
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
              User permissions management
            </div>
            <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-medium">
              <span className="w-2 h-2 bg-green-600 rounded-full"></span>
              Deploy and manage your own prebuilt internal chat application. 
            </div>
            <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-full text-sm font-medium">
              <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
              Document management and storage.
            </div>
          </div>
        </div>

        {/* Right side - Evervault Card */}
        <div className="w-full max-w-md aspect-square">
          <div className="border border-black/[0.2] dark:border-white/[0.2] flex flex-col items-start w-full p-4 relative h-full rounded-3xl shadow-lg">
            <Icon className="absolute h-6 w-6 -top-3 -left-3 dark:text-white text-black" />
            <Icon className="absolute h-6 w-6 -bottom-3 -left-3 dark:text-white text-black" />
            <Icon className="absolute h-6 w-6 -top-3 -right-3 dark:text-white text-black" />
            <Icon className="absolute h-6 w-6 -bottom-3 -right-3 dark:text-white text-black" />

            <EvervaultCard text="AI" className="w-full h-full" />

            <div className="absolute bottom-6 left-0 right-0 text-center">
              <p className="text-sm font-light text-gray-700 bg-white/80 mx-auto w-max px-4 py-1 rounded-full">
                Hover to activate
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Corner decorations */}
      <div className="absolute top-12 left-12 w-24 h-24 border-t-2 border-l-2 border-gray-200 rounded-tl-3xl"></div>
      <div className="absolute bottom-12 right-12 w-24 h-24 border-b-2 border-r-2 border-gray-200 rounded-br-3xl"></div>
    </section>
  )
}