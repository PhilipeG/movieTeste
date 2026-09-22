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

// Até quantos anos selecionados valem uma chamada por ano (resultado exato).
// Acima disso, usa o intervalo inteiro e filtra — 1 chamada só.
const MULTI_YEAR_PARALLEL = 6

export async function getPopularMovies(
  page = 1,
  filters?: { genreIds?: string[]; years?: string[]; minRating?: number | null },
): Promise<Movie[]> {
  const genreIds = filters?.genreIds ?? []
  const years = filters?.years ?? []
  const hasFilters = genreIds.length > 0 || years.length > 0 || !!filters?.minRating
  const pageToUse = hasFilters ? page : page === 1 ? getRandomPage(1, 20) : page

  const baseParams: Record<string, string> = {
    page: pageToUse.toString(),
    sort_by: "popularity.desc",
    include_adult: "false",
    "vote_count.gte": "300",
    without_genres: "99,10770",
  }

  // "|" = OU (qualquer um dos gêneros); "," seria E (todos ao mesmo tempo)
  if (genreIds.length) baseParams.with_genres = genreIds.join("|")
  if (filters?.minRating) baseParams["vote_average.gte"] = filters.minRating.toString()

  type Row = Movie & { adult?: boolean; popularity?: number }
  // Sem cache: queremos página aleatória diferente a cada F5 quando não há filtros
  const fetchPage = (params: Record<string, string>) =>
    fetchTMDB<{ results: Row[] }>("/discover/movie", params)

  let results: Row[]
  if (years.length === 0) {
    results = (await fetchPage(baseParams)).results
  } else if (years.length <= MULTI_YEAR_PARALLEL) {
    // O TMDB só aceita um primary_release_year por chamada — uma por ano e junta
    const pages = await fulfilledOnly(
      years.map((y) => fetchPage({ ...baseParams, primary_release_year: y })),
    )
    results = pages.flatMap((p) => p.results)
    results.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
  } else {
    const sorted = [...years].sort()
    const selected = new Set(years)
    const data = await fetchPage({
      ...baseParams,
      "primary_release_date.gte": `${sorted[0]}-01-01`,
      "primary_release_date.lte": `${sorted[sorted.length - 1]}-12-31`,
    })
    results = data.results.filter((m) => selected.has((m.release_date ?? "").slice(0, 4)))
  }

  const seen = new Set<number>()
  const out: Movie[] = []
  for (const m of results) {
    if (m.adult || seen.has(m.id)) continue
    seen.add(m.id)
    out.push(m)
    if (out.length === 18) break
  }
  return out
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
