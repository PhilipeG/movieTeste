"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import MovieCard from "./movie-card"
import type { Movie } from "@/lib/tmdb"

interface Props {
  movie: Movie
  rank?: number
  onMarkAsSeen?: (id: number) => void
  onRemoveFromFavorites?: (id: number) => void
  isFavorite: boolean
  onClick: () => void
}

export function SortableMovieCard(props: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.movie.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={isDragging ? "cursor-grabbing" : "cursor-grab"}
    >
      <MovieCard {...props} />
    </div>
  )
}
