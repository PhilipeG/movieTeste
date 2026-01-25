"use client"

import { useState, useEffect } from "react"
import { Wheel } from "react-custom-roulette"
import type { Movie } from "@/lib/tmdb"
import { Sparkles, Trash2, Search, RotateCcw } from "lucide-react"
import { toast } from "sonner"

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
  
  const [searchTerm, setSearchTerm] = useState("")
  const [lastSpunMovie, setLastSpunMovie] = useState<Movie | null>(null)

  const dynamicFontSize = Math.max(11, 16 - Math.floor(movies.length / 8))
  const maxChars = Math.max(14, 24 - Math.floor(movies.length / 3))

  const data = movies.map((movie) => ({
    option: movie.title.length > maxChars ? movie.title.slice(0, maxChars) + "..." : movie.title,
    style: { textColor: "#ffffff" },
  }))

  const filteredMovies = movies.filter(movie => 
    movie.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSpinClick = () => {
    if (!mustSpin && movies.length > 0) {
      const newPrizeNumber = Math.floor(Math.random() * movies.length)
      setPrizeNumber(newPrizeNumber)
      setMustSpin(true)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && lastSpunMovie) {
        e.preventDefault()
        onRemoveMovie(lastSpunMovie.id)
        toast.success(`"${lastSpunMovie.title}" removido da roleta!`)
        setLastSpunMovie(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lastSpunMovie, onRemoveMovie])

  useEffect(() => {
    if (lastSpunMovie && !movies.find(m => m.id === lastSpunMovie.id)) {
      setLastSpunMovie(null)
    }
  }, [movies, lastSpunMovie])

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
    <div className="flex flex-col md:flex-row items-center justify-center gap-12 md:gap-24 py-12">
      <div className="relative group scale-105 md:scale-125 transition-transform duration-500">
        <Wheel
          mustStartSpinning={mustSpin}
          prizeNumber={prizeNumber}
          data={data}
          fontSize={dynamicFontSize}
          textDistance={58} 
          spinDuration={0.9} 
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
            const winner = movies[prizeNumber]
            setLastSpunMovie(winner)
            onSpinEnd(winner)
          }}
        />
        <button
          onClick={handleSpinClick}
          disabled={mustSpin}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-white text-black font-bold rounded-full shadow-2xl border-4 border-gray-800 hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed z-10 flex items-center justify-center"
        >
          GIRAR
        </button>
      </div>

      <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-xl flex flex-col max-h-[500px]">
        <h3 className="text-lg font-bold mb-4 flex items-center flex-wrap gap-2 shrink-0 justify-between">
          <span className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            Filmes ({movies.length})
          </span>
          
          {lastSpunMovie && (
             <span className="animate-in fade-in slide-in-from-left-1 duration-300 px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary rounded-lg text-[10px] md:text-xs font-medium flex items-center gap-1 truncate max-w-[200px]">
               <RotateCcw className="w-3 h-3 shrink-0" />
               <span className="truncate">Ctrl+Z: {lastSpunMovie.title}</span>
             </span>
          )}
        </h3>

        <div className="relative mb-4 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar filme na roleta..."
            className="w-full bg-secondary/50 border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        </div>

        <div className="space-y-2 overflow-y-auto custom-scrollbar pr-2 flex-grow">
          {filteredMovies.length > 0 ? (
            filteredMovies.map((movie) => {
              const isLastSpun = lastSpunMovie?.id === movie.id;

              const containerClasses = isLastSpun
                ? "bg-primary/10 border border-primary/20 text-primary" 
                : "bg-secondary/50 hover:bg-secondary text-foreground";
                
              return (
                <div
                  key={movie.id}
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors group/item ${containerClasses}`}
                >
                  <span className="text-sm font-medium truncate flex-1 pr-4 flex items-center gap-1">
                    {isLastSpun && <Sparkles className="w-3 h-3 text-primary shrink-0" />}
                    <span className="truncate">{movie.title}</span>
                  </span>
                  <button
                    onClick={() => onRemoveMovie(movie.id)}
                    className={`p-1.5 rounded-md transition-colors opacity-0 group-hover/item:opacity-100 ${isLastSpun ? 'text-primary hover:text-destructive hover:bg-destructive/10' : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'}`}
                    title="Remover da roleta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )
            })
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum filme encontrado.</p>
          )}
        </div>
      </div>
    </div>
  )
}