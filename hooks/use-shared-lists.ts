"use client"

import { useEffect, useState } from "react"
import {
  subscribeToSharedLists,
  updateFavoritesList,
  updateSeenList,
  updateRouletteList,
  updateMovieRating,
  type RatingsMap,
} from "@/lib/firebase"

export function useSharedLists() {
  const [favorites, setFavorites] = useState<number[]>([])
  const [seen, setSeen] = useState<number[]>([])
  const [rouletteIds, setRouletteIds] = useState<number[]>([])
  const [ratings, setRatings] = useState<RatingsMap>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const unsubscribe = subscribeToSharedLists((data) => {
      setFavorites(data.favorites)
      setSeen(data.seen)
      setRouletteIds(data.roulette)
      setRatings(data.ratings)
      setLoaded(true)
    })
    return () => unsubscribe()
  }, [])

  return {
    favorites,
    seen,
    rouletteIds,
    ratings,
    loaded,
    updateFavorites: updateFavoritesList,
    updateSeen: updateSeenList,
    updateRoulette: updateRouletteList,
    updateRating: updateMovieRating,
  }
}
