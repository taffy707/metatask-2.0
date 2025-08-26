import { ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export function CTASection() {
  return (
    <section className="w-full bg-[#0f172a] py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Left side - Text content */}
          <div className="w-full lg:w-1/2 space-y-8">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
              Ready to try out the product?
            </h2>
            <p className="text-lg md:text-xl text-gray-300">
              Get instant access to our state of the art project and join the waitlist.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-md transition-colors group"
            >
              <span className="mr-2">Get Started</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Right side - Product screenshots */}
          <div className="w-full lg:w-1/2 relative">
            <div className="relative aspect-[4/3] w-full">
              {/* Main screenshot */}
              <div className="absolute inset-0 transform translate-y-4 translate-x-4">
                <div className="bg-white rounded-lg shadow-xl overflow-hidden h-full">
                  <Image
                    src="/placeholder.svg?height=600&width=800"
                    alt="Meta Task Dashboard"
                    width={800}
                    height={600}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Secondary screenshot */}
              <div className="absolute top-1/4 -right-12 w-2/3 transform rotate-6 shadow-xl">
                <div className="bg-white rounded-lg overflow-hidden">
                  <Image
                    src="/placeholder.svg?height=400&width=600"
                    alt="Meta Task Features"
                    width={600}
                    height={400}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Tertiary screenshot */}
              <div className="absolute bottom-0 -left-8 w-1/2 transform -rotate-6 shadow-xl">
                <div className="bg-white rounded-lg overflow-hidden">
                  <Image
                    src="/placeholder.svg?height=300&width=400"
                    alt="Meta Task Mobile"
                    width={400}
                    height={300}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Partner logos */}
              <div className="absolute -bottom-12 right-0 bg-white/90 backdrop-blur-sm px-4 py-3 rounded-lg shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="text-xs text-gray-500 font-medium">Trusted by:</div>
                  <div className="flex items-center gap-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="w-6 h-6 bg-gray-200 rounded-full"></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}