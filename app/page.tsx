"use client"

import { useEffect, useState, Fragment } from "react"
import dynamic from "next/dynamic"
import { Menu, Transition, MenuItems, MenuItem } from "@headlessui/react"
import { getPopularMovies, searchMovies, getGenres, getMovieById, getMoviesByGenre, getMovieDetails } from "@/app/actions/tmdb"
import { getSharedLists, updateFavoritesList, updateSeenList, getRatings, updateMovieRating } from "@/lib/firebase"
import type { RatingsMap } from "@/lib/firebase"
import type { Movie, Genre } from "@/lib/tmdb"
import MovieCard from "@/components/movie-card"
import MovieModal from "@/components/movie-modal"
import StatsModal from "@/components/stats-modal"
import { SortableMovieCard } from "@/components/sortable-movie-card"
import HeroCarousel from "@/components/hero-carousel"
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { arrayMove, SortableContext, rectSortingStrategy } from "@dnd-kit/sortable"
import { Search, MenuIcon, Film, Heart, Eye, Sparkles, Trophy, ChevronLeft, ChevronRight, BarChart2 } from "lucide-react"
import { Toaster, toast } from "sonner"

const Roulette = dynamic(() => import("@/components/roulette"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  ),
})

export default function Home() {
  // --- Estados Principais ---
  const [movies, setMovies] = useState<Movie[]>([])
  const [search, setSearch] = useState("")
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const [loading, setLoading] = useState(true)
  const [genres, setGenres] = useState<Genre[]>([])
  
  // --- Estados de Paginação dos Gêneros ---
  const [genrePage, setGenrePage] = useState(0)
  const ITEMS_PER_PAGE = 4

  // --- Estados de Listas e Firebase ---
  const [favorites, setFavorites] = useState<number[]>([])
  const [seenMovies, setSeenMovies] = useState<number[]>([])
  const [rouletteMovies, setRouletteMovies] = useState<Movie[]>([])
  const [bannerMovies, setBannerMovies] = useState<Movie[]>([])
  
  // --- Estados de Notas e Estatísticas ---
  const [ratings, setRatings] = useState<RatingsMap>({})
  const [showStats, setShowStats] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [seenMoviesDetails, setSeenMoviesDetails] = useState<any[]>([]) 

  // --- Controle de Visualização ---
  const [currentView, setCurrentView] = useState("popular")
  const [currentGenreName, setCurrentGenreName] = useState("")

  // --- Navegação dos Gêneros ---
  const handlePrevGenrePage = () => {
    setGenrePage((prev) => (prev > 0 ? prev - 1 : prev))
  }

  const handleNextGenrePage = () => {
    const totalPages = Math.ceil(genres.length / ITEMS_PER_PAGE)
    setGenrePage((prev) => (prev < totalPages - 1 ? prev + 1 : prev))
  }

  // --- Funções de Carregamento de Filmes ---
  const displayPopularMovies = async () => {
    setLoading(true)
    setCurrentView("popular")
    localStorage.setItem("dashmovie-view", "popular")
    try {
      const movieData = await getPopularMovies()
      setMovies(movieData)
    } catch (error) {
      console.error("Falha ao carregar filmes populares:", error)
      setMovies([])
    } finally {
      setLoading(false)
    }
  }

  const displayFavoriteMovies = async () => {
    setLoading(true)
    setCurrentView("favorites")
    localStorage.setItem("dashmovie-view", "favorites")
    try {
      if (favorites.length === 0) {
        setMovies([])
        return
      }
      const favoriteMoviesData = await Promise.all(favorites.map((id: number) => getMovieById(id)))
      setMovies(favoriteMoviesData)
    } catch (error) {
      console.error("Falha ao carregar filmes favoritos:", error)
      setMovies([])
    } finally {
      setLoading(false)
    }
  }

  const displaySeenMovies = async () => {
    setLoading(true)
    setCurrentView("seen")
    localStorage.setItem("dashmovie-view", "seen")
    try {
      if (seenMovies.length === 0) {
        setMovies([])
        return
      }
      const seenMoviesData = await Promise.all(seenMovies.map((id: number) => getMovieById(id)))
      setMovies(seenMoviesData)
    } catch (error) {
      console.error("Falha ao carregar filmes vistos:", error)
      setMovies([])
    } finally {
      setLoading(false)
    }
  }

  const displayRoulette = () => {
    setCurrentView("roulette")
    localStorage.setItem("dashmovie-view", "roulette")
  }

  const displayMoviesByGenre = async (genreId: number, genreName: string) => {
    setLoading(true)
    setCurrentView("genre")
    setCurrentGenreName(genreName)
    try {
      const results = await getMoviesByGenre(genreId)
      setMovies(results)
      toast.success(`Gênero: ${genreName}`)
    } catch (error) {
      console.error("Falha ao carregar gênero:", error)
      setMovies([])
    } finally {
      setLoading(false)
    }
  }

  // --- Carregamento Inicial (useEffect) ---
  useEffect(() => {
    async function loadInitialData() {
      setLoading(true)
      try {
        // 1. Carrega Listas do Firebase
        const { favorites: initialFavorites, seen: initialSeen } = await getSharedLists()
        const initialRatings = await getRatings() 

        setFavorites(initialFavorites)
        setSeenMovies(initialSeen)
        setRatings(initialRatings)

        // 2. Configura Banner Aleatório (Prioridade: FAVORITOS)
        const sourceList = initialFavorites.length > 0 ? initialFavorites : initialSeen
        
        if (sourceList.length > 0) {
          const shuffledIds = [...sourceList].sort(() => 0.5 - Math.random())
          const random5Ids = shuffledIds.slice(0, 5)
          const bannerData = await Promise.all(random5Ids.map((id: number) => getMovieById(id)))
          setBannerMovies(bannerData)
        }

        // 3. Carrega Gêneros (Filtrando "Música")
        const genresData = await getGenres()
        const filteredGenres = genresData.filter((g) => g.name !== "Música")
        setGenres(filteredGenres)

        // 4. Restaura View Salva
        const savedView = localStorage.getItem("dashmovie-view") || "popular"
        
        if (savedView === "favorites") {
          setCurrentView("favorites")
          if (initialFavorites.length > 0) {
            const favoriteMoviesData = await Promise.all(initialFavorites.map((id: number) => getMovieById(id)))
            setMovies(favoriteMoviesData)
          } else {
            setMovies([])
          }
        } else if (savedView === "seen") {
          setCurrentView("seen")
          if (initialSeen.length > 0) {
            const seenMoviesData = await Promise.all(initialSeen.map((id: number) => getMovieById(id)))
            setMovies(seenMoviesData)
          } else {
            setMovies([])
          }
        } else if (savedView === "roulette") {
          setCurrentView("roulette")
        } else {
          await displayPopularMovies()
        }
      } catch (error) {
        console.error("Falha ao carregar dados iniciais:", error)
      } finally {
        setLoading(false)
      }
    }
    loadInitialData()
  }, [])

  // --- Ações do Usuário ---

  const markAsSeen = (movieId: number) => {
    const newFavorites = favorites.filter((id) => id !== movieId)
    const newSeen = [...new Set([...seenMovies, movieId])]
    setFavorites(newFavorites)
    setSeenMovies(newSeen)
    setMovies((current) => current.filter((movie) => movie.id !== movieId))
    updateFavoritesList(newFavorites)
    updateSeenList(newSeen)
  }

  const removeFromFavorites = (movieId: number) => {
    const newFavorites = favorites.filter((id) => id !== movieId)
    setFavorites(newFavorites)
    setMovies((current) => current.filter((movie) => movie.id !== movieId))
    updateFavoritesList(newFavorites)
  }

  const removeFromSeen = (movieId: number) => {
    const newSeen = seenMovies.filter((id) => id !== movieId)
    setSeenMovies(newSeen)
    setMovies((current) => current.filter((movie) => movie.id !== movieId))
    updateSeenList(newSeen)
  }

  const toggleFavorite = (id: number) => {
    const isFavorited = favorites.includes(id)
    const newFavorites = isFavorited ? favorites.filter((favId) => favId !== id) : [...favorites, id]
    setFavorites(newFavorites)
    updateFavoritesList(newFavorites)
  }

  const addToRoulette = (movie: Movie) => {
    if (rouletteMovies.find((m) => m.id === movie.id)) {
      toast.error("Filme já está na roleta!")
      return
    }
    setRouletteMovies((prev) => [...prev, movie])
    toast.success("Adicionado à roleta!")
  }

  const removeFromRoulette = (id: number) => {
    setRouletteMovies((prev) => prev.filter((m) => m.id !== id))
  }

  // --- Lógica de Estatísticas e Notas ---

  const handleOpenStats = async () => {
    setShowStats(true)
    if (seenMoviesDetails.length !== seenMovies.length && seenMovies.length > 0) {
       setStatsLoading(true) 
       try {
         const details = await Promise.all(seenMovies.map(id => getMovieDetails(id)))
         setSeenMoviesDetails(details)
       } catch (e) {
         console.error("Erro ao carregar detalhes para estatísticas", e)
         toast.error("Erro ao calcular estatísticas")
       } finally {
         setStatsLoading(false)
       }
    }
  }

  const handleRateMovie = async (person: "anak" | "silvio", rating: number) => {
    if (!selectedMovie) return
    const newRatings = { 
        ...ratings, 
        [selectedMovie.id]: { 
            ...ratings[selectedMovie.id], 
            [person]: rating 
        } 
    }
    setRatings(newRatings)
    await updateMovieRating(selectedMovie.id, person, rating)
    toast.success(`Nota de ${person} salva!`)
  }

  // --- Drag and Drop ---
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 10 } }))

  function handleDragEnd(event: any) {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      setMovies((currentMovies) => {
        const oldIndex = currentMovies.findIndex((item) => item.id === active.id)
        const newIndex = currentMovies.findIndex((item) => item.id === over.id)
        if (oldIndex === -1 || newIndex === -1) return currentMovies
        const newOrder = arrayMove(currentMovies, oldIndex, newIndex)
        const newFavoriteIds = newOrder.map((movie) => movie.id)
        setFavorites(newFavoriteIds)
        updateFavoritesList(newFavoriteIds)
        return newOrder
      })
    }
  }

  const handleSearch = async () => {
    setLoading(true)
    setCurrentView("search")
    try {
      const results = search.trim() ? await searchMovies(search) : await getPopularMovies()
      setMovies(results)
    } catch (error) {
      console.error("Falha ao buscar filmes:", error)
      setMovies([])
    } finally {
      setLoading(false)
    }
  }

  const getViewTitle = () => {
    switch (currentView) {
      case "favorites": return "Meus Favoritos"
      case "seen": return "Já Assistidos"
      case "search": return "Resultados da Busca"
      case "roulette": return "Roleta da Sorte"
      case "genre": return currentGenreName ? `Gênero: ${currentGenreName}` : "Filmes por Gênero"
      default: return "Em Alta"
    }
  }

  const getViewIcon = () => {
    switch (currentView) {
      case "favorites": return <Heart className="w-5 h-5 text-primary" />
      case "seen": return <Eye className="w-5 h-5 text-primary" />
      case "roulette": return <Trophy className="w-5 h-5 text-primary" />
      default: return <Sparkles className="w-5 h-5 text-primary" />
    }
  }

  const currentGenres = genres.slice(genrePage * ITEMS_PER_PAGE, (genrePage + 1) * ITEMS_PER_PAGE)
  const isFirstPage = genrePage === 0
  const isLastPage = genrePage >= Math.ceil(genres.length / ITEMS_PER_PAGE) - 1

  return (
    <div className="min-h-screen">
      <Toaster position="bottom-right" theme="dark" />
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-secondary/30 -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent -z-10" />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="flex flex-col items-center w-full mb-12">
          <button
            onClick={displayPopularMovies}
            className="cursor-pointer group flex items-center gap-3 mb-8 transition-transform hover:scale-105"
          >
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
              <Film className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-foreground tracking-tight">
              Dash<span className="text-primary">Movie</span>
            </h1>
          </button>

          <div className="flex flex-col items-center w-full max-w-xl gap-4">
            
            {/* Search Bar */}
            <div className="relative flex items-center gap-3 w-full">
              <div className="flex-grow flex items-center gap-3 px-4 py-3 glass rounded-2xl focus-within:ring-2 focus-within:ring-primary/50 transition-all">
                <Search className="w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Buscar filmes..."
                  className="bg-transparent border-none text-foreground placeholder-muted-foreground w-full focus:ring-0 focus:outline-none text-sm"
                />
                <button
                  onClick={handleSearch}
                  className="cursor-pointer bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
                >
                  Buscar
                </button>
              </div>

              <Menu as="div" className="relative">
                <Menu.Button className="cursor-pointer p-3 glass rounded-xl hover:bg-secondary/50 transition-colors">
                  <MenuIcon className="w-5 h-5 text-foreground" />
                </Menu.Button>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-200"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-150"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <MenuItems className="absolute right-0 mt-2 w-56 glass rounded-xl shadow-xl z-20 focus:outline-none overflow-hidden">
                    <div className="p-2">
                      <MenuItem>
                        {({ active }) => (
                          <button
                            onClick={displayFavoriteMovies}
                            className={`${active ? "bg-secondary/50" : ""} cursor-pointer flex items-center gap-3 w-full px-4 py-3 text-sm text-foreground rounded-lg transition-colors`}
                          >
                            <Heart className="w-4 h-4 text-primary" />
                            Favoritos
                            {favorites.length > 0 && <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">{favorites.length}</span>}
                          </button>
                        )}
                      </MenuItem>
                      <MenuItem>
                        {({ active }) => (
                          <button
                            onClick={displaySeenMovies}
                            className={`${active ? "bg-secondary/50" : ""} cursor-pointer flex items-center gap-3 w-full px-4 py-3 text-sm text-foreground rounded-lg transition-colors`}
                          >
                            <Eye className="w-4 h-4 text-primary" />
                            Já Assistidos
                            {seenMovies.length > 0 && <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">{seenMovies.length}</span>}
                          </button>
                        )}
                      </MenuItem>
                      <MenuItem>
                        {({ active }) => (
                          <button
                            onClick={displayRoulette}
                            className={`${active ? "bg-secondary/50" : ""} cursor-pointer flex items-center gap-3 w-full px-4 py-3 text-sm text-foreground rounded-lg transition-colors`}
                          >
                            <Trophy className="w-4 h-4 text-primary" />
                            Roleta
                            {rouletteMovies.length > 0 && <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">{rouletteMovies.length}</span>}
                          </button>
                        )}
                      </MenuItem>
                    </div>
                  </MenuItems>
                </Transition>
              </Menu>
            </div>

            {/* --- LISTA DE GÊNEROS (Exibe na Home e nos Gêneros) --- */}
            {(currentView === "popular" || currentView === "genre") && (
              <div className="relative w-full group animate-in fade-in slide-in-from-top-4 duration-500">
                <button 
                  onClick={handlePrevGenrePage}
                  disabled={isFirstPage}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 z-10 bg-black/50 hover:bg-black/80 text-white p-1.5 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all disabled:opacity-0 disabled:pointer-events-none cursor-pointer hover:scale-110"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div 
                  key={genrePage}
                  className="grid grid-cols-4 gap-3 w-full animate-in fade-in slide-in-from-right-4 duration-300"
                >
                  {currentGenres.map((genre) => (
                    <button
                      key={genre.id}
                      onClick={() => displayMoviesByGenre(genre.id, genre.name)}
                      className="bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground h-10 rounded-xl text-sm font-medium transition-all cursor-pointer active:scale-95 flex items-center justify-center px-1"
                    >
                      <span className="truncate w-full text-center">{genre.name}</span>
                    </button>
                  ))}
                  {currentGenres.length < ITEMS_PER_PAGE && 
                     Array.from({ length: ITEMS_PER_PAGE - currentGenres.length }).map((_, i) => (
                       <div key={`empty-${i}`} className="h-10" />
                     ))
                  }
                </div>

                <button 
                  onClick={handleNextGenrePage}
                  disabled={isLastPage}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 z-10 bg-black/50 hover:bg-black/80 text-white p-1.5 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all disabled:opacity-0 disabled:pointer-events-none cursor-pointer hover:scale-110"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
            {/* --------------------------------------------------- */}

          </div>
        </header>

        {/* Banner - Apenas na Home */}
        {bannerMovies.length > 0 && currentView === "popular" && (
          <HeroCarousel 
            movies={bannerMovies} 
            onSelect={setSelectedMovie} 
          />
        )}

        {/* Título da Seção + Botão de Estatísticas (NO SEEN) */}
        <div className="flex items-center gap-3 mb-6">
          {getViewIcon()}
          <h2 className="text-xl font-semibold text-foreground">{getViewTitle()}</h2>
          
          {currentView !== "roulette" && <span className="text-sm text-muted-foreground">({movies.length} filmes)</span>}

          {/* Botão de Stats (Apenas em SEEN) */}
          {currentView === "seen" && (
            <button
              onClick={handleOpenStats}
              className="ml-2 p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer group"
              title="Estatísticas de Assistidos"
            >
              <BarChart2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
          )}
        </div>

        {/* Grid de Filmes / Roleta */}
        {currentView === "roulette" ? (
          <Roulette
            movies={rouletteMovies}
            onSpinEnd={(movie) => setSelectedMovie(movie)}
            onRemoveMovie={removeFromRoulette}
          />
        ) : loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-xl bg-card animate-pulse" />
            ))}
          </div>
        ) : movies.length > 0 ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={movies.map((m) => m.id)}
              strategy={rectSortingStrategy}
              disabled={currentView !== "favorites"}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {movies.map((movie, index) => {
                  const isFavorited = favorites.includes(movie.id)
                  if (currentView === "favorites") {
                    return (
                      <SortableMovieCard
                        key={movie.id}
                        rank={index + 1}
                        movie={movie}
                        onMarkAsSeen={markAsSeen}
                        onRemoveFromFavorites={removeFromFavorites}
                        onAddToRoulette={addToRoulette}
                        isFavorite={isFavorited}
                        onClick={() => setSelectedMovie(movie)}
                      />
                    )
                  }
                  if (currentView === "seen") {
                    return (
                      <MovieCard
                        key={movie.id}
                        movie={movie}
                        onRemoveFromSeen={removeFromSeen}
                        isFavorite={isFavorited}
                        onClick={() => setSelectedMovie(movie)}
                      />
                    )
                  }
                  return (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      onFavorite={toggleFavorite}
                      isFavorite={isFavorited}
                      onClick={() => setSelectedMovie(movie)}
                    />
                  )
                })}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-6 rounded-full bg-card mb-6">
              <Film className="w-12 h-12 text-muted-foreground" />
            </div>
            <p className="text-xl font-medium text-foreground mb-2">Nenhum filme encontrado</p>
            <p className="text-muted-foreground max-w-sm">
              {currentView === "favorites" && "Adicione filmes à sua lista de favoritos para vê-los aqui."}
              {currentView === "seen" && "Marque filmes como vistos para que eles apareçam nesta lista."}
              {currentView === "search" && "Tente buscar por outro termo."}
              {currentView === "popular" && "Não foi possível carregar os filmes populares."}
            </p>
          </div>
        )}

        {/* Modais */}
        {showStats && (
          <StatsModal 
            seenMovies={seenMoviesDetails.length > 0 ? seenMoviesDetails : []} 
            ratings={ratings}
            onClose={() => setShowStats(false)}
            isLoading={statsLoading} 
          />
        )}

        {selectedMovie && (
          <MovieModal 
            movie={selectedMovie} 
            onClose={() => setSelectedMovie(null)}
            ratings={ratings[selectedMovie.id]} 
            onRate={handleRateMovie} 
          />
        )}
      </div>
    </div>
  )
}