"use client"
import { cn } from "@/lib/utils"
import { useEffect, useRef, useState } from "react"
import { createNoise3D } from "simplex-noise"

export const WavyBackground = ({
  children,
  className,
  containerClassName,
  colors,
  waveWidth,
  backgroundFill,
  blur = 10,
  speed = "fast",
  waveOpacity = 0.5,
  ...props
}: {
  children?: any
  className?: string
  containerClassName?: string
  colors?: string[]
  waveWidth?: number
  backgroundFill?: string
  blur?: number
  speed?: "slow" | "fast"
  waveOpacity?: number
  [key: string]: any
}) => {
  const noise = createNoise3D()
  let w: number, h: number, nt: number, i: number, x: number, ctx: any, canvas: any
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const getSpeed = () => {
    switch (speed) {
      case "slow":
        return 0.0015
      case "fast":
        return 0.003
      default:
        return 0.0015
    }
  }

  const init = () => {
    canvas = canvasRef.current
    ctx = canvas.getContext("2d")
    w = ctx.canvas.width = window.innerWidth
    h = ctx.canvas.height = window.innerHeight
    ctx.filter = `blur(${blur}px)`
    nt = 0
    window.onresize = () => {
      w = ctx.canvas.width = window.innerWidth
      h = ctx.canvas.height = window.innerHeight
      ctx.filter = `blur(${blur}px)`
    }
    render()
  }

  const waveColors = colors ?? ["#38bdf8", "#818cf8", "#c084fc", "#e879f9", "#22d3ee"]
  const drawWave = (n: number) => {
    nt += getSpeed()
    for (i = 0; i < n; i++) {
      ctx.beginPath()
      ctx.lineWidth = waveWidth || 40 // Reduced wave thickness
      ctx.strokeStyle = waveColors[i % waveColors.length]

      // Less dramatic wave pattern
      for (x = 0; x < w; x += 5) {
        // Using a larger divisor (800 instead of 600) creates less frequent waves
        // Multiplying by 120 instead of 180 creates shorter waves
        let y = noise(x / 800, 0.4 * i, nt) * 120

        // Reduced secondary wave amplitude
        y += Math.sin(x / 400 + nt * 3) * 10

        ctx.lineTo(x, y + h * 0.5)
      }
      ctx.stroke()
      ctx.closePath()
    }
  }

  let animationId: number
  const render = () => {
    ctx.fillStyle = backgroundFill || "black"
    ctx.globalAlpha = waveOpacity || 0.3
    ctx.fillRect(0, 0, w, h)
    drawWave(4) // Reduced number of waves from 6 to 4
    animationId = requestAnimationFrame(render)
  }

  useEffect(() => {
    init()
    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [])

  const [isSafari, setIsSafari] = useState(false)
  useEffect(() => {
    // I'm sorry but i have got to support it on safari.
    setIsSafari(
      typeof window !== "undefined" &&
        navigator.userAgent.includes("Safari") &&
        !navigator.userAgent.includes("Chrome"),
    )
  }, [])

  return (
    <div className={cn("min-h-screen flex flex-col items-center justify-center overflow-visible", containerClassName)}>
      <canvas
        className="absolute inset-0 z-0"
        ref={canvasRef}
        id="canvas"
        style={{
          ...(isSafari ? { filter: `blur(${blur}px)` } : {}),
        }}
      ></canvas>
      <div className={cn("relative z-10 w-full", className)} {...props}>
        {children}
      </div>
    </div>
  )
}