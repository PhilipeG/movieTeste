"use client"

import { useEffect, useState } from "react"

export type ViewName = "popular" | "favorites" | "seen" | "search" | "roulette"

// A view NÃO é mais persistida: todo acesso começa na página principal.
// `hydrated` é mantido porque o page.tsx sincroniza o carregamento inicial nele.
export function useSavedView() {
  const [view, setView] = useState<ViewName>("popular")
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  return { view, setView, hydrated }
}
