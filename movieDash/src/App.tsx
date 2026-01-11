import { useEffect, useState, Fragment } from "react";
import { Menu, Transition, MenuItems, MenuItem } from '@headlessui/react';
import { getPopularMovies, searchMovies, getGenres, getMovieById } from "./services/tmdb";
import { getSharedLists, updateFavoritesList, updateSeenList } from "./services/firebase";
import type { Movie, Genre } from "./services/tmdb";
import MovieCard from "./components/moviecard";
import MovieModal from "./components/movieModal";
import { SortableMovieCard } from "./components/SortableMovieCard";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';

function App() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [search, setSearch] = useState("");
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [genres, setGenres] = useState<Genre[]>([]);
  
  const [favorites, setFavorites] = useState<number[]>([]);
  const [seenMovies, setSeenMovies] = useState<number[]>([]);
  const [currentView, setCurrentView] = useState(() => localStorage.getItem('dashmovie-view') || 'popular');

  useEffect(() => {
    localStorage.setItem('dashmovie-view', currentView);
  }, [currentView]);

  const displayPopularMovies = async () => {
    setLoading(true);
    setCurrentView('popular');
    try {
      const movieData = await getPopularMovies();
      setMovies(movieData);
    } catch (error) { console.error("Falha ao carregar filmes populares:", error); setMovies([]); }
    finally { setLoading(false); }
  };

  const displayFavoriteMovies = async () => {
    setLoading(true);
    setCurrentView('favorites');
    try {
      if (favorites.length === 0) { setMovies([]); return; }
      const favoriteMoviesData = await Promise.all(favorites.map((id: number) => getMovieById(id)));
      setMovies(favoriteMoviesData);
    } catch (error) { console.error("Falha ao carregar filmes favoritos:", error); setMovies([]); }
    finally { setLoading(false); }
  };

  const displaySeenMovies = async () => {
    setLoading(true);
    setCurrentView('seen');
    try {
      if (seenMovies.length === 0) { setMovies([]); return; }
      const seenMoviesData = await Promise.all(seenMovies.map((id: number) => getMovieById(id)));
      setMovies(seenMoviesData);
    } catch (error) { console.error("Falha ao carregar filmes vistos:", error); setMovies([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    async function loadInitialData() {
      setLoading(true);
      try {
        const { favorites: initialFavorites, seen: initialSeen } = await getSharedLists();
        setFavorites(initialFavorites);
        setSeenMovies(initialSeen);

        await getGenres().then(setGenres);
        
        const savedView = localStorage.getItem('dashmovie-view') || 'popular';
        if (savedView === 'favorites') {
          // Re-busca os filmes favoritos com base nos dados do Firebase
          if (initialFavorites.length > 0) {
            const favoriteMoviesData = await Promise.all(initialFavorites.map((id: number) => getMovieById(id)));
            setMovies(favoriteMoviesData);
          } else {
            setMovies([]);
          }
        } else if (savedView === 'seen') {
            if (initialSeen.length > 0) {
              const seenMoviesData = await Promise.all(initialSeen.map((id: number) => getMovieById(id)));
              setMovies(seenMoviesData);
            } else {
              setMovies([]);
            }
        } else {
          await displayPopularMovies();
        }
      } catch (error) { 
        console.error("Falha ao carregar dados iniciais:", error);
      } finally { 
        setLoading(false); 
      }
    }
    loadInitialData();
  }, []);

  const markAsSeen = (movieId: number) => {
    const newFavorites = favorites.filter(id => id !== movieId);
    const newSeen = [...new Set([...seenMovies, movieId])];
    setFavorites(newFavorites);
    setSeenMovies(newSeen);
    setMovies(current => current.filter(movie => movie.id !== movieId));
    updateFavoritesList(newFavorites);
    updateSeenList(newSeen);
  };

  const removeFromFavorites = (movieId: number) => {
    const newFavorites = favorites.filter(id => id !== movieId);
    setFavorites(newFavorites);
    setMovies(current => current.filter(movie => movie.id !== movieId));
    updateFavoritesList(newFavorites);
  };

  const removeFromSeen = (movieId: number) => {
    const newSeen = seenMovies.filter(id => id !== movieId);
    setSeenMovies(newSeen);
    setMovies(current => current.filter(movie => movie.id !== movieId));
    updateSeenList(newSeen);
  };
  
  const toggleFavorite = (id: number) => {
    const isFavorited = favorites.includes(id);
    const newFavorites = isFavorited ? favorites.filter(favId => favId !== id) : [...favorites, id];
    setFavorites(newFavorites);
    updateFavoritesList(newFavorites);
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 10 } }));
  
  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setMovies((currentMovies) => {
        const oldIndex = currentMovies.findIndex((item) => item.id === active.id);
        const newIndex = currentMovies.findIndex((item) => item.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return currentMovies;
        const newOrder = arrayMove(currentMovies, oldIndex, newIndex);
        const newFavoriteIds = newOrder.map(movie => movie.id);
        setFavorites(newFavoriteIds);
        updateFavoritesList(newFavoriteIds);
        return newOrder;
      });
    }
  }
  
  const handleSearch = async () => {
    setLoading(true);
    setCurrentView('search');
    try {
      const results = search.trim() ? await searchMovies(search) : await getPopularMovies();
      setMovies(results);
    } catch (error) {
      console.error("Falha ao buscar filmes:", error);
      setMovies([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-white p-6 bg-black bg-gradient-to-b from-black to-red-950">
      <header className="flex flex-col items-center w-full mb-12">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent cursor-pointer" onClick={displayPopularMovies}>
          🎬 DashMovie
        </h1>
        <div className="relative flex items-center gap-4 w-full max-w-lg">
          <div className="flex-grow flex items-center gap-2 p-2 border-2 border-gray-700 rounded-lg focus-within:border-transparent focus-within:ring-2 focus-within:ring-red-600 transition-all duration-300">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Buscar filmes..."
              className="bg-transparent border-none text-white placeholder-gray-500 w-full focus:ring-0 focus:outline-none"
            />
            <button onClick={handleSearch} className="bg-red-600 hover:bg-red-700 px-4 py-1 rounded cursor-pointer">
              Buscar
            </button>
          </div>
          <Menu as="div" className="relative">
            <Menu.Button className="p-2 border-2 border-gray-700 rounded-lg hover:border-red-600 transition-colors cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </Menu.Button>
            <Transition as={Fragment} enter="transition ease-out duration-200" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-150" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
              <MenuItems className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-20 focus:outline-none">
                <MenuItem>
                  {({ active }) => (<button onClick={displayFavoriteMovies} className={`${active ? 'bg-gray-700' : ''} block w-full text-left px-4 py-2 text-sm text-gray-300 rounded-t-lg cursor-pointer`}>Favoritos</button>)}
                </MenuItem>
                <MenuItem>
                  {({ active }) => (<button onClick={displaySeenMovies} className={`${active ? 'bg-gray-700' : ''} block w-full text-left px-4 py-2 text-sm text-gray-300 cursor-pointer`}>Vistos</button>)}
                </MenuItem>
                <MenuItem>
                  <a href="#" className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">Lançamentos 2025</a>
                </MenuItem>
                <div className="relative group">
                  <span className="flex justify-between items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-b-lg cursor-pointer">
                    Gêneros
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </span>
                  <div className="absolute left-full top-0 mt-[-1px] w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 custom-scrollbar">
                    {genres.map(genre => (
                      <MenuItem key={genre.id}>
                        <a href="#" className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">{genre.name}</a>
                      </MenuItem>
                    ))}
                  </div>
                </div>
              </MenuItems>
            </Transition>
          </Menu>
        </div>
      </header>
      
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
          {Array.from({ length: 18 }).map((_, i) => <div key={i} className="bg-gray-800 animate-pulse h-72 rounded-lg"></div>)}
        </div>
      ) : movies.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={movies.map(m => m.id)} strategy={rectSortingStrategy} disabled={currentView !== 'favorites'}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-8">
              {movies.map((movie, index) => {
                const isFavorited = favorites.includes(movie.id);
                if (currentView === 'favorites') {
                  return <SortableMovieCard key={movie.id} rank={index + 1} movie={movie} onMarkAsSeen={markAsSeen} onRemoveFromFavorites={removeFromFavorites} isFavorite={isFavorited} onClick={() => setSelectedMovie(movie)} />;
                }
                if (currentView === 'seen') {
                  return <MovieCard key={movie.id} movie={movie} onRemoveFromSeen={removeFromSeen} isFavorite={isFavorited} onClick={() => setSelectedMovie(movie)} />;
                }
                return <MovieCard key={movie.id} movie={movie} onFavorite={toggleFavorite} isFavorite={isFavorited} onClick={() => setSelectedMovie(movie)} />;
              })}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="text-center text-gray-400 mt-10">
          <p className="text-xl">Nenhum filme encontrado.</p>
          {currentView === 'favorites' && <p>Adicione filmes à sua lista de favoritos para vê-los aqui.</p>}
          {currentView === 'seen' && <p>Marque filmes como vistos para que eles apareçam nesta lista.</p>}
        </div>
      )}

      {selectedMovie && <MovieModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />}
    </div>
  );
}

export default App;
