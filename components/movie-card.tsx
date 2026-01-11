"use client"

import { useState } from "react"
import type { Movie } from "@/lib/tmdb"
import { Heart, Check, X, Trash2, Star } from "lucide-react"

interface Props {
  movie: Movie
  onFavorite?: (id: number) => void
  onMarkAsSeen?: (id: number) => void
  onRemoveFromFavorites?: (id: number) => void
  onRemoveFromSeen?: (id: number) => void
  isFavorite: boolean
  onClick: () => void
  rank?: number
}

export default function MovieCard({
  movie,
  onFavorite,
  isFavorite,
  onClick,
  rank,
  onMarkAsSeen,
  onRemoveFromFavorites,
  onRemoveFromSeen,
}: Props) {
  const [isImageLoaded, setIsImageLoaded] = useState(false)

  return (
    <div
      className="card-shine relative group w-full aspect-[2/3] rounded-xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/10 cursor-pointer"
      onClick={onClick}
    >
      {/* Skeleton loader */}
      {!isImageLoaded && <div className="absolute inset-0 w-full h-full bg-secondary animate-pulse" />}

      {/* Poster image */}
      {movie.poster_path ? (
        <img
          src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
          alt={movie.title}
          onLoad={() => setIsImageLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            isImageLoaded ? "opacity-100" : "opacity-0"
          }`}
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center text-center bg-secondary p-4">
          <h3 className="text-foreground font-bold text-sm">{movie.title}</h3>
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 w-full h-full bg-gradient-to-t from-background via-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Content overlay */}
      <div className="absolute inset-0 w-full h-full flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="space-y-2">
          {/* Rating badge */}
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
            <span className="text-xs font-medium text-foreground">{movie.vote_average.toFixed(1)}</span>
          </div>

          <h2 className="text-foreground text-sm font-semibold line-clamp-2">{movie.title}</h2>

          {/* Action buttons */}
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

      {/* Remove button (favorites/seen) */}
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

{/* Rank badge - ALTERADO AQUI */}
      {rank && (
        <div className="absolute top-0 left-0 bg-primary/70 backdrop-blur-sm text-primary-foreground text-sm font-bold w-8 h-8 flex items-center justify-center rounded-br-xl z-10">
          {rank}
        </div>
      )}
    </div>
  )
}