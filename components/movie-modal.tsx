"use client"

import { useState, useEffect, useRef } from "react"
import { getMovieImages, getMovieCertification, getMovieDetails } from "@/app/actions/tmdb"
import type { Movie, MovieDetails, Genre, CastMember } from "@/lib/tmdb"
import { X, Star, StarHalf, Clock, Calendar, Users, PlayCircle, User, ChevronLeft, ChevronRight } from "lucide-react"

interface Props {
  movie: Movie | null
  onClose: () => void
  ratings?: { anak?: number; silvio?: number }
  onRate?: (person: "anak" | "silvio", rating: number) => void
}

// Componente de Estrelas com Meia Avaliação (Precision 0.5)
function StarRating({ value, onChange, label, colorClass }: any) {
  const [hoverValue, setHoverValue] = useState(0)
  // Estado para forçar re-render quando o mouse se move internamente (necessário para a precisão do hover)
  const [internalHover, setInternalHover] = useState(0)

  const displayValue = hoverValue > 0 ? hoverValue : (value || 0)

  // Função para calcular se é metade ou inteiro baseado na posição do mouse
  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>, starIndex: number) => {
    const { left, width } = e.currentTarget.getBoundingClientRect()
    // Calcula a posição do mouse dentro do botão (0 a width)
    const x = e.clientX - left
    
    // Se estiver na primeira metade, é (index - 0.5), senão é index
    const newValue = x < width / 2 ? starIndex - 0.5 : starIndex
    
    if (newValue !== hoverValue) {
      setHoverValue(newValue)
    }
  }

  return (
    <div
      className="flex flex-col gap-1 bg-secondary/30 p-2 rounded-xl border border-white/5 hover:bg-secondary/50 transition-colors"
      onMouseLeave={() => setHoverValue(0)}
    >
      <span className="text-xs font-bold text-muted-foreground flex items-center gap-1 uppercase tracking-wider">
        <User className="w-3 h-3" /> {label}
      </span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          // Lógica de visualização
          // Se o valor de exibição for >= a estrela atual (ex: valor 3, estrela 2) -> Cheia
          // Se o valor for exatamente 0.5 a menos que a estrela atual (ex: valor 2.5, estrela 3) -> Metade
          // Caso contrário -> Vazia

          const isFull = displayValue >= star
          const isHalf = displayValue >= star - 0.5 && displayValue < star

          return (
            <button
              key={star}
              type="button"
              onClick={() => onChange(hoverValue)} // Envia o valor calculado no hover (ex: 3.5)
              onMouseMove={(e) => handleMouseMove(e, star)}
              className="relative cursor-pointer transition-transform hover:scale-110 focus:outline-none p-0.5"
            >
              {/* Renderiza o ícone correto */}
              {isHalf ? (
                // Ícone de Meia Estrela
                <div className="relative">
                   {/* Fundo transparente/cinza para manter o tamanho */}
                   <Star className="w-5 h-5 text-muted-foreground/30" /> 
                   {/* Metade preenchida por cima */}
                   <StarHalf className={`w-5 h-5 absolute top-0 left-0 ${colorClass} fill-current`} />
                </div>
              ) : (
                // Ícone de Estrela Cheia ou Vazia
                <Star
                  className={`w-5 h-5 transition-colors duration-200 ${
                    isFull ? `${colorClass} fill-current` : "text-muted-foreground/30"
                  }`}
                />
              )}
            </button>
          )
        })}
        {/* Mostra o número com decimal */}
        <span className={`ml-2 text-sm font-bold w-8 text-right transition-colors ${hoverValue > 0 ? colorClass : ''}`}>
          {displayValue > 0 ? displayValue.toFixed(1) : "-"}
        </span>
      </div>
    </div>
  )
}

