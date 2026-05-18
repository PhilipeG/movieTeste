"use server"

import type { Movie, Genre, MovieDetails } from "@/lib/tmdb"

const API_KEY = process.env.TMDB_API_KEY
const BASE_URL = "https://api.themoviedb.org/3"

// Tempos de cache (segundos)
const ONE_HOUR = 3600
const ONE_DAY = 86400
const ONE_WEEK = 604800

async function fetchTMDB<T>(
  endpoint: string,
  params: Record<string, string> = {},
  revalidate?: number,
): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`)
  url.searchParams.append("api_key", API_KEY || "")
  url.searchParams.append("language", "pt-BR")

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value)
  })

  const res = await fetch(
    url.toString(),
    revalidate !== undefined ? { next: { revalidate } } : { cache: "no-store" },
  )
  if (!res.ok) throw new Error(`TMDB API error: ${res.status}`)
  return res.json()
}

export async function getMovieById(id: number): Promise<Movie> {
  return fetchTMDB<Movie>(`/movie/${id}`, {}, ONE_DAY)
}

export async function getGenres(): Promise<Genre[]> {
  const data = await fetchTMDB<{ genres: Genre[] }>("/genre/movie/list", {}, ONE_WEEK)
  return data.genres
}

export async function getMovieImages(id: number) {
  return fetchTMDB<{ backdrops: { file_path: string }[] }>(
    `/movie/${id}/images`,
    {},
    ONE_DAY,
  )
}

export async function getMovieDetails(id: number): Promise<MovieDetails> {
  return fetchTMDB<MovieDetails>(
    `/movie/${id}`,
    { append_to_response: "credits,watch/providers,videos" },
    ONE_DAY,
  )
}

// Concorrência máxima de fetches paralelos ao TMDB por chamada (evita 429)
const TMDB_CONCURRENCY = 25

async function fulfilledOnly<T>(promises: Promise<T>[]): Promise<Awaited<T>[]> {
  const results = await Promise.allSettled(promises)
  const out: Awaited<T>[] = []
  for (const r of results) {
    if (r.status === "fulfilled") out.push(r.value)
  }
  return out
}

// Busca vários filmes numa ÚNICA server action — fetches rodam em paralelo
// no servidor. Evita 1 round-trip HTTP por filme (que o Next serializa).
export async function getMoviesByIds(ids: number[]): Promise<Movie[]> {
  const out: Movie[] = []
  for (let i = 0; i < ids.length; i += TMDB_CONCURRENCY) {
    const slice = ids.slice(i, i + TMDB_CONCURRENCY)
    out.push(...(await fulfilledOnly(slice.map((id) => getMovieById(id)))))
  }
  return out
}

// Idem, para os detalhes completos (usado nas estatísticas).
export async function getMovieDetailsByIds(ids: number[]): Promise<MovieDetails[]> {
  const out: MovieDetails[] = []
  for (let i = 0; i < ids.length; i += TMDB_CONCURRENCY) {
    const slice = ids.slice(i, i + TMDB_CONCURRENCY)
    out.push(...(await fulfilledOnly(slice.map((id) => getMovieDetails(id)))))
  }
  return out
}

function getRandomPage(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export async function getPopularMovies(
  page = 1,
  filters?: { genreId?: string | null; year?: string | null; minRating?: number | null },
): Promise<Movie[]> {
  const hasFilters = !!(filters?.genreId || filters?.year || filters?.minRating)
  const pageToUse = hasFilters ? page : page === 1 ? getRandomPage(1, 20) : page

  const params: Record<string, string> = {
    page: pageToUse.toString(),
    sort_by: "popularity.desc",
    include_adult: "false",
    "vote_count.gte": "300",
    without_genres: "99,10770",
  }

  if (filters?.genreId) params.with_genres = filters.genreId
  if (filters?.year) params.primary_release_year = filters.year
  if (filters?.minRating) params["vote_average.gte"] = filters.minRating.toString()

  // Sem cache: queremos página aleatória diferente a cada F5 quando não há filtros
  const data = await fetchTMDB<{ results: (Movie & { adult?: boolean })[] }>(
    "/discover/movie",
    params,
  )
  return data.results.filter((m) => !m.adult).slice(0, 18)
}

export async function searchMovies(query: string, page = 1): Promise<Movie[]> {
  const data = await fetchTMDB<{ results: (Movie & { adult?: boolean })[] }>(
    "/search/movie",
    { query, page: page.toString(), include_adult: "false" },
    ONE_HOUR,
  )
  return data.results.filter((m) => !m.adult).slice(0, 18)
}

export async function getMovieCertification(id: number): Promise<string> {
  try {
    const response = await fetchTMDB<{
      results: { iso_3166_1: string; release_dates: { certification: string }[] }[]
    }>(`/movie/${id}/release_dates`, {}, ONE_DAY)
    const brazilRelease = response.results.find((r) => r.iso_3166_1 === "BR")
    if (brazilRelease && brazilRelease.release_dates.length > 0) {
      const releaseWithCert = brazilRelease.release_dates.find((rd) => rd.certification)
      if (releaseWithCert) return releaseWithCert.certification
    }
    return "L"
  } catch (error) {
    console.error("Erro ao buscar certificação:", error)
    return "L"
  }
}
