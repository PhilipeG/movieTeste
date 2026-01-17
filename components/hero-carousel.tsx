"use client"

import { useState, useEffect } from "react"
import type { Movie } from "@/lib/tmdb"
import { Star, Calendar, PlayCircle } from "lucide-react"

interface Props {
  movies: Movie[]
  onSelect: (movie: Movie) => void
}

export default function HeroCarousel({ movies, onSelect }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovering, setIsHovering] = useState(false)

  // Rotação automática a cada 10 segundos
  useEffect(() => {
    if (movies.length <= 1 || isHovering) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % movies.length)
    }, 10000)

    return () => clearInterval(interval)
  }, [movies.length, isHovering])

  if (movies.length === 0) return null

  const currentMovie = movies[currentIndex]

  return (
    <div 
      className="relative w-full h-[300px] md:h-[450px] rounded-2xl overflow-hidden mb-10 group shadow-2xl border border-white/10"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Background Images (com transição suave) */}
      {movies.map((movie, index) => (
        <div
          key={movie.id}
          className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
            index === currentIndex ? "opacity-100" : "opacity-0"
          }`}
        >
          {movie.backdrop_path ? (
            <img
              src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`}
              alt={movie.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-secondary flex items-center justify-center">
               <img 
                 src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`} 
                 className="h-full object-cover opacity-50 blur-sm" 
                 alt={movie.title}
               />
            </div>
          )}
          {/* Gradiente Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
        </div>
      ))}

      {/* Content Info */}
      <div className="absolute bottom-0 left-0 p-6 md:p-10 w-full md:w-2/3 z-10 flex flex-col items-start gap-4">
        
        {/* --- BADGE ATUALIZADO: VERMELHO / PENDENTE --- */}
        <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-white bg-red-600/80 backdrop-blur-md rounded-full shadow-lg border border-red-400/30 animate-pulse">
          Pendente
        </span>
        {/* --------------------------------------------- */}

        <h2 className="text-3xl md:text-5xl font-bold text-white drop-shadow-md line-clamp-2 transition-all duration-500">
          {currentMovie.title}
        </h2>

        <p className="text-white/80 line-clamp-2 text-sm md:text-base max-w-xl drop-shadow-sm">
          {currentMovie.overview || "Sem sinopse disponível."}
        </p>

        <div className="flex items-center gap-4 text-white/90 text-sm font-medium">
          <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-lg backdrop-blur-sm">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            {currentMovie.vote_average.toFixed(1)}
          </div>
          <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-lg backdrop-blur-sm">
            <Calendar className="w-4 h-4 text-primary" />
            {currentMovie.release_date?.slice(0, 4)}
          </div>
        </div>
        
        <button 
          onClick={() => onSelect(currentMovie)}
          className="mt-2 cursor-pointer flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-xl backdrop-blur-md border border-white/20 transition-all hover:scale-105 active:scale-95"
        >
          <PlayCircle className="w-5 h-5" />
          Ver Detalhes
        </button>
      </div>

      {/* Indicadores (Bolinhas) */}
      <div className="absolute bottom-6 right-6 flex gap-2 z-20">
        {movies.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`cursor-pointer transition-all duration-300 rounded-full h-2 ${
              idx === currentIndex ? "w-8 bg-primary" : "w-2 bg-white/50 hover:bg-white"
            }`}
          />
        ))}
      </div>
    </div>
  )
}