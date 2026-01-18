"use client"

import { useEffect, useState, useRef, Fragment } from "react"
import dynamic from "next/dynamic"
import { Menu, Transition, MenuItems, MenuItem, Listbox, ListboxButton, ListboxOptions, ListboxOption } from "@headlessui/react"
import { getPopularMovies, searchMovies, getGenres, getMovieById, getMovieDetails } from "@/app/actions/tmdb"
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
import { Search, MenuIcon, Film, Heart, Eye, Sparkles, Trophy, ChevronLeft, ChevronRight, BarChart2, PlusCircle, Loader2, SlidersHorizontal, XCircle, Calendar, Star, ChevronDown, Check } from "lucide-react"
import { Toaster, toast } from "sonner"

const Roulette = dynamic(() => import("@/components/roulette"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  ),
})

// --- COMPONENTE DE SELECT CUSTOMIZADO ---
function FilterSelect({ value, onChange, options, icon: Icon, placeholder }: any) {
  const selectedLabel = options.find((opt: any) => opt.value === value)?.label || placeholder

  return (
    <div className="relative">
      <Listbox value={value} onChange={onChange}>
        <ListboxButton className="relative w-full cursor-pointer bg-secondary/50 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-left text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all hover:bg-secondary/70">
          <span className="block truncate text-foreground flex items-center gap-2">
             <span className={`text-muted-foreground ${value ? "text-primary" : ""}`}>
               <Icon className="w-4 h-4" />
             </span>
             {selectedLabel}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </span>
        </ListboxButton>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <ListboxOptions className="absolute mt-1 max-h-60 w-full overflow-auto rounded-xl bg-[#121212]/95 backdrop-blur-xl border border-white/10 py-1 text-base shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-50 custom-scrollbar">
            <ListboxOption
              value={null}
              className={({ active }) =>
                `relative cursor-pointer select-none py-2 pl-10 pr-4 transition-colors ${
                  active ? "bg-primary/20 text-primary" : "text-foreground"
                }`
              }
            >
              {({ selected }) => (
                <>
                  <span className={`block truncate ${selected ? "font-medium" : "font-normal"}`}>
                    {placeholder}
                  </span>
                  {selected ? (
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary">
                      <Check className="h-3 w-3" aria-hidden="true" />
                    </span>
                  ) : null}
                </>
              )}
            </ListboxOption>

            {options.map((opt: any) => (
              <ListboxOption
                key={opt.value}
                value={opt.value}
                className={({ active }) =>
                  `relative cursor-pointer select-none py-2 pl-10 pr-4 transition-colors ${
                    active ? "bg-primary/20 text-primary" : "text-foreground"
                  }`
                }
              >
                {({ selected }) => (
                  <>
                    <span className={`block truncate ${selected ? "font-medium text-primary" : "font-normal"}`}>
                      {opt.label}
                    </span>
                    {selected ? (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary">
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </Transition>
      </Listbox>
    </div>
  )
}

export default function Home() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [search, setSearch] = useState("")
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const [loading, setLoading] = useState(true)
  const [genres, setGenres] = useState<Genre[]>([])
  
  const [currentPage, setCurrentPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  
  // Refs para "Click Outside"
  const filterRef = useRef<HTMLDivElement>(null)
  const filterBtnRef = useRef<HTMLButtonElement>(null)
  
  const [activeFilters, setActiveFilters] = useState<{
    genreId: string | null;
    year: string | null;
    minRating: number | null;
  }>({ genreId: null, year: null, minRating: null })

  const [favorites, setFavorites] = useState<number[]>([])
  const [seenMovies, setSeenMovies] = useState<number[]>([])
  const [rouletteMovies, setRouletteMovies] = useState<Movie[]>([])
  const [bannerMovies, setBannerMovies] = useState<Movie[]>([])
  
  const [ratings, setRatings] = useState<RatingsMap>({})
  const [showStats, setShowStats] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [seenMoviesDetails, setSeenMoviesDetails] = useState<any[]>([]) 

  const [currentView, setCurrentView] = useState("popular")

  // --- LÓGICA DE CLICK OUTSIDE ---
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        showFilters &&
        filterRef.current &&
        !filterRef.current.contains(event.target as Node) &&
        filterBtnRef.current &&
        !filterBtnRef.current.contains(event.target as Node)
      ) {
        setShowFilters(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showFilters])
  // ------------------------------

  const genreOptions = genres.map(g => ({ value: g.id.toString(), label: g.name }))
  
  const yearOptions = Array.from({ length: 50 }, (_, i) => {
    const year = new Date().getFullYear() - i
    return { value: year.toString(), label: year.toString() }
  })

  const fetchMovies = async (resetPage = true) => {
    if (resetPage) {
      setLoading(true)
      setCurrentPage(1)
    } else {
      setLoadingMore(true)
    }

    try {
      const data = await getPopularMovies(resetPage ? 1 : currentPage + 1, activeFilters)
      
      if (resetPage) {
        setMovies(data)
      } else {
        const uniqueMovies = data.filter(
          (newMovie) => !movies.some((existing) => existing.id === newMovie.id)
        )
        setMovies((prev) => [...prev, ...uniqueMovies])
        setCurrentPage((prev) => prev + 1)
      }
    } catch (error) {
      console.error("Erro ao buscar filmes", error)
      toast.error("Erro ao buscar filmes")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const applyFilters = () => {
    setCurrentView("popular")
    fetchMovies(true)
    setShowFilters(false)
  }

  const clearFilters = () => {
    setActiveFilters({ genreId: null, year: null, minRating: null })
    setLoading(true)
    getPopularMovies(1, { genreId: null, year: null, minRating: null }).then(data => {
      setMovies(data)
      setLoading(false)
    })
    setCurrentView("popular")
  }

  useEffect(() => {
    if (currentView === "popular") {
        if(movies.length === 0 || activeFilters.genreId || activeFilters.year || activeFilters.minRating) {
            fetchMovies(true)
        }
    }
  }, [currentView])

  const displayPopularMovies = () => {
    setCurrentView("popular")
    setActiveFilters({ genreId: null, year: null, minRating: null })
    fetchMovies(true)
  }

  const displayFavoriteMovies = async () => {
    setLoading(true)
    setCurrentView("favorites")
    try {
      if (favorites.length === 0) { setMovies([]); return }
      const favoriteMoviesData = await Promise.all(favorites.map((id: number) => getMovieById(id)))
      setMovies(favoriteMoviesData)
    } catch (error) { setMovies([]) } finally { setLoading(false) }
  }

  const displaySeenMovies = async () => {
    setLoading(true)
    setCurrentView("seen")
    try {
      if (seenMovies.length === 0) { setMovies([]); return }
      const seenMoviesData = await Promise.all(seenMovies.map((id: number) => getMovieById(id)))
      setMovies(seenMoviesData)
    } catch (error) { setMovies([]) } finally { setLoading(false) }
  }

  const displayRoulette = () => {
    setCurrentView("roulette")
  }

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true)
      try {
        const { favorites: initialFavorites, seen: initialSeen } = await getSharedLists()
        const initialRatings = await getRatings() 
        setFavorites(initialFavorites)
        setSeenMovies(initialSeen)
        setRatings(initialRatings)

        const sourceList = initialFavorites.length > 0 ? initialFavorites : initialSeen
        if (sourceList.length > 0) {
          const shuffledIds = [...sourceList].sort(() => 0.5 - Math.random())
          const random5Ids = shuffledIds.slice(0, 5)
          const bannerData = await Promise.all(random5Ids.map((id: number) => getMovieById(id)))
          setBannerMovies(bannerData)
        }

        const genresData = await getGenres()
        const filteredGenres = genresData.filter((g) => g.name !== "Música")
        setGenres(filteredGenres)

        await fetchMovies(true)
      } catch (error) {
        console.error("Falha ao carregar dados iniciais:", error)
      } finally {
        setLoading(false)
      }
    }
    loadInitialData()
  }, [])

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

  const handleRateMovie = async (person: "anak" | "silvio", rating: number) => {
    if (!selectedMovie) return
    const newRatings = { ...ratings, [selectedMovie.id]: { ...ratings[selectedMovie.id], [person]: rating } }
    setRatings(newRatings)
    await updateMovieRating(selectedMovie.id, person, rating)
    toast.success(`Nota de ${person} salva!`)
  }

  const handleOpenStats = async () => {
    setShowStats(true)
    if (seenMoviesDetails.length !== seenMovies.length && seenMovies.length > 0) {
       setStatsLoading(true) 
       try {
         const details = await Promise.all(seenMovies.map(id => getMovieDetails(id)))
         setSeenMoviesDetails(details)
       } catch (e) { console.error(e) } finally { setStatsLoading(false) }
    }
  }

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
    setCurrentPage(1)
    try {
      const results = search.trim() ? await searchMovies(search) : await getPopularMovies()
      setMovies(results)
    } catch (error) { setMovies([]) } finally { setLoading(false) }
  }

  const getViewTitle = () => {
    switch (currentView) {
      case "favorites": return "Meus Favoritos"
      case "seen": return "Já Assistidos"
      case "search": return "Resultados da Busca"
      case "roulette": return "Roleta da Sorte"
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

  return (
    <div className="min-h-screen pb-20">
      <Toaster position="bottom-right" theme="dark" />
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-secondary/30 -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent -z-10" />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="flex flex-col items-center w-full mb-12">
          <button onClick={displayPopularMovies} className="cursor-pointer group flex items-center gap-3 mb-8 transition-transform hover:scale-105">
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
              <Film className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-foreground tracking-tight">Dash<span className="text-primary">Movie</span></h1>
          </button>

          <div className="flex flex-col items-center w-full max-w-xl gap-4">
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
                <button onClick={handleSearch} className="cursor-pointer bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95">
                  Buscar
                </button>
              </div>

              <Menu as="div" className="relative">
                <Menu.Button className="cursor-pointer p-3 glass rounded-xl hover:bg-secondary/50 transition-colors">
                  <MenuIcon className="w-5 h-5 text-foreground" />
                </Menu.Button>
                <Transition as={Fragment} enter="transition ease-out duration-200" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-150" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                  <MenuItems className="absolute right-0 mt-2 w-56 glass rounded-xl shadow-xl z-20 focus:outline-none overflow-hidden">
                    <div className="p-2">
                      <MenuItem>
                        {({ active }) => (
                          <button onClick={displayFavoriteMovies} className={`${active ? "bg-secondary/50" : ""} cursor-pointer flex items-center gap-3 w-full px-4 py-3 text-sm text-foreground rounded-lg transition-colors`}>
                            <Heart className="w-4 h-4 text-primary" />
                            Favoritos
                            {favorites.length > 0 && (
                              <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{favorites.length}</span>
                            )}
                          </button>
                        )}
                      </MenuItem>
                      <MenuItem>
                        {({ active }) => (
                          <button onClick={displaySeenMovies} className={`${active ? "bg-secondary/50" : ""} cursor-pointer flex items-center gap-3 w-full px-4 py-3 text-sm text-foreground rounded-lg transition-colors`}>
                            <Eye className="w-4 h-4 text-primary" />
                            Já Assistidos
                            {seenMovies.length > 0 && (
                              <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{seenMovies.length}</span>
                            )}
                          </button>
                        )}
                      </MenuItem>
                      <MenuItem>
                        {({ active }) => (
                          <button onClick={displayRoulette} className={`${active ? "bg-secondary/50" : ""} cursor-pointer flex items-center gap-3 w-full px-4 py-3 text-sm text-foreground rounded-lg transition-colors`}>
                            <Trophy className="w-4 h-4 text-primary" />
                            Roleta
                            {rouletteMovies.length > 0 && (
                              <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{rouletteMovies.length}</span>
                            )}
                          </button>
                        )}
                      </MenuItem>
                    </div>
                  </MenuItems>
                </Transition>
              </Menu>
            </div>
          </div>
        </header>

        {bannerMovies.length > 0 && currentView === "popular" && (
          <HeroCarousel movies={bannerMovies} onSelect={setSelectedMovie} />
        )}

        {/* --- BARRA DE TÍTULO E BOTÃO DE FILTRO --- */}
        <div className="relative flex items-center gap-3 mb-6 z-10">
          {getViewIcon()}
          <h2 className="text-xl font-semibold text-foreground">{getViewTitle()}</h2>
          {currentView !== "roulette" && <span className="text-sm text-muted-foreground">({movies.length} filmes)</span>}

          {currentView === "seen" && (
            <button onClick={handleOpenStats} className="ml-2 p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer group" title="Estatísticas">
              <BarChart2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
          )}

          {currentView === "popular" && (
            <div className="relative ml-2">
                <button 
                    ref={filterBtnRef} // REF DO BOTÃO
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-2 rounded-lg transition-all cursor-pointer group ${
                        showFilters || activeFilters.genreId || activeFilters.year || activeFilters.minRating
                        ? "bg-primary text-primary-foreground" 
                        : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
                    }`}
                    title="Filtros Avançados"
                >
                    <SlidersHorizontal className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </button>

                {/* PAINEL DE FILTROS */}
                {showFilters && (
                    <div ref={filterRef} className="absolute top-full left-0 mt-3 w-72 md:w-96 glass p-5 rounded-2xl shadow-2xl border border-white/10 animate-in slide-in-from-top-2 fade-in duration-200 z-50">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-foreground flex items-center gap-2">
                              <SlidersHorizontal className="w-4 h-4 text-primary" />
                              Filtros
                            </h3>
                            <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 cursor-pointer">
                                <XCircle className="w-3 h-3" /> Limpar
                            </button>
                        </div>

                        <div className="space-y-5">
                            {/* 1. Gêneros */}
                            <div>
                                <label className="text-xs font-medium text-muted-foreground mb-2 block flex items-center gap-1">
                                  <Film className="w-3 h-3" /> Gênero
                                </label>
                                <FilterSelect 
                                  value={activeFilters.genreId}
                                  onChange={(val: any) => setActiveFilters(prev => ({ ...prev, genreId: val }))}
                                  options={genreOptions}
                                  icon={Film}
                                  placeholder="Todos os gêneros"
                                />
                            </div>

                            {/* 2. Ano de Lançamento */}
                            <div>
                                <label className="text-xs font-medium text-muted-foreground mb-2 block flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> Ano de Lançamento
                                </label>
                                <FilterSelect 
                                  value={activeFilters.year}
                                  onChange={(val: any) => setActiveFilters(prev => ({ ...prev, year: val }))}
                                  options={yearOptions}
                                  icon={Calendar}
                                  placeholder="Todos os anos"
                                />
                            </div>

                            {/* 3. Nota Mínima */}
                            <div>
                                <label className="text-xs font-medium text-muted-foreground mb-2 block flex justify-between items-center">
                                    <span className="flex items-center gap-1"><Star className="w-3 h-3" /> Nota Mínima</span>
                                    <span className="text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-md">{activeFilters.minRating || 0}+</span>
                                </label>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="9" 
                                    step="1"
                                    value={activeFilters.minRating || 0}
                                    onChange={(e) => setActiveFilters(prev => ({ ...prev, minRating: Number(e.target.value) || null }))}
                                    className="w-full accent-primary h-2 bg-secondary/50 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
                                    <span>0</span>
                                    <span>5</span>
                                    <span>9</span>
                                </div>
                            </div>

                            {/* BOTÃO APLICAR */}
                            <button 
                                onClick={applyFilters}
                                className="cursor-pointer w-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground py-2.5 rounded-xl font-medium shadow-sm transition-all active:scale-95 mt-2"
                            >
                                Aplicar Filtros
                            </button>
                        </div>
                    </div>
                )}
            </div>
          )}
        </div>

        {/* Grid de Filmes / Roleta */}
        {currentView === "roulette" ? (
          <Roulette movies={rouletteMovies} onSpinEnd={(movie) => setSelectedMovie(movie)} onRemoveMovie={removeFromRoulette} />
        ) : loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 18 }).map((_, i) => (<div key={i} className="aspect-[2/3] rounded-xl bg-card animate-pulse" />))}
          </div>
        ) : movies.length > 0 ? (
          <>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={movies.map((m) => m.id)} strategy={rectSortingStrategy} disabled={currentView !== "favorites"}>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {movies.map((movie, index) => {
                    const isFavorited = favorites.includes(movie.id)
                    if (currentView === "favorites") {
                      return <SortableMovieCard key={movie.id} rank={index + 1} movie={movie} onMarkAsSeen={markAsSeen} onRemoveFromFavorites={removeFromFavorites} onAddToRoulette={addToRoulette} isFavorite={isFavorited} onClick={() => setSelectedMovie(movie)} />
                    }
                    if (currentView === "seen") {
                      return <MovieCard key={movie.id} movie={movie} onRemoveFromSeen={removeFromSeen} isFavorite={isFavorited} onClick={() => setSelectedMovie(movie)} />
                    }
                    return <MovieCard key={movie.id} movie={movie} onFavorite={toggleFavorite} isFavorite={isFavorited} onClick={() => setSelectedMovie(movie)} />
                  })}
                </div>
              </SortableContext>
            </DndContext>

            {(currentView === "popular" || currentView === "search") && (
              <div className="flex justify-center mt-12 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <button onClick={() => fetchMovies(false)} disabled={loadingMore} className="cursor-pointer group flex items-center gap-2 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground px-8 py-3 rounded-2xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none">
                  {loadingMore ? (<><Loader2 className="w-5 h-5 animate-spin" />Carregando...</>) : (<><PlusCircle className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />Ver Mais Filmes</>)}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-6 rounded-full bg-card mb-6"><Film className="w-12 h-12 text-muted-foreground" /></div>
            <p className="text-xl font-medium text-foreground mb-2">Nenhum filme encontrado</p>
            <p className="text-muted-foreground max-w-sm">Tente ajustar seus filtros ou buscar por outro termo.</p>
            {(activeFilters.genreId || activeFilters.year || activeFilters.minRating) && (
                 <button onClick={clearFilters} className="mt-4 text-primary hover:underline cursor-pointer">Limpar Filtros</button>
            )}
          </div>
        )}

        {showStats && (<StatsModal seenMovies={seenMoviesDetails.length > 0 ? seenMoviesDetails : []} ratings={ratings} onClose={() => setShowStats(false)} isLoading={statsLoading} />)}
        {selectedMovie && (<MovieModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} ratings={ratings[selectedMovie.id]} onRate={handleRateMovie} onToggleFavorite={() => toggleFavorite(selectedMovie.id)} isFavorite={favorites.includes(selectedMovie.id)} />)}
      </div>
    </div>
  )
}