import { getMovieImages, getMovieCertification, getMovieDetails } from "@/app/actions/tmdb"

// Dedup: não prefetcha o mesmo filme duas vezes na mesma sessão
const prefetched = new Set<number>()

/**
 * Dispara em background os 3 fetches que o modal faz quando abre.
 * Como Server Actions com `revalidate` cacheiam no Next, o click subsequente
 * pega tudo do cache (latência ~0ms).
 */
export function prefetchMovieDetails(id: number) {
  if (prefetched.has(id)) return
  prefetched.add(id)
  Promise.allSettled([
    getMovieImages(id),
    getMovieCertification(id),
    getMovieDetails(id),
  ])
}
