import { useState } from "react";
import type { Movie } from "../services/tmdb";
import styles from "./movieCard.module.css";

interface Props {
  movie: Movie;
  onFavorite?: (id: number) => void;
  onMarkAsSeen?: (id: number) => void;
  onRemoveFromFavorites?: (id: number) => void;
  onRemoveFromSeen?: (id: number) => void;
  isFavorite: boolean;
  onClick: () => void;
  rank?: number;
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
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  return (
    // 1. O contêiner principal agora define a proporção do pôster (2:3)
    <div
      className={`${styles.card} relative group w-full aspect-[2/3] rounded-lg overflow-hidden shadow-lg border border-gray-800 hover:border-red-700`}
      onClick={onClick}
    >
      {/* Skeleton de carregamento */}
      {!isImageLoaded && (
        <div className="absolute inset-0 w-full h-full bg-gray-700 animate-pulse"></div>
      )}

      {/* 2. A imagem agora preenche todo o card e fica no fundo */}
      {movie.poster_path ? (
        <img
          src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
          alt={movie.title}
          onLoad={() => setIsImageLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-500 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
      ) : (
        // Fallback para filmes sem pôster
        <div className="h-full w-full flex items-center justify-center text-center bg-gray-900 p-4">
          <h3 className="text-gray-300 font-bold text-lg">{movie.title}</h3>
        </div>
      )}

      {/* 3. Overlay com gradiente para o conteúdo, posicionado sobre a imagem */}
      <div className="absolute inset-0 w-full h-full bg-gradient-to-t from-black via-black/50 to-transparent flex flex-col justify-end p-4">
        <div>
          <h2 className="text-white text-base font-bold drop-shadow-lg">{movie.title}</h2>
          <div className="min-h-[28px] mt-2">
            {onMarkAsSeen && (
              <button
                onClick={(e) => { e.stopPropagation(); onMarkAsSeen(movie.id); }}
                className="px-2 py-1 w-full text-xs rounded bg-blue-600/80 hover:bg-blue-700 backdrop-blur-sm text-white cursor-pointer"
              >
                ✓ Marcar como visto
              </button>
            )}
            {onFavorite && (
              <button
                onClick={(e) => { e.stopPropagation(); onFavorite(movie.id); }}
                className={`px-2 py-1 w-full text-xs rounded ${isFavorite ? "bg-red-500/80 hover:bg-red-600" : "bg-gray-600/80 hover:bg-gray-700"} backdrop-blur-sm cursor-pointer`}
              >
                {isFavorite ? "★ Favorito" : "☆ Favoritar"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Botões de Rank e Remover continuam no topo */}
      {onRemoveFromFavorites && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemoveFromFavorites(movie.id); }}
          className="absolute top-2 right-2 z-20 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-red-600"
          title="Remover dos Favoritos"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      )}
      {onRemoveFromSeen && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemoveFromSeen(movie.id); }}
          className="absolute top-2 right-2 z-20 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-red-600"
          title="Remover dos Vistos"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      )}
      {rank && (
        <div className="absolute top-0 left-0 bg-black/70 text-red-600 text-lg font-bold w-8 h-8 flex items-center justify-center rounded-br-lg z-10">
          {rank}
        </div>
      )}
    </div>
  );
}
