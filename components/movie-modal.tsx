"use client"

import { useState, useEffect } from "react"
import { getMovieImages, getMovieCertification, getMovieDetails } from "@/app/actions/tmdb"
import type { Movie, MovieDetails, Genre, CastMember, WatchProvider } from "@/lib/tmdb"
import { X, Star, Clock, Calendar, Users, Tv } from "lucide-react"

function formatRuntime(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

const streamingLinkMap: { [key: string]: string } = {
  Netflix: "https://www.netflix.com/search?q=",
  "Amazon Prime Video": "https://www.primevideo.com/search/ref=atv_nb_sr?phrase=",
  "Disney Plus": "https://www.disneyplus.com/search?q=",
  Max: "https://play.max.com/search?q=",
  "Star Plus": "https://www.starplus.com/search?q=",
  "Apple TV Plus": "https://tv.apple.com/br/search?term=",
  Globoplay: "https://globoplay.globo.com/busca/?q=",
}

interface Props {
  movie: Movie | null
  onClose: () => void
}

export default function MovieModal({ movie, onClose }: Props) {
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

  if (!movie) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative glass rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden z-10 flex flex-col md:flex-row">
        {/* Image section */}
        <div className="w-full md:w-1/2 relative flex items-center justify-center bg-secondary/30 min-h-[300px] md:min-h-[500px]">
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
            <div className="w-full h-full bg-secondary animate-pulse" />
          )}

          {/* Image pagination */}
          {images.length > 1 && (
            <div className="absolute bottom-4 flex gap-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImage(index)}
                  className={`cursor-pointer w-2 h-2 rounded-full transition-colors ${
                    currentImage === index ? "bg-primary" : "bg-foreground/30 hover:bg-foreground/50"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Content section */}
        <div className="w-full md:w-1/2 p-6 overflow-y-auto custom-scrollbar max-h-[50vh] md:max-h-[90vh]">
          {/* Close button */}
          <button
            className="cursor-pointer absolute top-4 right-4 p-2 rounded-full bg-secondary/50 hover:bg-destructive text-foreground hover:text-destructive-foreground transition-colors z-10"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Title */}
          <h2 className="text-2xl md:text-3xl font-bold text-foreground pr-10">{movie.title}</h2>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {movie.release_date?.slice(0, 4)}
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500" />
              {movie.vote_average.toFixed(1)}
            </span>
            {certification && (
              <span className="border border-border text-foreground rounded px-2 py-0.5 text-xs font-medium">
                {certification}
              </span>
            )}
          </div>

          {/* Tabs */}
          <div className="mt-6 flex gap-1 p-1 bg-secondary/30 rounded-lg">
            {(["sinopse", "info", "galeria"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`cursor-pointer flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="mt-4 text-foreground/90">
            {tab === "sinopse" && <p className="leading-relaxed">{movie.overview || "Sinopse indisponível."}</p>}

            {tab === "info" &&
              (loadingDetails ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-6 bg-secondary/50 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                (() => {
                  const streamingProviders = details?.["watch/providers"]?.results?.BR?.flatrate || []
                  return (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Data de Lançamento</p>
                          <p className="font-medium">
                            {details?.release_date
                              ? new Date(details.release_date).toLocaleDateString("pt-BR", { timeZone: "UTC" })
                              : "N/A"}
                          </p>
                        </div>
                      </div>

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
                          <p className="font-medium">
                            {details?.credits?.cast
                              ?.slice(0, 5)
                              .map((c: CastMember) => c.name)
                              .join(", ") || "N/A"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Tv className="w-5 h-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Onde Assistir</p>
                          {streamingProviders.length > 0 ? (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {streamingProviders.map((provider: WatchProvider) => {
                                const baseUrl = streamingLinkMap[provider.provider_name]
                                const searchUrl =
                                  baseUrl && movie ? `${baseUrl}${encodeURIComponent(movie.title)}` : undefined
                                if (searchUrl) {
                                  return (
                                    <a
                                      href={searchUrl}
                                      key={provider.provider_id}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="transition-transform hover:scale-110 cursor-pointer"
                                    >
                                      <img
                                        src={`https://image.tmdb.org/t/p/w500${provider.logo_path}`}
                                        alt={provider.provider_name}
                                        title={provider.provider_name}
                                        className="w-10 h-10 rounded-lg"
                                      />
                                    </a>
                                  )
                                }
                                return (
                                  <img
                                    key={provider.provider_id}
                                    src={`https://image.tmdb.org/t/p/w500${provider.logo_path}`}
                                    alt={provider.provider_name}
                                    title={provider.provider_name}
                                    className="w-10 h-10 rounded-lg"
                                  />
                                )
                              })}
                            </div>
                          ) : (
                            <p className="text-muted-foreground">Não disponível para streaming</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })()
              ))}

            {tab === "galeria" && (
              <div className="grid grid-cols-2 gap-2">
                {images.map((img, i) => (
                  <img
                    key={i}
                    src={img || "/placeholder.svg"}
                    alt={`${movie.title} - imagem ${i + 1}`}
                    className="rounded-lg w-full aspect-video object-cover hover:opacity-80 transition-opacity cursor-pointer"
                    onClick={() => setCurrentImage(i)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}