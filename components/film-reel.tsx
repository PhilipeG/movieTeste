"use client"

import { useId, useLayoutEffect, useRef } from "react"
import { gsap } from "gsap"

interface FilmReelProps {
  size?: number
  className?: string
  glowColor?: string
}

// Geometria em unidades do viewBox
const VB_W = 122
const VB_H = 100
const CX = 70
const CY = 38
const R_OUTER = 31
const R_RIM = 27
const HOLE_ORBIT = 15.5
const HOLE_R = 6.4
const HUB_R = 5.4

// Eixo central da fita: sai de trás do rolo pela esquerda, desce, faz a curva
// por baixo e segue ondulando para a direita
const SPINE = "M49 56 C32 63 13 66 13 77 C13 88 29 91 45 85 C59 80 71 78 85 84 C97 89 107 86 113 78"

// A fita é feita de traços largos do mesmo eixo, recortados por máscaras:
// borda = traço de STRIP_W menos o miolo; perfurações = traço tracejado de
// PERF_OUT menos PERF_IN (sobram duas fileiras, uma em cada borda)
const STRIP_W = 15
const EDGE = 1.2
const PERF_OUT = 11
const PERF_IN = 7.4
const PERF_DASH = 2
const PERF_GAP = 2.6
const FRAME_W = 6.4
const FRAME_DASH = 0.8
const FRAME_GAP = 10.2
// Velocidade (unidades/s) com que a fita "corre" depois da entrada
const FEED_SPEED = 12

const polar = (deg: number, r: number): [number, number] => {
  const a = (deg * Math.PI) / 180
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)]
}
const HOLES = [-90, -18, 54, 126, 198].map((deg) => polar(deg, HOLE_ORBIT))
const HUB_DOTS = [-54, 18, 90, 162, 234].map((deg) => polar(deg, 3.4))

