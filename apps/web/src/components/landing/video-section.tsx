"use client"

import { useState } from "react"
import { Play } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface VideoSectionProps {
  thumbnailUrl?: string
  videoUrl?: string
  title?: string
  className?: string
}

export function VideoSection({
  thumbnailUrl = "/placeholder.svg?height=720&width=1280",
  videoUrl = "https://www.youtube.com/embed/dQw4w9WgXcQ",
  title = "See Meta Task in action",
  className,
}: VideoSectionProps) {
  const [isPlaying, setIsPlaying] = useState(false)

  const handlePlay = () => {
    setIsPlaying(true)
  }

  return (
    <section id="video-section" className={cn("bg-white py-24 px-6 sm:px-8 md:px-12 lg:px-16", className)}>
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 text-gray-900">{title}</h2>

        {/* Added max-width classes for desktop */}
        <div className="mx-auto w-full md:w-4/5 lg:w-3/4 xl:w-2/3 2xl:w-1/2">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-gray-50 shadow-xl border border-gray-200">
            {!isPlaying ? (
              <>
                {/* Video Thumbnail */}
                <Image src={thumbnailUrl || "/placeholder.svg"} alt="Video thumbnail" fill className="object-cover" />

                {/* Overlay with Play Button - Reduced Size */}
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 flex items-center justify-center rounded-full bg-black/20 transition-all duration-300 hover:bg-black/30 cursor-pointer"
                  onClick={handlePlay}
                >
                  <div className="rounded-full bg-blue-600 p-4 shadow-lg transition-transform duration-300 hover:scale-110 hover:bg-blue-700 group">
                    <Play
                      className="h-12 w-12 text-white group-hover:translate-x-0.5 transition-transform"
                      fill="white"
                    />
                  </div>
                </div>

                {/* Optional: Gradient overlay for better text visibility */}
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"></div>
              </>
            ) : (
              /* Video iFrame */
              <iframe
                src={videoUrl}
                title="Video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            )}
          </div>
        </div>

        {/* Optional: Video description or caption */}
        <p className="text-gray-600 text-center mt-6 max-w-2xl mx-auto">
          Watch our demo to see how Meta Task can transform your enterprise with AI-powered productivity for your
          workforce that deliver real results.
        </p>
      </div>
    </section>
  )
}