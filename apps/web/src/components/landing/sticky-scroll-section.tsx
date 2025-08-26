"use client"
import { StickyScroll } from "@/components/ui/sticky-scroll-reveal"

export function StickyScrollSection() {
  return (
    <section className="w-full bg-slate-900">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-20">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white text-center mb-12">How Meta Task Works</h2>
        <StickyScroll content={content} contentClassName="md:h-80 md:w-96" />
      </div>
    </section>
  )
}

const content = [
  {
    title: "Just signup with an email and get started!",
    description:
      "Once you submit your email for signup, you will go through our 5 minute business onboarding flow to get your company account setup and ready to be deployed to your work force for use.",
    content: (
      <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(to_bottom_right,var(--cyan-500),var(--emerald-500))] text-white p-6">
        <div className="flex flex-col items-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 mb-4">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
          </svg>
          <span className="text-xl font-bold">Easy setup wizard</span>
        </div>
      </div>
    ),
  },
  {
    title: "Create a subdomain for easy access of your internal chatbot",
    description:
      "There are 2 reasons to create a subdomain from your current domain. The first reason is to have branded and trusted link for your workforce to find the internal chatbot eg 'chatbot.yourcompany.com'. However we do offer generic username based link for use eg 'metatask.co/yourcomapanyname'. The second reason is to only allow people with company emails to have access to the chatbot for better security",  
    content: (
      <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(to_bottom_right,var(--pink-500),var(--indigo-500))] text-white p-6">
        <div className="flex flex-col items-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 mb-4">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" />
            <path d="M7 12h2v5H7zm4-7h2v12h-2zm4 4h2v8h-2z" />
          </svg>
          <span className="text-xl font-bold">Security</span>
        </div>
      </div>
    ),
  },
  {
    title: "Get your Documents Ai ready",
    description:
      "Documents such as PDFs, DOCX, TXT, CSV, and Excel files can be loaded and processed. The maximum file size is 100MB for PDFs and 10MB for all other file types. However, scanned PDFs and text extraction from images (OCR) are not supported. Meta task offers flexible options for upserting data, accommodating both individual and bulk operations to suit various use cases.",
    content: (
      <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(to_bottom_right,var(--orange-500),var(--yellow-500))] text-white p-6">
        <div className="flex flex-col items-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 mb-4">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
          </svg>
          <span className="text-xl font-bold">Documents</span>
        </div>
      </div>
    ),
  },
  {
    title: "Seamless Dashboard",
    description:
      "Manage everything from users and user permissions, documents and the chatbot on a single platform. This is the central platform for adminirattors to manage all thier ai efforts.",
    content: (
      <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(to_bottom_right,var(--cyan-500),var(--emerald-500))] text-white p-6">
        <div className="flex flex-col items-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 mb-4">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
          </svg>
          <span className="text-xl font-bold">Enterprise Security</span>
        </div>
      </div>
    ),
  },
]