const FilmReel = ({ size = 66, className = "", glowColor }: FilmReelProps) => {
  const reelRef = useRef<SVGGElement>(null)
  const revealRef = useRef<SVGPathElement>(null)
  const perfRef = useRef<SVGPathElement>(null)
  const framesRef = useRef<SVGPathElement>(null)

  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const edgeMask = `film-reel-edge-${uid}`
  const perfMask = `film-reel-perf-${uid}`
  const revealMask = `film-reel-reveal-${uid}`

  useLayoutEffect(() => {
    const reel = reelRef.current
    const reveal = revealRef.current
    const perf = perfRef.current
    const frames = framesRef.current
    if (!reel || !reveal || !perf || !frames) return undefined

    const draws = reel.querySelectorAll<SVGElement>("[data-draw]")
    const fades = reel.querySelectorAll<SVGElement>("[data-fade]")
    const len = reveal.getTotalLength()

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(draws, { strokeDasharray: "none", strokeDashoffset: 0 })
      gsap.set(fades, { opacity: 1 })
      gsap.set(reveal, { strokeDasharray: "none", strokeDashoffset: 0 })
      return undefined
    }

    gsap.set(reveal, { strokeDasharray: len, strokeDashoffset: len })
    gsap.set(reel, { svgOrigin: `${CX} ${CY}`, rotation: 0 })

    const loops: gsap.core.Tween[] = []
    const perfPeriod = PERF_DASH + PERF_GAP
    const framePeriod = FRAME_DASH + FRAME_GAP

    // Entrada: o rolo se desenha como o título; em seguida gira enquanto a fita
    // se desenrola seguindo a curva
    const tl = gsap
      .timeline()
      .to(
        draws,
        {
          strokeDashoffset: 0,
          duration: 0.9,
          ease: "power2.out",
          stagger: 0.05,
          // o tracejado normalizado deixa uma fresta no ponto onde o traço
          // começa e termina; desenhado o círculo, volta ao traço contínuo
          onComplete: () => gsap.set(draws, { strokeDasharray: "none" }),
        },
        0,
      )
      .to(fades, { opacity: 1, duration: 0.5 }, 0.5)
      .to(reel, { rotation: -320, duration: 2.1, ease: "power2.out" }, 0.25)
      .to(reveal, { strokeDashoffset: 0, duration: 1.9, ease: "power2.out" }, 0.4)
      .add(() => {
        // Depois: rolo girando e perfurações correndo pela fita,
        // na mesma velocidade linear — parece filme passando
        loops.push(
          gsap.to(reel, {
            rotation: "-=360",
            // uma volta = circunferência do rolo percorrida pela fita
            duration: (2 * Math.PI * R_OUTER) / FEED_SPEED,
            ease: "none",
            repeat: -1,
          }),
          gsap.to(perf, {
            strokeDashoffset: `-=${perfPeriod}`,
            duration: perfPeriod / FEED_SPEED,
            ease: "none",
            repeat: -1,
          }),
          gsap.to(frames, {
            strokeDashoffset: `-=${framePeriod}`,
            duration: framePeriod / FEED_SPEED,
            ease: "none",
            repeat: -1,
          }),
        )
      })

    return () => {
      tl.kill()
      loops.forEach((t) => t.kill())
    }
  }, [])

  const maskBox = {
    maskUnits: "userSpaceOnUse",
    x: -10,
    y: -10,
    width: VB_W + 20,
    height: VB_H + 20,
  } as const

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      width={(size * VB_W) / VB_H}
      height={size}
      className={className}
      overflow="visible"
      aria-hidden="true"
      style={glowColor ? { filter: `drop-shadow(0 0 6px ${glowColor})` } : undefined}
    >
      <defs>
        <mask id={edgeMask} {...maskBox}>
          <path d={SPINE} fill="none" stroke="white" strokeWidth={STRIP_W} />
          <path d={SPINE} fill="none" stroke="black" strokeWidth={STRIP_W - EDGE * 2} />
        </mask>
        <mask id={perfMask} {...maskBox}>
          <path d={SPINE} fill="none" stroke="white" strokeWidth={PERF_OUT} />
          <path d={SPINE} fill="none" stroke="black" strokeWidth={PERF_IN} />
        </mask>
        {/* Revela a fita ao longo da curva; o disco preto a esconde atrás do rolo.
            Estado inicial já oculto no markup para não piscar antes da hidratação */}
        <mask id={revealMask} {...maskBox}>
          <path
            ref={revealRef}
            d={SPINE}
            fill="none"
            stroke="white"
            strokeWidth={STRIP_W + 3}
            strokeDasharray="1000 1000"
            strokeDashoffset={1000}
          />
          <circle cx={CX} cy={CY} r={R_OUTER + 1} fill="black" />
        </mask>
      </defs>

      {/* Fita */}
      <g mask={`url(#${revealMask})`} fill="none" stroke="var(--primary)">
        <path d={SPINE} strokeWidth={STRIP_W} mask={`url(#${edgeMask})`} />
        <path
          ref={perfRef}
          d={SPINE}
          strokeWidth={PERF_OUT}
          strokeDasharray={`${PERF_DASH} ${PERF_GAP}`}
          mask={`url(#${perfMask})`}
        />
        <path
          ref={framesRef}
          d={SPINE}
          strokeWidth={FRAME_W}
          strokeDasharray={`${FRAME_DASH} ${FRAME_GAP}`}
          opacity={0.75}
        />
      </g>

      {/* Rolo */}
      <g ref={reelRef} fill="none" stroke="var(--primary)">
        <circle
          data-draw
          cx={CX}
          cy={CY}
          r={R_OUTER}
          strokeWidth={2}
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset="1"
        />
        <circle
          data-draw
          cx={CX}
          cy={CY}
          r={R_RIM}
          strokeWidth={1.4}
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset="1"
        />
        {HOLES.map(([x, y], i) => (
          <circle
            key={i}
            data-draw
            cx={x}
            cy={y}
            r={HOLE_R}
            strokeWidth={1.6}
            pathLength={1}
            strokeDasharray="1"
            strokeDashoffset="1"
          />
        ))}
        <circle
          data-draw
          cx={CX}
          cy={CY}
          r={HUB_R}
          strokeWidth={1.4}
          pathLength={1}
          strokeDasharray="1"
          strokeDashoffset="1"
        />
        <g data-fade fill="var(--primary)" stroke="none" style={{ opacity: 0 }}>
          <circle cx={CX} cy={CY} r={1.6} />
          {HUB_DOTS.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={0.9} />
          ))}
        </g>
      </g>
    </svg>
  )
}

export default FilmReel
