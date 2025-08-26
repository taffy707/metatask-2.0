import Link from "next/link"
import { MetaTaskLogo } from "./meta-task-logo"

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-gray-200 bg-white py-16 relative overflow-hidden">
      {/* Background watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] overflow-hidden">
        <span className="text-black text-[20vw] font-bold whitespace-nowrap">Meta Task</span>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 md:gap-8">
          {/* Logo and copyright */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <MetaTaskLogo />
            </div>
            <p className="mt-6 text-sm text-gray-500">© copyright Meta Task {currentYear}. All rights reserved.</p>
          </div>

          {/* Pages */}
          <div>
            <h3 className="font-medium text-gray-900 mb-4">Pages</h3>
            <ul className="space-y-3">
              <li>
                <Link href="#" className="text-gray-600 hover:text-blue-600 text-sm">
                  Solutions
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-blue-600 text-sm">
                  Platform
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-blue-600 text-sm">
                  Clients
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-blue-600 text-sm">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-blue-600 text-sm">
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* Socials */}
          <div>
            <h3 className="font-medium text-gray-900 mb-4">Socials</h3>
            <ul className="space-y-3">
              <li>
                <Link href="#" className="text-gray-600 hover:text-blue-600 text-sm">
                  LinkedIn
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-blue-600 text-sm">
                  Twitter
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-blue-600 text-sm">
                  Facebook
                </Link>
              </li>
              <li>
                <Link href="#" className="text-gray-600 hover:text-blue-600 text-sm">
                  Instagram
                </Link>
              </li>
            </ul>
          </div>

          {/* Combined Legal and Register */}
          <div>
            <div className="mb-8">
              <h3 className="font-medium text-gray-900 mb-4">Legal</h3>
              <ul className="space-y-3">
                <li>
                  <Link href="#" className="text-gray-600 hover:text-blue-600 text-sm">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-600 hover:text-blue-600 text-sm">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="#" className="text-gray-600 hover:text-blue-600 text-sm">
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}