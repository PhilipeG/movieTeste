"use client"

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import type { DriftWallItem } from "@/components/drift-wall"

interface PosterRowsProps {
  items: DriftWallItem[]
  rows?: number
  tileWidth?: number
  tileHeight?: number
  gap?: number
  radius?: number
  tilt?: number
  turn?: number
  roll?: number
  perspective?: number
  depth?: number
  speed?: number
  variance?: number
  fade?: number
  dim?: number
  overlayColor?: string
  className?: string
  style?: CSSProperties
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches

const rowFactor = (index: number, variance: number) => {
  const pseudo = ((index * 0.6180339887 + 0.35) % 1) * 2 - 1
  return 1 + variance * pseudo
}

// Fileiras horizontais de pôsteres deslizando em direções alternadas — fundo
// decorativo (aria-hidden, sem interação). Mesma matemática de cobertura do
// DriftWall, transposta para o eixo X.
const PosterRows = ({
  items,
  rows = 4,
  tileWidth = 160,
  tileHeight = 240,
  gap = 32,
  radius = 12,
  tilt = -10,
  turn = 10,
  roll = -3,
  perspective = 1200,
  depth = 120,
  speed = 30,
  variance = 0.45,
  fade = 0.1,
  dim = 0.85,
  overlayColor = "#0f0f17",
  className = "",
  style,
}: PosterRowsProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const planeRef = useRef<HTMLDivElement>(null)
  const trackRefs = useRef<(HTMLDivElement | null)[]>([])
  const rafRef = useRef<number | null>(null)
  const offsetsRef = useRef<number[]>([])
  const velocitiesRef = useRef<number[]>([])
  const lastTsRef = useRef<number | null>(null)

  const [containerWidth, setContainerWidth] = useState(1200)
  const [containerHeight, setContainerHeight] = useState(600)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    setReduced(prefersReducedMotion())
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  useLayoutEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width || 1200)
      setContainerHeight(entry.contentRect.height || 600)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Fileiras suficientes para cobrir a altura (+ folga para a projeção 3D)
  const effectiveRows = useMemo(() => {
    const unitH = tileHeight + gap
    return Math.max(rows, Math.ceil(containerHeight / unitH) + 4)
  }, [rows, containerHeight, tileHeight, gap])

  const rowItems = useMemo(() => {
    if (!items.length) return []
    const unitW = tileWidth + gap
    const perRowNeeded = Math.max(3, Math.ceil((containerWidth * 1.6) / unitW))
    // Fileiras uniformes; usa itens extras sem reciclar quando existem
    const perRow = Math.max(
      perRowNeeded,
      Math.min(Math.ceil(items.length / effectiveRows), perRowNeeded * 2),
    )
    const slots = perRow * effectiveRows
    const result: DriftWallItem[][] = Array.from({ length: effectiveRows }, () => [])
    for (let i = 0; i < slots; i++) {
      result[i % effectiveRows].push(items[i % items.length])
    }
    return result
  }, [items, effectiveRows, tileWidth, gap, containerWidth])

  const rowMeta = useMemo(() => {
    const unitW = tileWidth + gap
    return rowItems.map((row) => {
      const copyWidth = Math.max(unitW, row.length * unitW)
      // Janela centrada no plano: (copies/2 - 1)*copyWidth precisa cobrir a margem
      // lateral (inclui deslocamento da projeção) — mesma lógica do DriftWall
      const copies = 2 + Math.ceil((containerWidth * 1.8) / copyWidth)
      return { copyWidth, copies }
    })
  }, [rowItems, tileWidth, gap, containerWidth])

  const baseVelocities = useMemo(
    () =>
      rowItems.map((_, r) => {
        const altSign = r % 2 === 0 ? 1 : -1
        return speed * rowFactor(r, variance) * altSign
      }),
    [rowItems, speed, variance],
  )

  useEffect(() => {
    // Preserva o deslocamento atual ao recalcular o layout (ver DriftWall)
    const prevOffsets = offsetsRef.current
    const prevVelocities = velocitiesRef.current
    offsetsRef.current = rowMeta.map((meta, r) => {
      const prev = prevOffsets[r]
      return prev === undefined ? meta.copyWidth * ((r * 0.37) % 1) : prev % meta.copyWidth
    })
    velocitiesRef.current = rowItems.map((_, r) => prevVelocities[r] ?? 0)
  }, [rowMeta, rowItems])

  useEffect(() => {
    const plane = planeRef.current
    if (plane) {
      plane.style.transform =
        `translate(-50%, -50%) scale(1.18) ` +
        `rotateX(${tilt}deg) rotateY(${turn}deg) rotateZ(${roll}deg) ` +
        `translateZ(${-depth}px)`
    }

    const animate = (ts: number) => {
      if (lastTsRef.current === null) lastTsRef.current = ts
      const dt = Math.min(0.05, Math.max(0, ts - lastTsRef.current) / 1000)
      lastTsRef.current = ts

      if (!reduced) {
        for (let r = 0; r < trackRefs.current.length; r++) {
          const meta = rowMeta[r]
          if (!meta) continue
          const target = baseVelocities[r]
          const ease = 1 - Math.exp(-dt / 0.28)
          velocitiesRef.current[r] += (target - velocitiesRef.current[r]) * ease
          let next = (offsetsRef.current[r] ?? 0) + velocitiesRef.current[r] * dt
          next = ((next % meta.copyWidth) + meta.copyWidth) % meta.copyWidth
          offsetsRef.current[r] = next
          const el = trackRefs.current[r]
          if (el) el.style.transform = `translate3d(${-next}px, 0, 0)`
        }
      } else {
        for (let r = 0; r < trackRefs.current.length; r++) {
          const el = trackRefs.current[r]
          const meta = rowMeta[r]
          if (el && meta)
            el.style.transform = `translate3d(${-(offsetsRef.current[r] ?? 0)}px, 0, 0)`
        }
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastTsRef.current = null
    }
  }, [baseVelocities, rowMeta, reduced, tilt, turn, roll, depth])

  const cssVars = useMemo(
    () =>
      ({
        "--pr-tile-w": `${tileWidth}px`,
        "--pr-tile-h": `${tileHeight}px`,
        "--pr-gap": `${gap}px`,
        "--pr-radius": `${radius}px`,
        "--pr-perspective": `${perspective}px`,
        "--pr-dim": dim,
        "--pr-overlay": overlayColor,
        "--pr-edge": `${Math.max(0, (1 - fade) * 100)}%`,
        ...style,
      }) as CSSProperties,
    [tileWidth, tileHeight, gap, radius, perspective, dim, overlayColor, fade, style],
  )

  return (
    <div
      ref={containerRef}
      className={`poster-rows ${className}`.trim()}
      style={cssVars}
      aria-hidden="true"
    >
      <div ref={planeRef} className="poster-rows__plane">
        {rowItems.map((row, r) => {
          const meta = rowMeta[r]
          const copies = Array.from({ length: meta.copies })
          return (
            <div className="poster-rows__row" key={`row-${r}`}>
              <div
                className="poster-rows__track"
                ref={(el) => {
                  trackRefs.current[r] = el
                }}
              >
                {copies.map((_, copyIndex) =>
                  row.map((item, itemIndex) => (
                    <div className="poster-rows__tile" key={`${r}-${copyIndex}-${itemIndex}`}>
                      <span className="poster-rows__inner">
                        <img
                          src={item.image}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          draggable={false}
                        />
                        <span className="poster-rows__overlay" aria-hidden="true" />
                      </span>
                    </div>
                  )),
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PosterRows
