"use client"

import { useEffect, useState, useRef, useMemo, Fragment } from "react"
import dynamic from "next/dynamic"
import { Menu, MenuButton, MenuItems, MenuItem, Transition } from "@headlessui/react"
import {
  getPopularMovies,
  searchMovies,
  getGenres,
  getMovieById,
  getMovieDetails,
} from "@/app/actions/tmdb"
import type { Movie, Genre, MovieDetails } from "@/lib/tmdb"
import { loadByIds } from "@/lib/movies-loader"
import { useSharedLists } from "@/hooks/use-shared-lists"
import { useSavedView } from "@/hooks/use-saved-view"
import MovieCard from "@/components/movie-card"
import MovieModal from "@/components/movie-modal"
import StatsModal from "@/components/stats-modal"
import { SortableMovieCard } from "@/components/sortable-movie-card"
import HeroCarousel from "@/components/hero-carousel"
import { FilterSelect } from "@/components/filter-select"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { arrayMove, SortableContext, rectSortingStrategy } from "@dnd-kit/sortable"
import {
  Search,
  MenuIcon,
  Film,
  Heart,
  Eye,
  Sparkles,
  Trophy,
  BarChart2,
  PlusCircle,
  Loader2,
  SlidersHorizontal,
  XCircle,
  Calendar,
  Star,
} from "lucide-react"
import { Toaster, toast } from "sonner"

const Roulette = dynamic(() => import("@/components/roulette"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  ),
})

const INITIAL_CHUNK = 36
const VISIBLE_PAGE = 18

type Filters = { genreId: string | null; year: string | null; minRating: number | null }
const EMPTY_FILTERS: Filters = { genreId: null, year: null, minRating: null }

