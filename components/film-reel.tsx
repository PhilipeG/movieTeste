"use client"

import { useId, useLayoutEffect, useRef } from "react"
import { gsap } from "gsap"

interface FilmReelProps {
  size?: number
  className?: string
  glowColor?: string
}

const STRIP_WIDTH = 84

const FilmReel = ({ size = 56, className = "", glowColor }: FilmReelProps) => {
  const reelRef = useRef<SVGGElement>(null)
  const clipRectRef = useRef<SVGRectElement>(null)

  const rawId = useId()
  const clipId = `film-reel-clip-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`

  useLayoutEffect(() => {
    const reel = reelRef.current
    const clip = clipRectRef.current
    if (!reel || !clip) return undefined

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    if (prefersReducedMotion) {
      gsap.set(clip, { attr: { width: STRIP_WIDTH } })
      return undefined
    }

    gsap.set(reel, { svgOrigin: "30 32", rotation: 0 })
    gsap.set(clip, { attr: { width: 0 } })

    const tl = gsap.timeline()
    // Desenrola: o rolo gira enquanto a fita avança, no ritmo da escrita do título
    tl.to(reel, { rotation: -540, duration: 2.0, ease: "power2.out" }, 0)
    tl.to(clip, { attr: { width: STRIP_WIDTH } , duration: 2.0, ease: "power2.out" }, 0)
    // Depois segue girando bem devagar
    tl.to(reel, { rotation: "-=360", duration: 45, ease: "none", repeat: -1 }, ">")

    return () => {
      tl.kill()
    }
  }, [])

  return (
    <svg
      viewBox="0 0 132 64"
      width={(size * 132) / 64}
      height={size}
      className={className}
      aria-hidden="true"
      style={glowColor ? { filter: `drop-shadow(0 0 6px ${glowColor})` } : undefined}
    >
      <defs>
        <clipPath id={clipId}>
          <rect ref={clipRectRef} x="48" y="14" width="0" height="36" />
        </clipPath>
      </defs>

      {/* Fita de filme desenrolando em direção ao título */}
      <g clipPath={`url(#${clipId})`}>
        <line x1="50" y1="18" x2="132" y2="18" stroke="var(--primary)" strokeWidth="2.5" />
        <line x1="50" y1="46" x2="132" y2="46" stroke="var(--primary)" strokeWidth="2.5" />
        {[56, 64, 72, 80, 88, 96, 104, 112, 120, 128].map((x) => (
          <g key={x}>
            <rect x={x} y="21.5" width="4" height="4" rx="1" fill="var(--primary)" opacity="0.9" />
            <rect x={x} y="38.5" width="4" height="4" rx="1" fill="var(--primary)" opacity="0.9" />
          </g>
        ))}
        {[57, 72, 87, 102, 117].map((x) => (
          <rect
            key={x}
            x={x}
            y="28"
            width="11"
            height="8"
            rx="1.5"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="1.5"
            opacity="0.55"
          />
        ))}
      </g>

      {/* Rolo (por cima, esconde o início da fita) */}
      <g ref={reelRef}>
        <circle cx="30" cy="32" r="21" fill="var(--background)" stroke="var(--primary)" strokeWidth="2.5" />
        <circle cx="30" cy="32" r="3.2" fill="var(--primary)" />
        <circle cx="30" cy="19.5" r="5.5" fill="none" stroke="var(--primary)" strokeWidth="2" />
        <circle cx="30" cy="44.5" r="5.5" fill="none" stroke="var(--primary)" strokeWidth="2" />
        <circle cx="17.5" cy="32" r="5.5" fill="none" stroke="var(--primary)" strokeWidth="2" />
        <circle cx="42.5" cy="32" r="5.5" fill="none" stroke="var(--primary)" strokeWidth="2" />
      </g>
    </svg>
  )
}

export default FilmReel
