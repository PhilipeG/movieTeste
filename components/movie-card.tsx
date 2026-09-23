"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import type { Movie, MovieDetails } from "@/lib/tmdb"
import { getMovieDetails } from "@/app/actions/tmdb"
import { prefetchMovieDetails } from "@/lib/prefetch"
import {
  Heart,
  Check,
  X,
  Trash2,
  Star,
  Plus,
  CalendarDays,
  Clock,
  Users,
  Clapperboard,
} from "lucide-react"

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
  /** O que aparece no verso ao girar: informações do filme ou só as notas */
  backContent?: "details" | "ratings"
}

// --- FUNÇÕES AUXILIARES PARA CORES DAS NOTAS ---
const getRatingColor = (rating: number) => {
  if (rating >= 8) return "text-green-500" // Ótimo
  if (rating >= 6) return "text-yellow-500" // Bom
  if (rating >= 4) return "text-orange-500" // Regular
  return "text-red-500" // Ruim
}
// ------------------------------------------------

// Cache client-side dos detalhes usados no verso do card (o servidor também
// cacheia getMovieDetails por 1 dia, então re-hover custa ~0)
const detailsCache = new Map<number, MovieDetails>()

const formatRuntime = (minutes: number) => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}min` : `${m}min`
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
  onAddToRoulette,
  ratings,
  backContent = "details",
}: Props) {
  const [isImageLoaded, setIsImageLoaded] = useState(false)
  const [isFlipped, setIsFlipped] = useState(false)
  const [details, setDetails] = useState<MovieDetails | null>(
    () => detailsCache.get(movie.id) ?? null,
  )
  const prefetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadDetails = () => {
    if (details) return
    const cached = detailsCache.get(movie.id)
    if (cached) {
      setDetails(cached)
      return
    }
    getMovieDetails(movie.id)
      .then((d) => {
        detailsCache.set(movie.id, d)
        setDetails(d)
      })
      .catch(() => {})
  }

  const handleMouseEnter = () => {
    setIsFlipped(true)
    if (backContent === "details") loadDetails()
    // Hover sustentado por 200ms dispara o prefetch completo do modal (imagens,
    // certificação) — evita gastar requests em mouseover rápido
    prefetchTimeoutRef.current = setTimeout(() => {
      prefetchMovieDetails(movie.id)
    }, 200)
  }

  const handleMouseLeave = () => {
    setIsFlipped(false)
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current)
      prefetchTimeoutRef.current = null
    }
  }

  const year = movie.release_date ? movie.release_date.slice(0, 4) : null
  const genres = details?.genres?.slice(0, 3).map((g) => g.name) ?? null
  const cast = details?.credits?.cast?.slice(0, 3).map((c) => c.name) ?? null
  const anak = ratings?.anak
  const silvio = ratings?.silvio

  return (
    <div
      className="cursor-target card-shine relative group w-full aspect-[2/3] [perspective:1600px] cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`relative h-full w-full [transform-style:preserve-3d] transition-transform duration-500 ease-[cubic-bezier(0.77,0,0.175,1)] motion-reduce:transition-none ${
          isFlipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        {/* ---------- FRENTE: pôster ---------- */}
        <div className="absolute inset-0 [backface-visibility:hidden] overflow-hidden rounded-xl bg-card border border-border shadow-lg">
          {/* skeleton load */}
          {!isImageLoaded && (
            <div className="absolute inset-0 w-full h-full bg-secondary animate-pulse" />
          )}

          {movie.poster_path ? (
            <Image
              src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
              alt={movie.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
              onLoad={() => setIsImageLoaded(true)}
              className={`object-cover transition-opacity duration-500 ${isImageLoaded ? "opacity-100" : "opacity-0"}`}
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-center bg-secondary p-4">
              <h3 className="font-display text-foreground font-bold text-base">{movie.title}</h3>
            </div>
          )}

          {/* Rank badge */}
          {rank && (
            <div className="absolute top-0 left-0 bg-primary/50 backdrop-blur-sm text-primary-foreground text-sm font-bold w-8 h-8 flex items-center justify-center rounded-br-xl z-10">
              {rank}
            </div>
          )}
        </div>

        {/* ---------- VERSO ---------- */}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] overflow-hidden rounded-xl bg-card border border-primary/40 shadow-xl shadow-primary/10 flex flex-col">
          {backContent === "ratings" ? (
            <>
              {/* pôster desfocado + notas centralizadas, como era o hover antes do flip */}
              {movie.poster_path && (
                <Image
                  src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
                  alt=""
                  fill
                  sizes="20vw"
                  aria-hidden="true"
                  className="object-cover blur-[3px] scale-105"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/10" />

              <div className="relative z-10 h-full flex items-center justify-center p-3">
                <div className="flex items-center gap-4 bg-background/80 px-4 py-3 rounded-xl backdrop-blur-sm border border-border shadow-lg">
                  {anak === undefined && silvio === undefined ? (
                    <span className="text-xs text-muted-foreground">Sem notas ainda</span>
                  ) : (
                    <>
                      {anak !== undefined && (
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-bold tracking-wider uppercase text-red-500 mb-0.5">
                            Anak
                          </span>
                          <span
                            className={`text-2xl font-bold leading-none ${getRatingColor(anak)}`}
                          >
                            {anak}
                          </span>
                        </div>
                      )}
                      {anak !== undefined && silvio !== undefined && (
                        <div className="w-[1px] h-8 bg-border" />
                      )}
                      {silvio !== undefined && (
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-bold tracking-wider uppercase text-blue-500 mb-0.5">
                            Silvio
                          </span>
                          <span
                            className={`text-2xl font-bold leading-none ${getRatingColor(silvio)}`}
                          >
                            {silvio}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* pôster esmaecido como fundo do verso */}
              {movie.poster_path && (
                <Image
                  src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
                  alt=""
                  fill
                  sizes="20vw"
                  aria-hidden="true"
                  className="object-cover opacity-15 blur-[2px]"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background/95" />

              <div className="relative z-10 flex flex-col h-full p-4">
                {/* título + nota TMDB */}
                <div>
                  <h2 className="font-display text-foreground text-base font-bold line-clamp-2 leading-snug">
                    {movie.title}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-medium text-foreground">
                      {movie.vote_average.toFixed(1)}
                    </span>
                  </div>
                </div>

                <div className="my-3 h-px bg-border/70" />

                {/* infos distribuídas por todo o espaço disponível */}
                <div className="flex-1 min-h-0 flex flex-col justify-evenly gap-2 text-[13px] text-muted-foreground">
                  <div className="flex items-center gap-4">
                    {year && (
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="w-4 h-4 text-primary" />
                        {year}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-primary" />
                      {details?.runtime ? formatRuntime(details.runtime) : "…"}
                    </span>
                  </div>

                  <div className="flex items-start gap-1.5">
                    <Clapperboard className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span className="line-clamp-2 leading-snug">
                      {genres ? genres.join(" • ") : "…"}
                    </span>
                  </div>

                  <div className="flex items-start gap-1.5">
                    <Users className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span className="line-clamp-3 leading-snug">
                      {cast ? cast.join(", ") : "…"}
                    </span>
                  </div>
                </div>

                <div className="mt-3" />

                {/* ações principais — sempre acessíveis no verso */}
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
            </>
          )}

          {/* botões secundários no canto do verso */}
          {(onRemoveFromFavorites || onRemoveFromSeen) && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (onRemoveFromFavorites) onRemoveFromFavorites(movie.id)
                if (onRemoveFromSeen) onRemoveFromSeen(movie.id)
              }}
              className="cursor-pointer absolute top-2 right-2 z-20 p-1.5 rounded-full bg-background/80 text-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground backdrop-blur-sm"
              title={onRemoveFromFavorites ? "Remover dos Favoritos" : "Remover dos Vistos"}
            >
              {onRemoveFromFavorites ? <X className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
            </button>
          )}
          {onAddToRoulette && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onAddToRoulette(movie)
              }}
              className="cursor-pointer absolute top-10 right-2 z-20 p-1.5 rounded-full bg-background/80 text-foreground transition-colors hover:bg-blue-600 hover:text-white backdrop-blur-sm"
              title="Adicionar à Roleta"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
