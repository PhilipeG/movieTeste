"use client"

import { useEffect, useState } from "react"
import { X, Trophy, Star, PieChart, Clock, User, Film, Loader2 } from "lucide-react"
import type { MovieDetails, Genre } from "@/lib/tmdb"
import type { RatingsMap } from "@/lib/firebase"

interface Props {
  seenMovies: MovieDetails[]
  ratings: RatingsMap
  onClose: () => void
  isLoading?: boolean
}

export default function StatsModal({ seenMovies, ratings, onClose, isLoading = false }: Props) {
  const [stats, setStats] = useState({
    totalWatched: 0,
    timeHours: 0,   // Novo: Horas
    timeMinutes: 0, // Novo: Minutos
    topGenre: "N/A",
    avgTmdb: 0,
    avgAnak: 0,
    avgSilvio: 0,
  })

  useEffect(() => {
    if (isLoading || !seenMovies || seenMovies.length === 0) return

    // 1. Total Assistidos
    const total = seenMovies.length

    // 2. Tempo Total (Horas e Minutos)
    const totalMinutes = seenMovies.reduce((acc, m) => acc + (m.runtime || 0), 0)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    // 3. Média TMDB dos assistidos
    const sumTmdb = seenMovies.reduce((acc, m) => acc + (m.vote_average || 0), 0)
    const avgTmdb = total > 0 ? (sumTmdb / total).toFixed(1) : 0

    // 4. Médias Pessoais
    let sumAnak = 0, countAnak = 0
    let sumSilvio = 0, countSilvio = 0

    seenMovies.forEach((m) => {
      const r = ratings[m.id]
      if (r?.anak) {
        sumAnak += r.anak
        countAnak++
      }
      if (r?.silvio) {
        sumSilvio += r.silvio
        countSilvio++
      }
    })

    const avgAnak = countAnak > 0 ? (sumAnak / countAnak).toFixed(1) : "0.0"
    const avgSilvio = countSilvio > 0 ? (sumSilvio / countSilvio).toFixed(1) : "0.0"

    // 5. Gênero Mais Assistido
    const genreCounts: { [key: string]: number } = {}
    seenMovies.forEach((movie) => {
      if (movie.genres) {
        movie.genres.forEach((g: Genre) => {
          genreCounts[g.name] = (genreCounts[g.name] || 0) + 1
        })
      }
    })

    let favoriteGenre = "Indefinido"
    let maxCount = 0
    Object.entries(genreCounts).forEach(([genre, count]) => {
      if (count > maxCount) {
        maxCount = count
        favoriteGenre = genre
      }
    })

    setStats({
      totalWatched: total,
      timeHours: hours,     // Salva horas
      timeMinutes: minutes, // Salva minutos
      topGenre: favoriteGenre,
      avgTmdb: Number(avgTmdb),
      avgAnak: Number(avgAnak),
      avgSilvio: Number(avgSilvio),
    })
  }, [seenMovies, ratings, isLoading])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative glass w-full max-w-2xl rounded-2xl p-6 shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh] min-h-[400px] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/20 rounded-lg text-primary"><PieChart className="w-6 h-6" /></div>
            <h2 className="text-2xl font-bold text-foreground">Estatísticas (Assistidos)</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10"><X className="w-5 h-5" /></button>
        </div>

        {/* LOADING STATE */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-muted-foreground text-lg font-medium animate-pulse">Calculando estatísticas...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-bottom-4 duration-500">
            
            {/* Card Total Count */}
            <div className="bg-secondary/30 p-4 rounded-xl border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Assistidos</p>
                <p className="text-3xl font-bold">{stats.totalWatched}</p>
              </div>
              <Film className="w-8 h-8 text-primary opacity-50" />
            </div>

            {/* Card Tempo Total (ATUALIZADO) */}
            <div className="bg-secondary/30 p-4 rounded-xl border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tempo Total</p>
                <div className="flex items-baseline gap-1">
                  {/* Horas */}
                  <span className="text-3xl font-bold">
                    {stats.timeHours}<span className="text-sm font-normal text-muted-foreground ml-0.5">h</span>
                  </span>
                  
                  {/* Minutos (só mostra se > 0) */}
                  {stats.timeMinutes > 0 && (
                    <span className="text-xl font-medium text-foreground/80 ml-1">
                      {stats.timeMinutes}<span className="text-xs font-normal text-muted-foreground ml-0.5">min</span>
                    </span>
                  )}
                </div>
              </div>
              <Clock className="w-8 h-8 text-blue-400 opacity-50" />
            </div>

            {/* Card Top Genre */}
            <div className="col-span-1 md:col-span-2 bg-gradient-to-r from-primary/20 to-secondary/30 p-4 rounded-xl border border-primary/10 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Gênero Mais Assistido</p>
                <p className="text-3xl font-bold text-primary">{stats.topGenre}</p>
              </div>
              <Trophy className="w-10 h-10 text-yellow-500" />
            </div>

            {/* Notas Pessoais */}
            <div className="col-span-1 md:col-span-2 grid grid-cols-3 gap-3 mt-2">
              
              <div className="bg-purple-500/10 p-4 rounded-xl border border-purple-500/20 text-center">
                <p className="text-xs text-purple-300 mb-1 flex items-center justify-center gap-1"><User className="w-3 h-3"/> Média Anak</p>
                <p className="text-2xl font-bold text-purple-400">{stats.avgAnak}</p>
              </div>

              <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 text-center">
                <p className="text-xs text-blue-300 mb-1 flex items-center justify-center gap-1"><User className="w-3 h-3"/> Média Silvio</p>
                <p className="text-2xl font-bold text-blue-400">{stats.avgSilvio}</p>
              </div>

              <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20 text-center">
                <p className="text-xs text-yellow-500 mb-1 flex items-center justify-center gap-1"><Star className="w-3 h-3"/> Média Geral</p>
                <p className="text-2xl font-bold text-yellow-500">{stats.avgTmdb}</p>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  )
}