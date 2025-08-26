"use client"

import type React from "react"
import Link from "next/link"
import { FlipWords } from "@/components/ui/flip-words"
import { WavyBackground } from "@/components/ui/wavy-background"
import { MetaTaskLogo } from "./meta-task-logo"
import { Bot, Sparkles } from "lucide-react"
import { PlaceholdersAndVanishInput } from "@/components/ui/placeholders-and-vanish-input"

export function HeroSection() {
  const benefits = ["more productivity", "cost reductions", "speed and agility", "revenue increase"]
  const chatPlaceholders = [
    "Ask about our enterprise AI solutions...",
    "How can AI improve my team's productivity?",
    "What security features does Meta Task offer?",
    "Tell me about implementation timelines...",
    "How does Meta Task integrate with our systems?",
  ]

  const handleChatInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Handle input change - could be used for analytics or form state
    void e.target.value
  }

  const handleChatSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    // Handle form submission
    e.preventDefault()
  }

  return (
    <WavyBackground
      className="w-full"
      containerClassName="min-h-screen bg-white relative overflow-visible"
      colors={["#4f46e5", "#3b82f6", "#0ea5e9", "#06b6d4", "#14b8a6"]}
      waveWidth={40}
      backgroundFill="white"
      blur={15}
      speed="slow"
      waveOpacity={0.3}
    >
      <div className="relative w-full max-w-[90%] xl:max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10">
        {/* Header - Reduced top padding */}
        <div className="flex justify-between items-center w-full pt-2 pb-2">
          <MetaTaskLogo />
          <div className="flex items-center gap-3">
            <Link href="/signin">
              <button className="text-gray-900 hover:text-gray-700 text-sm px-3 py-1.5 rounded-md transition-colors">
                Sign In
              </button>
            </Link>
            <Link href="/signup">
              <button className="relative bg-gray-900 hover:bg-black text-white text-sm px-3 py-1.5 rounded-md overflow-hidden group">
                <span className="inline-block transition-transform duration-300 group-hover:translate-x-[200%]">
                  Sign Up
                </span>
                <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  Get Started
                </span>
              </button>
            </Link>
          </div>
        </div>

        {/* Hero Content - Adjusted vertical spacing */}
        <div className="flex flex-col lg:flex-row items-start justify-between gap-8 w-full py-6">
          {/* Left Column - Text Content */}
          <div className="text-left space-y-5 max-w-xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 text-left leading-tight">
              Empower your workforce with context aware AI and enjoy{" "}
              <FlipWords words={benefits} className="text-blue-600" duration={4000} />
            </h1>

            <p className="text-base md:text-lg text-gray-900">
              We are focused on providing AI driven Intelligence to aid enterprises in streamlining their productivity.
              With intelligence that enables fast decision-making.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pb-4"></div>
          </div>

          {/* Right Column - AI Chatbot Interface with Glassmorphism */}
          <div className="hidden lg:block relative w-full max-w-sm md:max-w-md lg:max-w-lg">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
              {/* Glassmorphism Background */}
              <div className="absolute inset-0 bg-white/20 backdrop-blur-lg border border-white/30 shadow-xl rounded-2xl"></div>

              {/* Chat Interface */}
              <div className="absolute inset-0 flex flex-col p-6">
                {/* Chat Header */}
                <div className="flex items-center">
                  <div className="bg-blue-600 p-1.5 rounded-full">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <span className="ml-2 font-medium text-gray-800">Meta Task AI</span>
                </div>

                {/* Chat Messages Area */}
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="flex justify-center mb-3">
                      <div className="bg-blue-100 p-3 rounded-full">
                        <Sparkles className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800">Good morning James.</h3>
                    <p className="text-gray-500 mt-1">Ask anything...</p>
                  </div>
                </div>

                {/* New Animated Chat Input */}
                <PlaceholdersAndVanishInput
                  placeholders={chatPlaceholders}
                  onChange={handleChatInputChange}
                  onSubmit={handleChatSubmit}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </WavyBackground>
  )
}