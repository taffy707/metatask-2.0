"use client"
import React, { useEffect, useRef, useState } from "react"
import { useMotionValueEvent, useScroll } from "motion/react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"

export const StickyScroll = ({
  content,
  contentClassName,
}: {
  content: {
    title: string
    description: string
    content?: React.ReactNode | any
  }[]
  contentClassName?: string
}) => {
  const [activeCard, setActiveCard] = React.useState(0)
  const ref = useRef<any>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  })
  const cardLength = content.length

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const cardsBreakpoints = content.map((_, index) => index / cardLength)
    const closestBreakpointIndex = cardsBreakpoints.reduce((acc, breakpoint, index) => {
      const distance = Math.abs(latest - breakpoint)
      if (distance < Math.abs(latest - cardsBreakpoints[acc])) {
        return index
      }
      return acc
    }, 0)
    setActiveCard(closestBreakpointIndex)
  })

  const backgroundColors = [
    "#0f172a", // slate-900
    "#000000", // black
    "#171717", // neutral-900
  ]
  const linearGradients = [
    "linear-gradient(to bottom right, #06b6d4, #10b981)", // cyan-500 to emerald-500
    "linear-gradient(to bottom right, #ec4899, #6366f1)", // pink-500 to indigo-500
    "linear-gradient(to bottom right, #f97316, #eab308)", // orange-500 to yellow-500
  ]

  const [backgroundGradient, setBackgroundGradient] = useState(linearGradients[0])

  useEffect(() => {
    setBackgroundGradient(linearGradients[activeCard % linearGradients.length])
  }, [activeCard])

  return (
    <motion.div
      animate={{
        backgroundColor: backgroundColors[activeCard % backgroundColors.length],
      }}
      className="relative flex min-h-[100vh] justify-center space-x-10 p-10"
      ref={ref}
    >
      <div className="div relative flex items-start px-4">
        <div className="max-w-2xl">
          {content.map((item, index) => (
            <div key={item.title + index} className="min-h-[50vh] flex items-center py-20">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{
                  opacity: activeCard === index ? 1 : 0.3,
                  y: activeCard === index ? 0 : 20,
                }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <motion.h2 className="text-2xl font-bold text-slate-100">{item.title}</motion.h2>
                <motion.p className="text-kg max-w-sm text-slate-300">{item.description}</motion.p>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
      <div
        style={{ background: backgroundGradient }}
        className={cn("sticky top-1/4 hidden h-60 w-80 overflow-hidden rounded-md bg-white lg:block", contentClassName)}
      >
        {content[activeCard].content ?? null}
      </div>
    </motion.div>
  )
}