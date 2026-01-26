"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Wheel } from "react-custom-roulette"
import type { Movie } from "@/lib/tmdb"
import { Sparkles, Trash2, Search, RotateCcw, AlertTriangle, Loader2, MapPin } from "lucide-react"
import { toast } from "sonner"

interface Props {
  movies: Movie[]
  onSpinEnd: (movie: Movie) => void
  onRemoveMovie: (id: number) => void
}

// TEMA: Ruby Carbon (Vermelho Metálico Premium)
const backgroundColors = [
  "#7f1d1d", // Red 900
  "#1e293b", // Slate 800
  "#991b1b", // Red 800
  "#0f172a", // Slate 900
  "#b91c1c", // Red 700
  "#450a0a", // Red 950
  "#064e3b", // Emerald 900
  "#18181b", // Zinc 900
  "#065f46", // Emerald 800
  "#09090b", // Zinc 950
  "#047857", // Emerald 700
  "#022c22", // Emerald 950
]

export default function Roulette({ movies, onSpinEnd, onRemoveMovie }: Props) {
  const [mustSpin, setMustSpin] = useState(false)
  const [prizeNumber, setPrizeNumber] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [lastSpunMovie, setLastSpunMovie] = useState<Movie | null>(null)

  // Estado de carregamento para o botão
  const [isCalibrating, setIsCalibrating] = useState(false)

  const validMovies = useMemo(() => {
    return movies.filter(movie => movie && (movie.title || (movie as any).name))
  }, [movies])

  const [stableMovies, setStableMovies] = useState(validMovies)

  useEffect(() => {
    if (!mustSpin) {
      setIsCalibrating(true)
      setStableMovies(validMovies)
      const timer = setTimeout(() => {
        setIsCalibrating(false)
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [validMovies, mustSpin])

  const dynamicFontSize = Math.max(11, 15 - Math.floor(stableMovies.length / 8))
  const maxChars = Math.max(14, 23 - Math.floor(stableMovies.length / 3))

  const data = useMemo(() => {
    return stableMovies.map((movie) => {
      const title = movie.title || (movie as any).name || "Sem Título"
      return {
        option: title.length > maxChars ? title.slice(0, maxChars) + "..." : title,
        style: { textColor: "#ffffff" },
      }
    })
  }, [stableMovies, maxChars])

  const filteredMovies = useMemo(() => {
    return validMovies.filter(movie => {
      const title = movie.title || (movie as any).name || ""
      return title.toLowerCase().includes(searchTerm.toLowerCase())
    })
  }, [validMovies, searchTerm])

  const handleSpinClick = () => {
    if (!mustSpin && !isCalibrating && stableMovies.length > 1) {
      setIsCalibrating(true)
      
      const newPrizeNumber = Math.floor(Math.random() * stableMovies.length)
      setPrizeNumber(newPrizeNumber)
      
      setTimeout(() => {
        setMustSpin(true)
        setIsCalibrating(false)
      }, 350)
    }
  }

  const handleStopSpinning = useCallback(() => {
    setMustSpin(false)
    const winner = stableMovies[prizeNumber]
    if (winner) {
      setLastSpunMovie(winner)
      onSpinEnd(winner)
    }
  }, [stableMovies, prizeNumber, onSpinEnd])

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
    if (lastSpunMovie && !validMovies.find(m => m.id === lastSpunMovie.id)) {
      setLastSpunMovie(null)
    }
  }, [validMovies, lastSpunMovie])

  if (stableMovies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
        <Sparkles className="w-16 h-16 mb-4 opacity-20" suppressHydrationWarning />
        <h3 className="text-xl font-semibold mb-2">A roleta está vazia</h3>
        <p>Vá aos seus Favoritos e clique no botão "+" nos cards para adicionar filmes aqui.</p>
      </div>
    )
  }

  if (stableMovies.length === 1) {
    // CORREÇÃO: Pegamos o filme de forma segura para evitar o erro de 'undefined'
    const singleMovie = validMovies[0] || stableMovies[0]

    return (
      <div className="flex flex-col md:flex-row items-center justify-center gap-12 py-12">
        <div className="flex flex-col items-center justify-center w-80 h-80 rounded-full border-4 border-dashed border-muted-foreground/30 bg-secondary/20 p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" suppressHydrationWarning />
          <h3 className="text-lg font-bold text-foreground mb-2">Falta pouco!</h3>
          <p className="text-sm text-muted-foreground">Adicione mais <b>1 filme</b> para a roleta poder girar.</p>
        </div>
        
        <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-xl flex flex-col max-h-[500px]">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" suppressHydrationWarning />
            Filmes (1)
          </h3>
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 text-foreground group">
            <span className="text-sm font-medium truncate flex-1 pr-4">
              {singleMovie?.title || (singleMovie as any)?.name || "Carregando..."}
            </span>
            <button
              onClick={() => singleMovie && onRemoveMovie(singleMovie.id)}
              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-4 h-4" suppressHydrationWarning />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-12 md:gap-24 py-12">
      <div className="relative group scale-105 md:scale-125 transition-transform duration-500">
        
        <div className="absolute inset-0 rounded-full bg-red-600/10 blur-2xl z-0 scale-95 pointer-events-none transition-all duration-700 group-hover:bg-red-600/20" />

        <div className="relative z-10 drop-shadow-2xl [&>img]:hidden">
          <Wheel
            mustStartSpinning={mustSpin}
            prizeNumber={prizeNumber}
            data={data}
            fontSize={dynamicFontSize}
            textDistance={55}
            backgroundColors={backgroundColors}
            textColors={["#ffffff"]}
            outerBorderColor="#94a3b8"
            outerBorderWidth={6}
            innerBorderColor="#334155"
            innerBorderWidth={12}
            radiusLineColor="#64748b"
            radiusLineWidth={1}
            onStopSpinning={handleStopSpinning}
          />
        </div>

        <button
          onClick={handleSpinClick}
          disabled={mustSpin || isCalibrating}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-sm font-bold rounded-full shadow-[0_0_15px_rgba(0,0,0,0.8)] border-2 border-slate-400 bg-gradient-to-br from-slate-600 via-slate-800 to-black text-slate-200 hover:text-white hover:border-white hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed z-20 flex items-center justify-center"
        >
          {isCalibrating ? (
            <Loader2 className="w-5 h-5 animate-spin text-slate-300" suppressHydrationWarning />
          ) : (
            "🗘"
          )}
        </button>
      </div>

      <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-xl flex flex-col max-h-[500px] z-10 relative">
        <h3 className="text-lg font-bold mb-4 flex items-center flex-wrap gap-2 shrink-0 justify-between">
          <span className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" suppressHydrationWarning />
            Filmes ({validMovies.length})
          </span>
          {lastSpunMovie && (
             <span className="animate-in fade-in slide-in-from-left-1 duration-300 px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary rounded-lg text-[10px] md:text-xs font-medium flex items-center gap-1 truncate max-w-[200px]">
               <RotateCcw className="w-3 h-3 shrink-0" suppressHydrationWarning />
               <span className="truncate">Ctrl+Z: {lastSpunMovie.title || (lastSpunMovie as any).name}</span>
             </span>
          )}
        </h3>

        <div className="relative mb-4 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" suppressHydrationWarning />
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
              const title = movie.title || (movie as any).name;
                
              return (
                <div
                  key={movie.id}
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors group/item ${containerClasses}`}
                >
                  <span className="text-sm font-medium truncate flex-1 pr-4 flex items-center gap-1">
                    {isLastSpun && <Sparkles className="w-3 h-3 text-primary shrink-0" suppressHydrationWarning />}
                    <span className="truncate">{title}</span>
                  </span>
                  <button
                    onClick={() => onRemoveMovie(movie.id)}
                    className={`p-1.5 rounded-md transition-colors opacity-0 group-hover/item:opacity-100 ${isLastSpun ? 'text-primary hover:text-destructive hover:bg-destructive/10' : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'}`}
                    title="Remover da roleta"
                  >
                    <Trash2 className="w-4 h-4" suppressHydrationWarning />
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