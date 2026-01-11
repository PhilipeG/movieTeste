"use client"

import { useState } from "react"
import { Wheel } from "react-custom-roulette"
import type { Movie } from "@/lib/tmdb"
import { Sparkles, Trash2 } from "lucide-react"

interface Props {
  movies: Movie[]
  onSpinEnd: (movie: Movie) => void
  onRemoveMovie: (id: number) => void
}

const backgroundColors = [
  "#ef4444", // red-500
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
]

export default function Roulette({ movies, onSpinEnd, onRemoveMovie }: Props) {
  const [mustSpin, setMustSpin] = useState(false)
  const [prizeNumber, setPrizeNumber] = useState(0)

  const data = movies.map((movie) => ({
    option: movie.title.length > 15 ? movie.title.slice(0, 15) + "..." : movie.title,
    style: { textColor: "#ffffff" },
  }))

  const handleSpinClick = () => {
    if (!mustSpin && movies.length > 0) {
      const newPrizeNumber = Math.floor(Math.random() * movies.length)
      setPrizeNumber(newPrizeNumber)
      setMustSpin(true)
    }
  }

  if (movies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
        <Sparkles className="w-16 h-16 mb-4 opacity-20" />
        <h3 className="text-xl font-semibold mb-2">A roleta está vazia</h3>
        <p>Vá aos seus Favoritos e clique no botão "+" nos cards para adicionar filmes aqui.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-12 py-8">
      {/* Roleta */}
      <div className="relative group">
        <Wheel
          mustStartSpinning={mustSpin}
          prizeNumber={prizeNumber}
          data={data}
          backgroundColors={backgroundColors}
          textColors={["#ffffff"]}
          outerBorderColor="#1f2937"
          outerBorderWidth={5}
          innerBorderColor="#1f2937"
          innerBorderWidth={10}
          radiusLineColor="#1f2937"
          radiusLineWidth={2}
          onStopSpinning={() => {
            setMustSpin(false)
            onSpinEnd(movies[prizeNumber])
          }}
        />
        <button
          onClick={handleSpinClick}
          disabled={mustSpin}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-white text-black font-bold rounded-full shadow-xl border-4 border-gray-800 hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed z-10 flex items-center justify-center"
        >
          GIRAR
        </button>
      </div>

      {/* Lista de Filmes na Roleta */}
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-xl">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-500" />
          Filmes na Roleta ({movies.length})
        </h3>
        <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
          {movies.map((movie) => (
            <div
              key={movie.id}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group/item"
            >
              <span className="text-sm font-medium truncate flex-1 pr-4">{movie.title}</span>
              <button
                onClick={() => onRemoveMovie(movie.id)}
                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors opacity-0 group-hover/item:opacity-100"
                title="Remover da roleta"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}