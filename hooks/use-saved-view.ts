"use client"

import { useEffect, useState } from "react"

const STORAGE_KEY = "dashmovie_view"

export type ViewName = "popular" | "favorites" | "seen" | "search" | "roulette"

export function useSavedView() {
  const [view, setView] = useState<ViewName>("popular")
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) setView(saved as ViewName)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, view)
  }, [view, hydrated])

  return { view, setView, hydrated }
}
