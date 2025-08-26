"use client"

import Image from "next/image"

export function MetaTaskLogo() {
  return (
    <div className="flex items-center gap-2 px-1 py-1 rounded-md">
      <Image
        src="/meta-task-logo.svg"
        alt="Meta Task Logo"
        width={28}
        height={28}
        className="h-7 w-auto"
      />
      <span className="text-lg font-semibold text-gray-900">Meta Task</span>
    </div>
  )
}