export default function Home() {
  // --- Estado compartilhado (Firestore + localStorage) ---
  const shared = useSharedLists()
  const { view: currentView, setView: setCurrentView, hydrated: viewHydrated } = useSavedView()

  // --- Estado local ---
  const [movies, setMovies] = useState<Movie[]>([])
  const [search, setSearch] = useState("")
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const [loading, setLoading] = useState(true)
  const [genres, setGenres] = useState<Genre[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Filters>(EMPTY_FILTERS)
  const [rouletteMovies, setRouletteMovies] = useState<Movie[]>([])
  const [bannerMovies, setBannerMovies] = useState<Movie[]>([])
  const [visibleItemsCount, setVisibleItemsCount] = useState(VISIBLE_PAGE)
  const [showStats, setShowStats] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [seenMoviesDetails, setSeenMoviesDetails] = useState<MovieDetails[]>([])

  const filterRef = useRef<HTMLDivElement>(null)
  const filterBtnRef = useRef<HTMLButtonElement>(null)
  const initialViewLoaded = useRef(false)
  const bannerLoaded = useRef(false)
  // Token de geração: invalida carregamentos assíncronos obsoletos (race condition)
  const loadTokenRef = useRef(0)
  // Snapshots de shared.favorites/seen para diff entre eventos do Firestore
  const prevFavoritesRef = useRef<number[]>([])
  const prevSeenRef = useRef<number[]>([])

  // --- Click outside para fechar popover de filtros ---
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
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showFilters])

  // --- Carrega gêneros uma vez ---
  useEffect(() => {
    getGenres()
      .then((data) => setGenres(data.filter((g) => g.name !== "Música")))
      .catch(console.error)
  }, [])

  // --- Hidrata rouletteMovies a partir de IDs ---
  useEffect(() => {
    if (shared.rouletteIds.length === 0) {
      setRouletteMovies([])
      return
    }
    loadByIds(shared.rouletteIds, getMovieById).then(setRouletteMovies)
  }, [shared.rouletteIds])

  // --- Banner: carrega 5 aleatórios UMA VEZ (não re-embaralha a cada snapshot) ---
  useEffect(() => {
    if (bannerLoaded.current || !shared.loaded) return
    const sourceList = shared.favorites.length > 0 ? shared.favorites : shared.seen
    if (sourceList.length === 0) return
    bannerLoaded.current = true
    const shuffled = [...sourceList].sort(() => 0.5 - Math.random())
    loadByIds(shuffled.slice(0, 5), getMovieById).then(setBannerMovies)
  }, [shared.loaded, shared.favorites, shared.seen])

  // --- Helpers de carregamento ---
  const loadProgressive = async (ids: number[]) => {
    const token = ++loadTokenRef.current
    setVisibleItemsCount(VISIBLE_PAGE)
    if (ids.length === 0) {
      setMovies([])
      setLoading(false)
      return
    }
    setLoading(true)
    const initial = await loadByIds(ids.slice(0, INITIAL_CHUNK), getMovieById)
    if (token !== loadTokenRef.current) return // carregamento obsoleto — descarta
    setMovies(initial)
    setLoading(false)
    if (ids.length > INITIAL_CHUNK) {
      // Anexa o resto em blocos, conforme cada bloco fica pronto —
      // assim o "Ver mais" tem dados disponíveis muito antes.
      loadByIds(ids.slice(INITIAL_CHUNK), getMovieById, {
        onBatch: (batch) => {
          if (token !== loadTokenRef.current) return // background obsoleto — descarta
          setMovies((prev) => [...prev, ...batch])
        },
      }).catch(console.error)
    }
  }

  const fetchMovies = async (resetPage = true, filtersOverride?: Filters) => {
    const filters = filtersOverride ?? activeFilters
    // resetPage = novo carregamento → bump do token. Paginação = continua o atual.
    const token = resetPage ? ++loadTokenRef.current : loadTokenRef.current
    if (resetPage) {
      setLoading(true)
      setLoadingMore(false)
      setCurrentPage(1)
    } else {
      setLoadingMore(true)
    }
    try {
      const data = await getPopularMovies(resetPage ? 1 : currentPage + 1, filters)
      if (token !== loadTokenRef.current) return // carregamento obsoleto — descarta
      if (resetPage) {
        setMovies(data)
      } else {
        const uniqueMovies = data.filter(
          (newMovie) => !movies.some((existing) => existing.id === newMovie.id),
        )
        setMovies((prev) => [...prev, ...uniqueMovies])
        setCurrentPage((prev) => prev + 1)
      }
    } catch {
      if (token === loadTokenRef.current) toast.error("Erro ao buscar filmes")
    } finally {
      if (token === loadTokenRef.current) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }

  // --- Carrega a view inicial salva (F5) — uma única vez.
  // Para "popular", não espera Firestore (fetch TMDB pode rodar em paralelo).
  // Para "favorites"/"seen", espera Firestore porque precisa dos IDs. ---
  useEffect(() => {
    if (initialViewLoaded.current) return
    if (!viewHydrated) return

    if (currentView === "popular") {
      initialViewLoaded.current = true
      void fetchMovies(true)
      return
    }

    if (currentView === "favorites" || currentView === "seen") {
      if (!shared.loaded) return
      initialViewLoaded.current = true
      // Prime snapshots para o sync effect rodar sem refetch duplicado
      prevFavoritesRef.current = shared.favorites
      prevSeenRef.current = shared.seen
      const ids = currentView === "favorites" ? shared.favorites : shared.seen
      void loadProgressive(ids)
    }
    // 'search' e 'roulette' não precisam de carregamento inicial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shared.loaded, viewHydrated, currentView])

  // --- Sync cross-device: diff entre snapshots do Firestore.
  // IDs novos → fetch do TMDB e adiciona. IDs sumidos → filtra. Reordena. ---
  useEffect(() => {
    if (currentView !== "favorites" && currentView !== "seen") return
    const sourceIds = currentView === "favorites" ? shared.favorites : shared.seen
    const prevSource =
      currentView === "favorites" ? prevFavoritesRef.current : prevSeenRef.current

    const prevSet = new Set(prevSource)
    const addedIds = sourceIds.filter((id) => !prevSet.has(id))

    if (currentView === "favorites") prevFavoritesRef.current = sourceIds
    else prevSeenRef.current = sourceIds

    // Filter + reorder usando o cache local de Movies
    setMovies((prev) => {
      const map = new Map(prev.map((m) => [m.id, m]))
      const reordered = sourceIds
        .map((id) => map.get(id))
        .filter((m): m is Movie => m !== undefined)
      const orderChanged =
        reordered.length !== prev.length ||
        reordered.some((m, i) => m.id !== prev[i].id)
      return orderChanged ? reordered : prev
    })

    if (addedIds.length === 0) return

    let cancelled = false
    loadByIds(addedIds, getMovieById).then((newMovies) => {
      if (cancelled) return
      setMovies((prev) => {
        const byId = new Map([...prev, ...newMovies].map((m) => [m.id, m]))
        return sourceIds
          .map((id) => byId.get(id))
          .filter((m): m is Movie => m !== undefined)
      })
    })
    return () => {
      cancelled = true
    }
  }, [shared.favorites, shared.seen, currentView])

  // --- View switchers ---
  const displayPopularMovies = () => {
    setCurrentView("popular")
    setActiveFilters(EMPTY_FILTERS)
    void fetchMovies(true, EMPTY_FILTERS)
  }

  const displayFavoriteMovies = () => {
    setCurrentView("favorites")
    prevFavoritesRef.current = shared.favorites
    void loadProgressive(shared.favorites)
  }

  const displaySeenMovies = () => {
    setCurrentView("seen")
    prevSeenRef.current = shared.seen
    void loadProgressive(shared.seen)
  }

  const displayRoulette = () => setCurrentView("roulette")

  // --- Filtros ---
  const applyFilters = () => {
    setCurrentView("popular")
    void fetchMovies(true)
    setShowFilters(false)
  }

  const clearFilters = () => {
    setActiveFilters(EMPTY_FILTERS)
    setCurrentView("popular")
    void fetchMovies(true, EMPTY_FILTERS)
  }

  // --- Mutações de listas compartilhadas ---
  const markAsSeen = (movieId: number) => {
    shared.updateFavorites(shared.favorites.filter((id) => id !== movieId))
    shared.updateSeen([...new Set([...shared.seen, movieId])])
    setMovies((prev) => prev.filter((m) => m.id !== movieId))
    toast.success("Filme marcado como visto")
  }

  const removeFromFavorites = (movieId: number) => {
    shared.updateFavorites(shared.favorites.filter((id) => id !== movieId))
    setMovies((prev) => prev.filter((m) => m.id !== movieId))
    toast.success("Filme removido dos favoritos")
  }

  const removeFromSeen = (movieId: number) => {
    shared.updateSeen(shared.seen.filter((id) => id !== movieId))
    setMovies((prev) => prev.filter((m) => m.id !== movieId))
    toast.success("Filme removido dos vistos")
  }

  const toggleFavorite = (id: number) => {
    const isFavorited = shared.favorites.includes(id)
    shared.updateFavorites(
      isFavorited
        ? shared.favorites.filter((favId) => favId !== id)
        : [...shared.favorites, id],
    )
  }

  const addToRoulette = (movie: Movie) => {
    if (rouletteMovies.some((m) => m.id === movie.id)) {
      toast.error("Filme já está na roleta!")
      return
    }
    shared.updateRoulette([...rouletteMovies.map((m) => m.id), movie.id])
    toast.success("Adicionado à roleta!")
  }

  const removeFromRoulette = (id: number) => {
    shared.updateRoulette(rouletteMovies.filter((m) => m.id !== id).map((m) => m.id))
  }

  const handleRateMovie = async (person: "anak" | "silvio", rating: number) => {
    if (!selectedMovie) return
    try {
      await shared.updateRating(selectedMovie.id, person, rating)
      toast.success(`Nota de ${person} salva!`)
    } catch {
      toast.error(`Erro ao salvar nota de ${person}`)
    }
  }

  const handleOpenStats = async () => {
    setShowStats(true)
    if (seenMoviesDetails.length !== shared.seen.length && shared.seen.length > 0) {
      setStatsLoading(true)
      try {
        const details = await loadByIds(shared.seen, getMovieDetails)
        setSeenMoviesDetails(details)
      } finally {
        setStatsLoading(false)
      }
    }
  }

  // --- Drag and drop (apenas favoritos) ---
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!active || !over || active.id === over.id) return
    if (currentView !== "favorites" && currentView !== "seen") return

    // Fonte da verdade: shared.* (lista COMPLETA do Firestore).
    // Nunca operar com `movies` (cache parcial) para evitar truncar a lista.
    const currentIds = currentView === "favorites" ? shared.favorites : shared.seen
    const oldIdx = currentIds.findIndex((id) => id === active.id)
    const newIdx = currentIds.findIndex((id) => id === over.id)
    if (oldIdx === -1 || newIdx === -1) return

    const newIds = arrayMove(currentIds, oldIdx, newIdx)

    // Guard: se a ordem já corresponde ao Firestore, não escreve nada.
    const sameAsRemote =
      newIds.length === currentIds.length && newIds.every((id, i) => id === currentIds[i])
    if (sameAsRemote) return

    // Update otimista no cache local — apenas para os items que estão carregados
    setMovies((prev) => {
      const ov = prev.findIndex((m) => m.id === active.id)
      const nv = prev.findIndex((m) => m.id === over.id)
      if (ov === -1 || nv === -1) return prev
      return arrayMove(prev, ov, nv)
    })

    if (currentView === "favorites") shared.updateFavorites(newIds)
    else shared.updateSeen(newIds)
  }

  const handleSearch = async () => {
    const token = ++loadTokenRef.current
    setLoading(true)
    setCurrentView("search")
    setCurrentPage(1)
    try {
      const results = search.trim() ? await searchMovies(search) : await getPopularMovies()
      if (token !== loadTokenRef.current) return // carregamento obsoleto — descarta
      setMovies(results)
    } catch {
      if (token === loadTokenRef.current) setMovies([])
    } finally {
      if (token === loadTokenRef.current) setLoading(false)
    }
  }

  const getViewTitle = () => {
    switch (currentView) {
      case "favorites":
        return "Meus Favoritos"
      case "seen":
        return "Já Assistidos"
      case "search":
        return "Resultados da Busca"
      case "roulette":
        return "Roleta da Sorte"
      default:
        return "Em Alta"
    }
  }

  const getViewIcon = () => {
    switch (currentView) {
      case "favorites":
        return <Heart className="w-5 h-5 text-primary" />
      case "seen":
        return <Eye className="w-5 h-5 text-primary" />
      case "roulette":
        return <Trophy className="w-5 h-5 text-primary" />
      default:
        return <Sparkles className="w-5 h-5 text-primary" suppressHydrationWarning />
    }
  }

  // Items estáveis para o SortableContext — evita re-render do dnd-kit
  const movieIds = useMemo(() => movies.map((m) => m.id), [movies])

  const genreOptions = genres.map((g) => ({ value: g.id.toString(), label: g.name }))
  const yearOptions = Array.from({ length: 50 }, (_, i) => {
    const year = new Date().getFullYear() - i
    return { value: year.toString(), label: year.toString() }
  })

  return (
    <div className="min-h-screen pb-20" suppressHydrationWarning>
      <Toaster position="bottom-right" theme="dark" />
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-secondary/30 -z-10" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent -z-10" />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="flex flex-col items-center w-full mb-12">
          <button
            onClick={displayPopularMovies}
            className="cursor-pointer group flex items-center gap-3 mb-8 transition-transform hover:scale-105"
          >
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
              <Film className="w-8 h-8 text-primary" suppressHydrationWarning />
            </div>
            <h1 className="text-4xl font-bold text-foreground tracking-tight">
              Dash<span className="text-primary">Movie</span>
            </h1>
          </button>

          <div className="flex flex-col items-center w-full max-w-xl gap-4">
            <div className="relative flex items-center gap-3 w-full">
              <div className="flex-grow flex items-center gap-3 px-4 py-3 glass rounded-2xl focus-within:ring-2 focus-within:ring-primary/50 transition-all">
                <Search className="w-5 h-5 text-muted-foreground" suppressHydrationWarning />
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
                <MenuButton className="cursor-pointer p-3 glass rounded-xl hover:bg-secondary/50 transition-colors">
                  <MenuIcon className="w-5 h-5 text-foreground" suppressHydrationWarning />
                </MenuButton>
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
                        <button
                          onClick={displayFavoriteMovies}
                          className="cursor-pointer flex items-center gap-3 w-full px-4 py-3 text-sm text-foreground rounded-lg transition-colors data-[focus]:bg-secondary/50"
                        >
                          <Heart className="w-4 h-4 text-primary" />
                          Favoritos
                          {shared.favorites.length > 0 && (
                            <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                              {shared.favorites.length}
                            </span>
                          )}
                        </button>
                      </MenuItem>
                      <MenuItem>
                        <button
                          onClick={displaySeenMovies}
                          className="cursor-pointer flex items-center gap-3 w-full px-4 py-3 text-sm text-foreground rounded-lg transition-colors data-[focus]:bg-secondary/50"
                        >
                          <Eye className="w-4 h-4 text-primary" />
                          Já Assistidos
                          {shared.seen.length > 0 && (
                            <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                              {shared.seen.length}
                            </span>
                          )}
                        </button>
                      </MenuItem>
                      <MenuItem>
                        <button
                          onClick={displayRoulette}
                          className="cursor-pointer flex items-center gap-3 w-full px-4 py-3 text-sm text-foreground rounded-lg transition-colors data-[focus]:bg-secondary/50"
                        >
                          <Trophy className="w-4 h-4 text-primary" />
                          Roleta
                          {rouletteMovies.length > 0 && (
                            <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                              {rouletteMovies.length}
                            </span>
                          )}
                        </button>
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

        <div className="relative flex items-center gap-3 mb-6 z-10">
          {getViewIcon()}
          <h2 className="text-xl font-semibold text-foreground">{getViewTitle()}</h2>
          {currentView !== "roulette" && (
            <span className="text-sm text-muted-foreground">({movies.length} filmes)</span>
          )}
          {currentView === "seen" && (
            <button
              onClick={handleOpenStats}
              className="ml-2 p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer group"
              title="Estatísticas"
            >
              <BarChart2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
          )}

          {currentView === "popular" && (
            <div className="relative ml-2">
              <button
                ref={filterBtnRef}
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg transition-all cursor-pointer group ${
                  showFilters || activeFilters.genreId || activeFilters.year || activeFilters.minRating
                    ? "bg-primary text-primary-foreground"
                    : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
                }`}
                title="Filtros Avançados"
              >
                <SlidersHorizontal
                  className="w-4 h-4 group-hover:scale-110 transition-transform"
                  suppressHydrationWarning
                />
              </button>
              {showFilters && (
                <div
                  ref={filterRef}
                  className="absolute top-full left-0 mt-3 w-72 md:w-96 glass p-5 rounded-2xl shadow-2xl border border-white/10 animate-in slide-in-from-top-2 fade-in duration-200 z-50"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-primary" />
                      Filtros
                    </h3>
                    <button
                      onClick={clearFilters}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <XCircle className="w-3 h-3" /> Limpar
                    </button>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-2 block flex items-center gap-1">
                        <Film className="w-3 h-3" /> Gênero
                      </label>
                      <FilterSelect
                        value={activeFilters.genreId}
                        onChange={(val) => setActiveFilters((prev) => ({ ...prev, genreId: val }))}
                        options={genreOptions}
                        icon={Film}
                        placeholder="Todos os gêneros"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-2 block flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Ano de Lançamento
                      </label>
                      <FilterSelect
                        value={activeFilters.year}
                        onChange={(val) => setActiveFilters((prev) => ({ ...prev, year: val }))}
                        options={yearOptions}
                        icon={Calendar}
                        placeholder="Todos os anos"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-2 block flex justify-between items-center">
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3" /> Nota Mínima
                        </span>
                        <span className="text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-md">
                          {activeFilters.minRating || 0}+
                        </span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="9"
                        step="1"
                        value={activeFilters.minRating || 0}
                        onChange={(e) =>
                          setActiveFilters((prev) => ({
                            ...prev,
                            minRating: Number(e.target.value) || null,
                          }))
                        }
                        className="w-full accent-primary h-2 bg-secondary/50 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
                        <span>0</span>
                        <span>5</span>
                        <span>9</span>
                      </div>
                    </div>
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
          <>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={movieIds}
                strategy={rectSortingStrategy}
                disabled={currentView !== "favorites" && currentView !== "seen"}
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {movies
                    .slice(
                      0,
                      currentView === "favorites" || currentView === "seen"
                        ? visibleItemsCount
                        : movies.length,
                    )
                    .map((movie, index) => {
                      const isFavorited = shared.favorites.includes(movie.id)
                      if (currentView === "favorites")
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
                      if (currentView === "seen")
                        return (
                          <SortableMovieCard
                            key={movie.id}
                            movie={movie}
                            onRemoveFromSeen={removeFromSeen}
                            isFavorite={isFavorited}
                            onClick={() => setSelectedMovie(movie)}
                            ratings={shared.ratings[movie.id]}
                          />
                        )
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

            {(currentView === "favorites" || currentView === "seen") &&
              visibleItemsCount < movies.length && (
                <div className="flex justify-center mt-12 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <button
                    onClick={() => setVisibleItemsCount((prev) => prev + VISIBLE_PAGE)}
                    className="cursor-pointer group flex items-center gap-2 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground px-8 py-3 rounded-2xl font-medium transition-all active:scale-95"
                  >
                    <PlusCircle className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                    Ver Mais Filmes
                  </button>
                </div>
              )}

            {(currentView === "popular" || currentView === "search") && (
              <div className="flex justify-center mt-12 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <button
                  onClick={() => fetchMovies(false)}
                  disabled={loadingMore}
                  className="cursor-pointer group flex items-center gap-2 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground px-8 py-3 rounded-2xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                      Ver Mais Filmes
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-6 rounded-full bg-card mb-6">
              <Film className="w-12 h-12 text-muted-foreground" />
            </div>
            <p className="text-xl font-medium text-foreground mb-2">Nenhum filme encontrado</p>
            <p className="text-muted-foreground max-w-sm">
              Tente ajustar seus filtros ou buscar por outro termo.
            </p>
            {(activeFilters.genreId || activeFilters.year || activeFilters.minRating) && (
              <button onClick={clearFilters} className="mt-4 text-primary hover:underline cursor-pointer">
                Limpar Filtros
              </button>
            )}
          </div>
        )}

        {showStats && (
          <StatsModal
            seenMovies={seenMoviesDetails.length > 0 ? seenMoviesDetails : []}
            ratings={shared.ratings}
            onClose={() => setShowStats(false)}
            isLoading={statsLoading}
          />
        )}
        {selectedMovie && (
          <MovieModal
            movie={selectedMovie}
            onClose={() => setSelectedMovie(null)}
            ratings={shared.ratings[selectedMovie.id]}
            onRate={handleRateMovie}
            onToggleFavorite={() => toggleFavorite(selectedMovie.id)}
            isFavorite={shared.favorites.includes(selectedMovie.id)}
          />
        )}
      </div>
    </div>
  )
}
