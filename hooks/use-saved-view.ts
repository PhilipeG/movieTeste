"use client"

import { useEffect, useState } from "react"

const STORAGE_KEY = "dashmovie_view"

export type ViewName = "popular" | "favorites" | "seen" | "search" | "roulette"

// sessionStorage: F5 mantém a view atual, mas um novo acesso (nova aba/janela)
// sempre começa na página principal.
export function useSavedView() {
  const [view, setView] = useState<ViewName>("popular")
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (saved) setView(saved as ViewName)
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      sessionStorage.setItem(STORAGE_KEY, view)
    } catch {}
  }, [view, hydrated])

  return { view, setView, hydrated }
}
