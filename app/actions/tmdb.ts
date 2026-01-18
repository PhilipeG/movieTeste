"use server"

import type { Movie, Genre, MovieDetails } from "@/lib/tmdb"

const API_KEY = process.env.TMDB_API_KEY
const BASE_URL = "https://api.themoviedb.org/3"

async function fetchTMDB<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`)
  url.searchParams.append("api_key", API_KEY || "")
  url.searchParams.append("language", "pt-BR")

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value)
  })

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`TMDB API error: ${res.status}`)
  return res.json()
}

export async function getMovieById(id: number): Promise<Movie> {
  return fetchTMDB<Movie>(`/movie/${id}`)
}

export async function getGenres(): Promise<Genre[]> {
  const data = await fetchTMDB<{ genres: Genre[] }>("/genre/movie/list")
  return data.genres
}

export async function getMovieImages(id: number) {
  return fetchTMDB<any>(`/movie/${id}/images`)
}

export async function getMovieDetails(id: number): Promise<MovieDetails> {
  return fetchTMDB<MovieDetails>(`/movie/${id}`, {
    append_to_response: "credits,watch/providers,videos",
  })
}

function getRandomPage(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Atualize a assinatura da função para aceitar filtros
export async function getPopularMovies(
  page = 1, 
  filters?: { genreId?: string | null, year?: string | null, minRating?: number | null }
): Promise<Movie[]> {
  
  const randomPage = getRandomPage(1, 20)
  // Se tiver filtros, usamos a página 1 ou a solicitada, senão aleatória
  const pageToUse = (filters?.genreId || filters?.year || filters?.minRating) ? page : (page === 1 ? randomPage : page)

  // Montamos os parâmetros dinamicamente
  const params: any = {
    page: pageToUse.toString(),
    sort_by: "popularity.desc",
    include_adult: "false",
    "vote_count.gte": "300", // Mantém o filtro de qualidade
    "without_genres": "99,10770",
  }

  // Aplica os filtros se existirem
  if (filters?.genreId) params.with_genres = filters.genreId
  if (filters?.year) params.primary_release_year = filters.year
  if (filters?.minRating) params["vote_average.gte"] = filters.minRating.toString()

  const data = await fetchTMDB<{ results: Movie[] }>("/discover/movie", params)

  // Validação manual de adulto + Slice
  return data.results.filter((m: any) => !m.adult).slice(0, 18)
}

export async function searchMovies(query: string, page = 1): Promise<Movie[]> {
  const data = await fetchTMDB<{ results: Movie[] }>("/search/movie", {
    query,
    page: page.toString(),
    include_adult: "false",
  })
  // Busca é intencional, então não filtramos por votos, apenas adulto + slice
  return data.results.filter((m: any) => !m.adult).slice(0, 18)
}

export async function getMovieCertification(id: number): Promise<string> {
  try {
    const response = await fetchTMDB<any>(`/movie/${id}/release_dates`)
    const results = response.results
    const brazilRelease = results.find((result: any) => result.iso_3166_1 === "BR")

    if (brazilRelease && brazilRelease.release_dates.length > 0) {
      const releaseWithCert = brazilRelease.release_dates.find((rd: any) => rd.certification)
      if (releaseWithCert) {
        return releaseWithCert.certification
      }
    }
    return "L"
  } catch (error) {
    console.error("Erro ao buscar certificação:", error)
    return "L"
  }
}

export async function getMoviesByGenre(genreId: number): Promise<Movie[]> {
  const data = await fetchTMDB<{ results: Movie[] }>("/discover/movie", {
    with_genres: genreId.toString(),
    include_adult: "false",
    sort_by: "popularity.desc",
    "vote_count.gte": "100", // Filtro um pouco mais leve para gêneros específicos
    "without_genres": "99,10770"
  })
  return data.results.filter((m: any) => !m.adult).slice(0, 18)
}

export async function getWatchProviders(id: number) {
  const API_KEY = process.env.TMDB_API_KEY
  const BASE_URL = "https://api.themoviedb.org/3"

  try {
    const res = await fetch(
      `${BASE_URL}/movie/${id}/watch/providers?api_key=${API_KEY}`,
      { next: { revalidate: 3600 } }
    )
    const data = await res.json()
    return data.results?.BR || null
  } catch (error) {
    console.error("Erro ao buscar providers:", error)
    return null
  }
}