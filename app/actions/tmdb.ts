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
    append_to_response: "credits,watch/providers",
  })
}

function getRandomPage(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export async function getPopularMovies(): Promise<Movie[]> {
  const randomPage = getRandomPage(1, 50)
  const data = await fetchTMDB<{ results: Movie[] }>("/movie/popular", {
    page: randomPage.toString(),
  })
  return data.results.slice(0, 18)
}

export async function searchMovies(query: string, page = 1): Promise<Movie[]> {
  const data = await fetchTMDB<{ results: Movie[] }>("/search/movie", {
    query,
    page: page.toString(),
  })
  return data.results.slice(0, 18)
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
