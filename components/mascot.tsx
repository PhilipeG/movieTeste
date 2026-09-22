"use client"

import { useEffect, useState, type CSSProperties } from "react"

// <model-viewer> é um web component — registra o custom element no browser
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace React {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace JSX {
      interface IntrinsicElements {
        "model-viewer": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
          src?: string
          alt?: string
          "auto-rotate"?: boolean
          "auto-rotate-delay"?: number | string
          "rotation-per-second"?: string
          "camera-orbit"?: string
          "disable-zoom"?: boolean
          "disable-pan"?: boolean
          "disable-tap"?: boolean
          "interaction-prompt"?: string
          "shadow-intensity"?: number | string
          exposure?: number | string
          loading?: string
        }
      }
    }
  }
}

interface MascotProps {
  size?: number
  className?: string
  style?: CSSProperties
}

// Mascote 3D (chibi reaper) — modelo estático animado via turntable + flutuação CSS
export default function Mascot({ size = 180, className = "", style }: MascotProps) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    import("@google/model-viewer")
      .then(() => {
        if (!cancelled) setReady(true)
      })
      .catch(console.error)
    return () => {
      cancelled = true
    }
  }, [])

  if (!ready) {
    return <div className={className} style={{ width: size, height: size, ...style }} aria-hidden="true" />
  }

  return (
    <div className={`mascot ${className}`.trim()} style={{ width: size, height: size, ...style }}>
      <span className="mascot__glow" aria-hidden="true" />
      <span className="mascot__shadow" aria-hidden="true" />
      <div className="mascot__model">
        <model-viewer
          src="/mascote-reaper.glb"
          alt="Mascote"
          camera-orbit="0deg 82deg 105%"
          disable-zoom
          disable-pan
          disable-tap
          interaction-prompt="none"
          shadow-intensity="0"
          exposure="1.1"
          loading="eager"
          style={{ width: "100%", height: "100%", "--poster-color": "transparent" } as CSSProperties}
        />
      </div>
    </div>
  )
}
