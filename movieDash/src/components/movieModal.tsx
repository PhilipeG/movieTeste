import { useState, useEffect } from "react";
import { getMovieImages, getMovieCertification, getMovieDetails } from "../services/tmdb";
import type { Movie, MovieDetails, Genre, CastMember, WatchProvider } from "../services/tmdb";

// formata o tempo de duração
function formatRuntime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

// Mapeamento dos streamings para as URLs
const streamingLinkMap: { [key: string]: string } = {
  'Netflix': 'https://www.netflix.com/search?q=',
  'Amazon Prime Video': 'https://www.primevideo.com/search/ref=atv_nb_sr?phrase=',
  'Disney Plus': 'https://www.disneyplus.com/search?q=',
  'Max': 'https://play.max.com/search?q=',
  'Star Plus': 'https://www.starplus.com/search?q=',
  'Apple TV Plus': 'https://tv.apple.com/br/search?term=',
  'Globoplay': 'https://globoplay.globo.com/busca/?q=',
};

interface Props {
  movie: Movie | null;
  onClose: () => void;
}

export default function MovieModal({ movie, onClose }: Props) {
  const [tab, setTab] = useState<"sinopse" | "info" | "galeria">("sinopse");
  const [images, setImages] = useState<string[]>([]);
  const [currentImage, setCurrentImage] = useState(0);
  const [certification, setCertification] = useState<string>("");
  const [details, setDetails] = useState<MovieDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [isPosterLoaded, setIsPosterLoaded] = useState(false);

  // Efeito principal para carregar todos os dados quando o filme muda
  useEffect(() => {
    if (!movie) return;

    // reseta os estados para o novo filme
    setCurrentImage(0);
    setIsPosterLoaded(false);
    setLoadingDetails(true);
    setImages([]);
    setDetails(null);

    async function loadExtraData() {
      try {
        const [imageData, cert, movieDetails] = await Promise.all([
          getMovieImages(movie!.id),
          getMovieCertification(movie!.id),
          getMovieDetails(movie!.id),
        ]);

        const backdrops = imageData.backdrops
          .slice(0, 5)
          .map((img: any) => `https://image.tmdb.org/t/p/w780${img.file_path}`);
        const poster = movie!.poster_path
          ? [`https://image.tmdb.org/t/p/w500${movie!.poster_path}`]
          : [];
        
        setImages([...poster, ...backdrops]);
        setCertification(cert);
        setDetails(movieDetails);

      } catch (error) {
        console.error("Erro ao carregar dados extras do modal:", error);
      } finally {
        setLoadingDetails(false);
      }
    }

    loadExtraData();
  }, [movie]);
  
  // efeito para resetar o skeleton ao navegar na galeria
  useEffect(() => {
    setIsPosterLoaded(false);
  }, [currentImage]);

  if (!movie) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-gradient-to-br from-gray-800 via-gray-900 to-black text-white rounded-xl shadow-2xl max-w-5xl w-[95%] max-h-[85vh] overflow-hidden z-10 border border-gray-700 flex">
        
        <div className="w-1/2 relative flex items-center justify-center bg-black">
          {images.length > 0 ? (
            <>
              {!isPosterLoaded && (
                <div className="w-full h-full bg-gray-700 animate-pulse"></div>
              )}
              <img
                key={images[currentImage]}
                src={images[currentImage]}
                alt={movie.title}
                onLoad={() => setIsPosterLoaded(true)}
                className={`w-full h-full object-contain transition-opacity duration-300 ${isPosterLoaded ? 'opacity-100' : 'opacity-0'}`}
              />
            </>
          ) : (
             <div className="w-full h-full bg-gray-700 animate-pulse"></div>
          )}

          {images.length > 1 && (
            <div className="absolute bottom-4 flex gap-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImage(index)}
                  className={`w-3 h-3 rounded-full ${currentImage === index ? "bg-blue-500" : "bg-gray-500"} cursor-pointer`}
                ></button>
              ))}
            </div>
          )}
        </div>

        <div className="w-1/2 p-6 overflow-y-auto custom-scrollbar">
          <button className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 px-3 py-1 rounded-lg z-10 cursor-pointer" onClick={onClose}>
            ✕
          </button>

          <h2 className="text-3xl font-extrabold bg-gradient-to-r from-gray-200 via-gray-400 to-gray-100 bg-clip-text text-transparent">
            {movie.title}
          </h2>
          
          <p className="text-sm text-gray-400 mt-1 flex items-center gap-3">
            <span>{movie.release_date?.slice(0, 4)}</span>
            <span>•</span>
            <span className="flex items-center gap-1"> 
              ⭐ {movie.vote_average.toFixed(1)}
            </span>
            {certification && (
              <>
                <span>•</span>
                <span className="border border-gray-500 text-gray-300 rounded px-1.5 text-xs font-semibold">
                  {certification}
                </span>
              </>
            )}
          </p>

          <div className="mt-6 flex gap-6 border-b border-gray-700">
            <button onClick={() => setTab("sinopse")} className={`pb-2 ${tab === "sinopse" ? "border-b-2 border-blue-500 text-blue-400" : "text-gray-400"} cursor-pointer`}>Sinopse</button>
            <button onClick={() => setTab("info")} className={`pb-2 ${tab === "info" ? "border-b-2 border-blue-500 text-blue-400" : "text-gray-400"} cursor-pointer`}>Informações</button>
            <button onClick={() => setTab("galeria")} className={`pb-2 ${tab === "galeria" ? "border-b-2 border-blue-500 text-blue-400" : "text-gray-400"} cursor-pointer`}>Galeria</button>
          </div>

          <div className="mt-4 text-gray-300">
            {tab === "sinopse" && <p>{movie.overview || 'Sinopse indisponível.'}</p>}

            {tab === "info" && (
              loadingDetails ? <p>Carregando...</p> : (() => {
                const streamingProviders = details?.['watch/providers']?.results?.BR?.flatrate || [];
                return (
                  <div className="space-y-4">
                    <div>
                      <strong className="text-white">Data de Lançamento:</strong>
                      <p>{details?.release_date ? new Date(details.release_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'N/A'}</p>
                    </div>
                    <div>
                      <strong className="text-white">Duração:</strong>
                      <p>{details?.runtime ? formatRuntime(details.runtime) : 'N/A'}</p>
                    </div>
                    <div>
                      <strong className="text-white">Gênero:</strong>
                      <p>{details?.genres?.map((g: Genre) => g.name).join(', ') || 'N/A'}</p>
                    </div>
                    <div>
                      <strong className="text-white">Elenco Principal:</strong>
                      <p>{details?.credits?.cast?.slice(0, 5).map((c: CastMember) => c.name).join(', ') || 'N/A'}</p>
                    </div>
                    <div>
                      <strong className="text-white">Onde Assistir (Streaming):</strong>
                      {streamingProviders.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {streamingProviders.map((provider: WatchProvider) => {
                            const baseUrl = streamingLinkMap[provider.provider_name];
                            const searchUrl = baseUrl && movie ? `${baseUrl}${encodeURIComponent(movie.title)}` : undefined;
                            if (searchUrl) {
                              return (
                                <a href={searchUrl} key={provider.provider_id} target="_blank" rel="noopener noreferrer">
                                  <img src={`https://image.tmdb.org/t/p/w500${provider.logo_path}`} alt={provider.provider_name} title={provider.provider_name} className="w-10 h-10 rounded-lg transition-transform hover:scale-110" />
                                </a>
                              );
                            }
                            return <img key={provider.provider_id} src={`https://image.tmdb.org/t/p/w500${provider.logo_path}`} alt={provider.provider_name} title={provider.provider_name} className="w-10 h-10 rounded-lg" />;
                          })}
                        </div>
                      ) : <p>Não disponível para streaming.</p>}
                    </div>
                  </div>
                )
              })()
            )}

            {tab === "galeria" && (
              <div className="grid grid-cols-2 gap-2">
                {images.map((img, i) => <img key={i} src={img} className="rounded" />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
