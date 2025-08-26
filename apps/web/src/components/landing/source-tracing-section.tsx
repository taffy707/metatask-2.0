"use client"
import { useEffect, useState, useRef } from "react"
import { FileText } from "lucide-react"
import { LinkPreview } from "@/components/ui/link-preview"

// Streaming text component that starts when visible and loops with a pause
function StreamingText({
  text,
  sources,
  speed = 10,
  pauseDuration = 20000,
  isVisible = false,
}: {
  text: string
  sources: Array<{ id: number; text: string; url: string; imageSrc: string }>
  speed?: number
  pauseDuration?: number
  isVisible?: boolean
}) {
  const [displayedText, setDisplayedText] = useState("")
  const [showCursor, setShowCursor] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)

  // Text without source markers for animation
  const textWithoutMarkers = text.replace(/\[\^(\d+)\]/g, "")

  // Source positions for rendering
  const sourceMatches = [...text.matchAll(/\[\^(\d+)\]/g)]
  const sourcePositions = sourceMatches.map((match) => ({
    position: match.index || 0,
    id: Number.parseInt(match[1]),
  }))

  // Blink cursor effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev)
    }, 500)

    return () => clearInterval(cursorInterval)
  }, [])

  // Start animation when section becomes visible
  useEffect(() => {
    if (isVisible && !hasStarted) {
      setHasStarted(true)
      setIsPaused(false)
      setDisplayedText("")
      setIsComplete(false)
    }
  }, [isVisible, hasStarted])

  // Text streaming and looping effect
  useEffect(() => {
    if (isPaused || !hasStarted) return

    let currentIndex = 0

    const interval = setInterval(() => {
      if (currentIndex < textWithoutMarkers.length) {
        setDisplayedText(textWithoutMarkers.substring(0, currentIndex + 1))
        currentIndex++
      } else {
        clearInterval(interval)
        setIsComplete(true)
        setIsPaused(true)

        // After pause duration, reset and start again
        setTimeout(() => {
          setDisplayedText("")
          setIsComplete(false)
          setIsPaused(false)
        }, pauseDuration)
      }
    }, speed)

    return () => clearInterval(interval)
  }, [textWithoutMarkers, speed, pauseDuration, isPaused, hasStarted])

  // Render text with source references
  const renderText = () => {
    if (!isComplete) {
      return (
        <>
          {displayedText}
          {!isPaused && hasStarted && (
            <span
              className={`inline-block w-2 h-5 bg-blue-600 ml-0.5 ${showCursor ? "opacity-100" : "opacity-0"}`}
            ></span>
          )}
        </>
      )
    }

    // When text is complete, render with source references
    let lastIndex = 0
    const elements = []

    sourcePositions.forEach((source, idx) => {
      // Text before the source marker
      const textBeforeSource = text.substring(lastIndex, source.position)
      if (textBeforeSource) {
        elements.push(<span key={`text-${idx}`}>{textBeforeSource}</span>)
      }

      // Source marker
      const sourceInfo = sources.find((s) => s.id === source.id)
      if (sourceInfo) {
        elements.push(
          <sup key={`source-${idx}`} className="inline-flex items-center">
            <LinkPreview
              url={sourceInfo.url}
              className="text-xs font-medium text-blue-600 hover:underline mx-0.5 cursor-pointer"
              width={300}
              height={200}
              isStatic={true}
              imageSrc={sourceInfo.imageSrc}
            >
              [{source.id}]
            </LinkPreview>
          </sup>,
        )
      }

      lastIndex = source.position + source.id.toString().length + 3 // +3 for [^]
    })

    // Add any remaining text
    if (lastIndex < text.length) {
      elements.push(<span key="text-final">{text.substring(lastIndex)}</span>)
    }

    return elements
  }

  return <p className="text-gray-700 text-lg">{renderText()}</p>
}

export function SourceTracingSection() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)

  const aiResponseText =
    "The quarterly revenue increased by 24% due to the new product launch[^1] and expanded market reach in Asia[^2], as reported in the Q3 Financial Report. Our company saw a significant growth in user engagement metrics[^3], with daily active users increasing by 37% compared to the previous quarter."

  const sources = [
    {
      id: 1,
      text: "Q3 Financial Report",
      url: "https://example.com/financial-reports/q3-2023",
      imageSrc: "/placeholder.svg?height=200&width=300",
    },
    {
      id: 2,
      text: "Market Expansion Analysis",
      url: "https://example.com/market-analysis/asia-q3",
      imageSrc: "/placeholder.svg?height=200&width=300",
    },
    {
      id: 3,
      text: "User Metrics Dashboard",
      url: "https://example.com/analytics/user-metrics",
      imageSrc: "/placeholder.svg?height=200&width=300",
    },
  ]

  // Set up intersection observer to detect when section is visible
  useEffect(() => {
    if (!sectionRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        setIsVisible(entry.isIntersecting)
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 0.2, // Trigger when 20% of the section is visible
      },
    )

    observer.observe(sectionRef.current)

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current)
      }
    }
  }, [])

  return (
    <section ref={sectionRef} className="w-full py-24 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
            Full Transparency with Source Tracing
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Meta Task provides complete visibility into where AI-generated content comes from, allowing you to verify
            information and build trust in your AI systems.
          </p>
        </div>

        <div className="flex flex-col items-center">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 md:p-12 shadow-lg border border-blue-100 max-w-4xl w-full">
            <div className="flex items-start gap-6">
              <div className="bg-blue-600 p-3 rounded-full shrink-0">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">AI-Generated Response</h3>
                <div className="min-h-[120px]">
                  <StreamingText
                    text={aiResponseText}
                    sources={sources}
                    speed={10}
                    pauseDuration={20000}
                    isVisible={isVisible}
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 pl-14">
              <p className="text-sm text-gray-500">
                Hover over any numbered source reference to preview the original document. After a 20-second pause, the
                response will reset and stream again.
              </p>
            </div>
          </div>

          <div className="mt-16 text-center max-w-2xl">
            <p className="text-neutral-600 text-lg">
              Meta Task integrates with your existing{" "}
              <LinkPreview
                url="https://example.com/knowledge-base"
                className="font-bold text-blue-600"
                isStatic={true}
                imageSrc="/placeholder.svg?height=200&width=300"
              >
                knowledge base
              </LinkPreview>{" "}
              and{" "}
              <LinkPreview
                url="https://example.com/data-sources"
                className="font-bold text-blue-600"
                isStatic={true}
                imageSrc="/placeholder.svg?height=200&width=300"
              >
                data sources
              </LinkPreview>{" "}
              to provide transparent, verifiable AI responses that your team can trust.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}