function formatRuntime(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

export default function MovieModal({ movie, onClose, ratings, onRate }: Props) {
  const [tab, setTab] = useState<"sinopse" | "info" | "galeria">("sinopse")
  const [images, setImages] = useState<string[]>([])
  const [currentImage, setCurrentImage] = useState(0)
  const [certification, setCertification] = useState<string>("")
  const [details, setDetails] = useState<MovieDetails | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(true)
  const [isPosterLoaded, setIsPosterLoaded] = useState(false)

  useEffect(() => {
    if (!movie) return

    setCurrentImage(0)
    setIsPosterLoaded(false)
    setLoadingDetails(true)
    setImages([])
    setDetails(null)

    async function loadExtraData() {
      try {
        const [imageData, cert, movieDetails] = await Promise.all([
          getMovieImages(movie!.id),
          getMovieCertification(movie!.id),
          getMovieDetails(movie!.id),
        ])

        const backdrops = imageData.backdrops
          .slice(0, 5)
          .map((img: any) => `https://image.tmdb.org/t/p/w780${img.file_path}`)
        const poster = movie!.poster_path ? [`https://image.tmdb.org/t/p/w500${movie!.poster_path}`] : []

        setImages([...poster, ...backdrops])
        setCertification(cert)
        setDetails(movieDetails)
      } catch (error) {
        console.error("Erro ao carregar dados extras do modal:", error)
      } finally {
        setLoadingDetails(false)
      }
    }

    loadExtraData()
  }, [movie])

  useEffect(() => {
    setIsPosterLoaded(false)
  }, [currentImage])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleEsc)
    return () => document.removeEventListener("keydown", handleEsc)
  }, [onClose])

  const nextImage = () => {
    setCurrentImage((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  const prevImage = () => {
    setCurrentImage((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  if (!movie) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative glass rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden z-10 flex flex-col md:flex-row animate-in zoom-in-95 duration-200">
        
        {/* Seção da Imagem (Esquerda) */}
        <div className="w-full md:w-1/2 relative flex items-center justify-center bg-black/50 min-h-[300px] md:min-h-[500px] group/image">
          {images.length > 0 ? (
            <>
              {!isPosterLoaded && <div className="absolute inset-0 w-full h-full bg-secondary animate-pulse" />}
              <img
                key={images[currentImage]}
                src={images[currentImage] || "/placeholder.svg"}
                alt={movie.title}
                onLoad={() => setIsPosterLoaded(true)}
                className={`w-full h-full object-contain transition-opacity duration-300 ${
                  isPosterLoaded ? "opacity-100" : "opacity-0"
                }`}
              />
            </>
          ) : (
            <div className="w-full h-full bg-secondary animate-pulse flex items-center justify-center text-muted-foreground">
              Sem imagem
            </div>
          )}

          {/* Setas de navegação da galeria */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  prevImage()
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-all opacity-0 group-hover/image:opacity-100 cursor-pointer z-10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  nextImage()
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white transition-all opacity-0 group-hover/image:opacity-100 cursor-pointer z-10"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>

        {/* Seção de Conteúdo (Direita) */}
        <div className="w-full md:w-1/2 p-6 overflow-y-auto custom-scrollbar max-h-[50vh] md:max-h-[90vh] bg-background/60 backdrop-blur-xl">
          {/* Botão Fechar */}
          <button
            className="cursor-pointer absolute top-4 right-4 p-2 rounded-full bg-secondary/50 hover:bg-destructive text-foreground hover:text-destructive-foreground transition-colors z-10"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Título */}
          <h2 className="text-2xl md:text-3xl font-bold text-foreground pr-10 mb-2">{movie.title}</h2>

          {/* Meta Infos */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-4">
            <span className="flex items-center gap-1 bg-secondary/30 px-2 py-1 rounded-md">
              <Calendar className="w-3.5 h-3.5" />
              {movie.release_date?.slice(0, 4)}
            </span>
            <span className="flex items-center gap-1 bg-secondary/30 px-2 py-1 rounded-md">
              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
              {movie.vote_average.toFixed(1)} <span className="text-xs opacity-70">(TMDB)</span>
            </span>
            {certification && (
              <span className="border border-white/10 text-foreground rounded px-2 py-0.5 text-xs font-medium">
                {certification}
              </span>
            )}
          </div>

          {/* ÁREA DE AVALIAÇÃO (Anak & Silvio) - Agora com Meia Estrela */}
          {onRate && (
            <div className="grid grid-cols-2 gap-3 mb-6 animate-in slide-in-from-left-4 duration-500">
              <StarRating
                label="Anak"
                value={ratings?.anak}
                onChange={(val: number) => onRate("anak", val)}
                colorClass="text-purple-500"
              />
              <StarRating
                label="Silvio"
                value={ratings?.silvio}
                onChange={(val: number) => onRate("silvio", val)}
                colorClass="text-blue-500"
              />
            </div>
          )}

          {/* Tabs Navigation */}
          <div className="flex gap-1 p-1 bg-secondary/30 rounded-xl mb-4">
            {(["sinopse", "info", "galeria"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`cursor-pointer flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  tab === t
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Tabs Content */}
          <div className="text-foreground/90 min-h-[200px]">
            {tab === "sinopse" && (
              <p className="leading-relaxed text-sm md:text-base animate-in fade-in duration-300">
                {movie.overview || "Sinopse indisponível."}
              </p>
            )}

            {tab === "info" && (
              <div className="space-y-4 animate-in fade-in duration-300">
                {loadingDetails ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-8 bg-secondary/50 rounded animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Duração</p>
                        <p className="font-medium">{details?.runtime ? formatRuntime(details.runtime) : "N/A"}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Star className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Gêneros</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {details?.genres?.map((g: Genre) => (
                            <span key={g.id} className="text-xs bg-secondary/50 px-2 py-1 rounded-md">
                              {g.name}
                            </span>
                          )) || "N/A"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Users className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Elenco Principal</p>
                        <p className="font-medium text-sm">
                          {details?.credits?.cast
                            ?.slice(0, 5)
                            .map((c: CastMember) => c.name)
                            .join(", ") || "N/A"}
                        </p>
                      </div>
                    </div>

                    {/* TRAILER SECTION */}
                    <div className="flex items-start gap-3 w-full pt-2 border-t border-white/5">
                      <PlayCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="w-full">
                        <p className="text-sm text-muted-foreground mb-3">Trailer Oficial</p>
                        {(() => {
                          const trailer = details?.videos?.results?.find(
                            (v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")
                          )

                          if (trailer) {
                            return (
                              <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-lg border border-white/10 bg-black group/video">
                                <iframe
                                  src={`https://www.youtube.com/embed/${trailer.key}`}
                                  title={trailer.name}
                                  className="absolute inset-0 w-full h-full"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                            )
                          }
                          return (
                            <div className="w-full h-24 bg-secondary/20 rounded-xl flex items-center justify-center border border-dashed border-white/10">
                              <p className="text-muted-foreground text-sm">Nenhum trailer disponível.</p>
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {tab === "galeria" && (
              <div className="grid grid-cols-2 gap-2 animate-in fade-in duration-300">
                {images.map((img, i) => (
                  <div key={i} className="relative aspect-video group/item overflow-hidden rounded-lg">
                    <img
                      src={img || "/placeholder.svg"}
                      alt={`Galeria ${i}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-110 cursor-pointer"
                      onClick={() => setCurrentImage(i)}
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/item:opacity-100 transition-opacity pointer-events-none" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}