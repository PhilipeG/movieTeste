"use client"

import { useState } from "react"
import type { Movie } from "@/lib/tmdb"
import { Heart, Check, X, Trash2, Star, Plus } from "lucide-react"

interface Props {
  movie: Movie
  onFavorite?: (id: number) => void
  onMarkAsSeen?: (id: number) => void
  onRemoveFromFavorites?: (id: number) => void
  onRemoveFromSeen?: (id: number) => void
  onAddToRoulette?: (movie: Movie) => void
  isFavorite: boolean
  onClick: () => void
  rank?: number
  ratings?: { anak?: number; silvio?: number }
}

// --- FUNÇÕES AUXILIARES PARA CORES DAS NOTAS ---
const getRatingColor = (rating: number) => {
  if (rating >= 8) return "text-green-500" // Ótimo
  if (rating >= 6) return "text-yellow-500" // Bom
  if (rating >= 4) return "text-orange-500" // Regular
  return "text-red-500" // Ruim
}
// ------------------------------------------------

export default function MovieCard({
  movie,
  onFavorite,
  isFavorite,
  onClick,
  rank,
  onMarkAsSeen,
  onRemoveFromFavorites,
  onRemoveFromSeen,
  onAddToRoulette,
  ratings,
}: Props) {
  const [isImageLoaded, setIsImageLoaded] = useState(false)

  return (
    <div
      className="card-shine relative group w-full aspect-[2/3] rounded-xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10 cursor-pointer"
      onClick={onClick}
    >
      {/* skeleton load */}
      {!isImageLoaded && <div className="absolute inset-0 w-full h-full bg-secondary animate-pulse" />}

      {/* poster COM EFEITO DE DESFOQUE NO HOVER */}
      {movie.poster_path ? (
        <img
          src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
          alt={movie.title}
          onLoad={() => setIsImageLoaded(true)}
          className={`w-full h-full object-cover transition-all duration-500 ${
            isImageLoaded ? "opacity-100" : "opacity-0"
          } group-hover:blur-[3px]`}
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center text-center bg-secondary p-4">
          <h3 className="text-foreground font-bold text-sm">{movie.title}</h3>
        </div>
      )}

      {/* gradiente overlay original */}
      <div className="absolute inset-0 w-full h-full bg-gradient-to-t from-background via-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* --- NOTAS CENTRALIZADAS NO HOVER --- */}
      {ratings && (ratings.anak !== undefined || ratings.silvio !== undefined) && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-10 pointer-events-none">
          <div className="flex items-center gap-4 bg-background/80 px-4 py-3 rounded-xl backdrop-blur-sm border border-border shadow-lg">
            
            {/* Avaliação Anak */}
            {ratings.anak !== undefined && (
              <div className="flex flex-col items-center">
                {/* Nome Vermelho */}
                <span className="text-[10px] font-bold tracking-wider uppercase text-red-500 mb-0.5">
                  Anak
                </span>
                {/* Nota Cor Dinâmica */}
                <span className={`text-2xl font-bold leading-none ${getRatingColor(ratings.anak)}`}>
                  {ratings.anak}
                </span>
              </div>
            )}
            
            {/* Divisor */}
            {ratings.anak !== undefined && ratings.silvio !== undefined && (
              <div className="w-[1px] h-8 bg-border" />
            )}

            {/* Avaliação Silvio */}
            {ratings.silvio !== undefined && (
              <div className="flex flex-col items-center">
                {/* Nome Azul */}
                <span className="text-[10px] font-bold tracking-wider uppercase text-blue-500 mb-0.5">
                  Silvio
                </span>
                {/* Nota Cor Dinâmica */}
                <span className={`text-2xl font-bold leading-none ${getRatingColor(ratings.silvio)}`}>
                  {ratings.silvio}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ------------------------------------------------ */}

      {/* content overlay (Título, Nota TMDB e Botões originais) */}
      <div className="absolute inset-0 w-full h-full flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="space-y-2">
          {/* rating do TMDB */}
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
            <span className="text-xs font-medium text-foreground">{movie.vote_average.toFixed(1)}</span>
          </div>

          <h2 className="text-foreground text-sm font-semibold line-clamp-2">{movie.title}</h2>

          {/* botoes de açao originais */}
          <div className="flex gap-2">
            {onMarkAsSeen && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onMarkAsSeen(movie.id)
                }}
                className="cursor-pointer flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded-lg bg-primary/80 hover:bg-primary text-primary-foreground backdrop-blur-sm transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                Visto
              </button>
            )}
            {onFavorite && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onFavorite(movie.id)
                }}
                className={`cursor-pointer flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded-lg backdrop-blur-sm transition-colors ${
                  isFavorite
                    ? "bg-primary/80 hover:bg-primary text-primary-foreground"
                    : "bg-secondary/80 hover:bg-secondary text-foreground"
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${isFavorite ? "fill-current" : ""}`} />
                {isFavorite ? "Favoritado" : "Favoritar"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* botao remover originais */}
      {(onRemoveFromFavorites || onRemoveFromSeen) && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (onRemoveFromFavorites) onRemoveFromFavorites(movie.id)
            if (onRemoveFromSeen) onRemoveFromSeen(movie.id)
          }}
          className="cursor-pointer absolute top-2 right-2 z-20 p-1.5 rounded-full bg-background/80 text-foreground opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-destructive hover:text-destructive-foreground backdrop-blur-sm"
          title={onRemoveFromFavorites ? "Remover dos Favoritos" : "Remover dos Vistos"}
        >
          {onRemoveFromFavorites ? <X className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
        </button>
      )}

      {/* botao roleta original */}
      {onAddToRoulette && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onAddToRoulette(movie)
          }}
          className="cursor-pointer absolute top-10 right-2 z-20 p-1.5 rounded-full bg-background/80 text-foreground opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-blue-600 hover:text-white backdrop-blur-sm"
          title="Adicionar à Roleta"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}

      {/* Rank badge original */}
      {rank && (
        <div className="absolute top-0 left-0 bg-primary/50 backdrop-blur-sm text-primary-foreground text-sm font-bold w-8 h-8 flex items-center justify-center rounded-br-xl z-10">
          {rank}
        </div>
      )}
    </div>
  )
}