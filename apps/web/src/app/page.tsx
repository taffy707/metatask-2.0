"use client";

import { HeroSection } from "@/components/landing/hero-section"
import { VideoSection } from "@/components/landing/video-section"
import { EvervaultSection } from "@/components/landing/evervault-section"
import { StickyScrollSection } from "@/components/landing/sticky-scroll-section"
import { SourceTracingSection } from "@/components/landing/source-tracing-section"
import { CTASection } from "@/components/landing/cta-section"
import { Footer } from "@/components/landing/footer"
import { useEffect } from "react"
import { useSearchParams } from "next/navigation"

export default function LandingPage() {
  const searchParams = useSearchParams()

  useEffect(() => {
    // Check if this is an OAuth callback that ended up at the root
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    
    if (code || error) {
      // This looks like an OAuth callback - redirect to proper callback route
      const callbackUrl = new URL('/api/auth/callback', window.location.origin)
      callbackUrl.searchParams.set('code', code || '')
      if (error) callbackUrl.searchParams.set('error', error)
      
      // Redirect to callback route with the parameters
      window.location.href = callbackUrl.toString()
      return
    }
  }, [searchParams])

  return (
    <main>
      <HeroSection />
      <VideoSection />
      <EvervaultSection />
      <StickyScrollSection />
      <SourceTracingSection />
      <CTASection />
      <Footer />
    </main>
  )
}