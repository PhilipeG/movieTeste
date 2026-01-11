// This file now only contains types - actual API calls are in server actions
export interface Movie {
  id: number
  title: string
  poster_path: string | null
  release_date: string
  vote_average: number
  overview: string
}

export interface Genre {
  id: number
  name: string
}

export interface CastMember {
  id: number
  name: string
  character: string
}

export interface WatchProvider {
  provider_id: number
  provider_name: string
  logo_path: string
}

export interface MovieDetails extends Movie {
  runtime: number
  genres: Genre[]
  credits: {
    cast: CastMember[]
  }
  "watch/providers": {
    results: {
      BR?: {
        link?: string
        flatrate?: WatchProvider[]
        rent?: WatchProvider[]
        buy?: WatchProvider[]
      }
    }
  }
}
