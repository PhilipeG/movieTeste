"use client"

import { memo, useState, useEffect, useMemo, useCallback, useRef } from "react"
import Image from "next/image"
import type { Movie } from "@/lib/tmdb"
import {
  Sparkles,
  Trash2,
  Search,
  RotateCcw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { toast } from "sonner"

interface Props {
  movies: Movie[]
  onSpinEnd: (movie: Movie) => void
  onRemoveMovie: (id: number) => void
}

// Dimensões da fita
const CARD_W = 168 // largura do card (px)
const CARD_GAP = 12 // espaço entre cards (px)
const TOTAL_CARD = CARD_W + CARD_GAP
const PAN_CARDS = 4 // quantos cards por clique nas setas
const PAN_DURATION_MS = 450
const STRIP_LEN = 60 // total de cards na fita do sorteio
const WINNER_POS = 52 // posição do vencedor (alguns cards antes do fim, pra parar com drama)
const SPIN_DURATION = 5500 // ms da animação

const PosterCard = memo(function PosterCard({
  movie,
  highlight,
}: {
  movie: Movie
  highlight: boolean
}) {
  return (
    <div
      className="shrink-0 flex flex-col items-center gap-1.5"
      style={{ width: CARD_W }}
    >
      <div
        className={`relative w-full aspect-[2/3] rounded-lg overflow-hidden bg-card border transition-all duration-300 ${
          highlight
            ? "border-primary shadow-[0_0_24px_4px] shadow-primary/60 scale-105"
            : "border-border"
        }`}
      >
        {movie.poster_path ? (
          <Image
            src={`https://image.tmdb.org/t/p/w185${movie.poster_path}`}
            alt={movie.title}
            fill
            sizes="168px"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary text-[10px] p-2 text-center text-foreground/80">
            {movie.title}
          </div>
        )}
      </div>
      <div className="text-[10px] text-foreground/70 w-full truncate text-center px-1">
        {movie.title}
      </div>
    </div>
  )
})

// Duração da animação de saída de um item da lista (ms) —
// um pouco maior que o duration-[450ms] do CSS pra garantir que termine
const REMOVE_ANIM_MS = 480

export default function Roulette({ movies, onSpinEnd, onRemoveMovie }: Props) {
  const [searchTerm, setSearchTerm] = useState("")
  const [lastSpunMovie, setLastSpunMovie] = useState<Movie | null>(null)
  // IDs marcados como "saindo" — anima encolhimento antes da remoção real
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set())

  const handleRemoveAnimated = useCallback(
    (id: number) => {
      setRemovingIds((prev) => new Set(prev).add(id))
      // Importante: NÃO limpamos o id de `removingIds` aqui.
      // O round-trip do Firestore pode ser mais lento que REMOVE_ANIM_MS,
      // e se limpássemos agora o item renderizaria normalmente entre o
      // timeout e a chegada do estado novo. A limpeza acontece quando o
      // item efetivamente sai de `filteredMovies` (useEffect abaixo).
      setTimeout(() => {
        onRemoveMovie(id)
      }, REMOVE_ANIM_MS)
    },
    [onRemoveMovie],
  )

  // Estado do filmstrip
  const [isSpinning, setIsSpinning] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [translateX, setTranslateX] = useState(0)
  // Card atualmente sob o marcador — atualizado dinamicamente (rAF) durante
  // spin/pan, e estaticamente em repouso. Substitui o antigo `winnerStripIdx`.
  const [centerIdx, setCenterIdx] = useState<number | null>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)

  // Limites do translateX pra navegação manual (setas)
  const getPanBounds = useCallback(() => {
    const viewportW = viewportRef.current?.clientWidth ?? 768
    const stripW = STRIP_LEN * TOTAL_CARD
    return { maxTx: 0, minTx: -(stripW - viewportW) }
  }, [])

  const handlePanLeft = useCallback(() => {
    setIsPanning(true)
    setTranslateX((prev) => {
      const { maxTx } = getPanBounds()
      return Math.min(maxTx, prev + PAN_CARDS * TOTAL_CARD)
    })
    setTimeout(() => setIsPanning(false), PAN_DURATION_MS)
  }, [getPanBounds])

  const handlePanRight = useCallback(() => {
    setIsPanning(true)
    setTranslateX((prev) => {
      const { minTx } = getPanBounds()
      return Math.max(minTx, prev - PAN_CARDS * TOTAL_CARD)
    })
    setTimeout(() => setIsPanning(false), PAN_DURATION_MS)
  }, [getPanBounds])

  // Limites pra calcular se as setas devem estar habilitadas
  const { maxTx, minTx } = getPanBounds()
  const canPanLeft = translateX < maxTx
  const canPanRight = translateX > minTx

  const validMovies = useMemo(
    () => movies.filter((m) => m && m.title),
    [movies],
  )

  // Lista "estável" — não muda durante um sorteio
  const [stableMovies, setStableMovies] = useState(validMovies)
  useEffect(() => {
    if (!isSpinning) setStableMovies(validMovies)
  }, [validMovies, isSpinning])

  // Fita de preview (antes/depois do sorteio): apenas repete os filmes em loop
  const previewStrip = useMemo<Movie[]>(() => {
    if (stableMovies.length === 0) return []
    const arr: Movie[] = []
    for (let i = 0; i < STRIP_LEN; i++) {
      arr.push(stableMovies[i % stableMovies.length])
    }
    return arr
  }, [stableMovies])

  const [strip, setStrip] = useState<Movie[]>(() => previewStrip)

  // Snapshot dos IDs da lista pra detectar adições/remoções no useEffect abaixo
  const prevStripIdsRef = useRef<Set<number>>(
    new Set(stableMovies.map((m) => m.id)),
  )

  // Constrói uma fita com `centerMovie` exatamente em WINNER_POS:
  // - nenhum filme se repete em janela curta (lookback de até 3 cards) —
  //   elimina padrões A-B-A que apareciam ao panorar a fita;
  // - se a lista tem ≥4 filmes, o centerMovie só aparece no marcador (em
  //   nenhum outro lugar), pra o vencedor "brilhar" sozinho;
  // - se a lista tem <4 filmes, o centerMovie só é evitado na região
  //   próxima ao marcador (pra a fita não ficar repetitiva demais).
  const buildStripWith = useCallback(
    (centerMovie: Movie): Movie[] => {
      // Quantos cards cabem em cada metade do viewport (área visível)
      const viewportW = viewportRef.current?.clientWidth ?? 768
      const cardsPerHalf = Math.ceil(viewportW / 2 / TOTAL_CARD)
      const nearbyRange = Math.max(3, cardsPerHalf + 1)

      // Janela de exclusão pra evitar repetição "próxima" (A-B-A etc.).
      // Adapta ao tamanho da lista pra o pool não ficar vazio com poucos filmes.
      const lookback = Math.max(1, Math.min(3, stableMovies.length - 1))
      // Com 4+ filmes, dá pra manter o vencedor único na fita inteira.
      const excludeCenterEverywhere = stableMovies.length >= 4

      // Tenta excluir o conjunto "desejado"; se ficar sem opção, relaxa pra
      // apenas o "estrito" (mínimo: evitar adjacência); último recurso: qualquer.
      const pickExcluding = (
        desiredIds: Set<number>,
        strictIds: Set<number>,
      ): Movie => {
        const pool = stableMovies.filter((m) => !desiredIds.has(m.id))
        if (pool.length > 0) return pool[Math.floor(Math.random() * pool.length)]
        const fallback = stableMovies.filter((m) => !strictIds.has(m.id))
        if (fallback.length > 0)
          return fallback[Math.floor(Math.random() * fallback.length)]
        return stableMovies[Math.floor(Math.random() * stableMovies.length)]
      }

      const arr: Movie[] = new Array(STRIP_LEN)
      arr[WINNER_POS] = centerMovie

      // Backward de WINNER_POS-1 até 0
      for (let i = WINNER_POS - 1; i >= 0; i--) {
        const strict = new Set<number>()
        const desired = new Set<number>()
        for (let k = 1; k <= lookback; k++) {
          if (arr[i + k]) {
            strict.add(arr[i + k].id)
            desired.add(arr[i + k].id)
          }
        }
        if (excludeCenterEverywhere || Math.abs(i - WINNER_POS) <= nearbyRange) {
          desired.add(centerMovie.id)
        }
        arr[i] = pickExcluding(desired, strict)
      }

      // Forward de WINNER_POS+1 até o fim
      for (let i = WINNER_POS + 1; i < STRIP_LEN; i++) {
        const strict = new Set<number>()
        const desired = new Set<number>()
        for (let k = 1; k <= lookback; k++) {
          if (arr[i - k]) {
            strict.add(arr[i - k].id)
            desired.add(arr[i - k].id)
          }
        }
        if (excludeCenterEverywhere || Math.abs(i - WINNER_POS) <= nearbyRange) {
          desired.add(centerMovie.id)
        }
        arr[i] = pickExcluding(desired, strict)
      }

      return arr
    },
    [stableMovies],
  )

  // Reage a mudanças na lista (não durante sorteio):
  // - Adicionou filme → posiciona ele no marcador central, com glow
  // - Removeu filme → rebuilda o preview (pode haver cards apontando pro removido)
  // - Sem mudança real → não mexe (preserva resultado de sorteio anterior)
  useEffect(() => {
    if (isSpinning) return

    const currentIds = new Set(stableMovies.map((m) => m.id))
    const newIds = [...currentIds].filter(
      (id) => !prevStripIdsRef.current.has(id),
    )
    const removedAny = [...prevStripIdsRef.current].some(
      (id) => !currentIds.has(id),
    )
    prevStripIdsRef.current = currentIds

    if (newIds.length > 0) {
      // Filme(s) adicionado(s) — mostra o mais recente no marcador central
      const newestId = newIds[newIds.length - 1]
      const newestMovie = stableMovies.find((m) => m.id === newestId)
      if (newestMovie) {
        const viewportW = viewportRef.current?.clientWidth ?? 768
        const targetX =
          -(WINNER_POS * TOTAL_CARD) + viewportW / 2 - CARD_W / 2
        setIsPanning(false)
        setStrip(buildStripWith(newestMovie))
        setTranslateX(targetX)
      }
    } else if (removedAny) {
      // Remoção → rebuilda preview pra dropar cards apontando pro removido
      setIsPanning(false)
      setStrip(previewStrip)
      setTranslateX(0)
    }
    // Senão (mesmos IDs, só mudou referência): não mexe
  }, [stableMovies, isSpinning, previewStrip, buildStripWith])

  const filteredMovies = useMemo(
    () =>
      validMovies.filter((m) =>
        m.title.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [validMovies, searchTerm],
  )

  // Limpa `removingIds` quando os itens efetivamente saem da lista
  // (fim do round-trip do Firestore). Evita o "reaparece por um segundo".
  useEffect(() => {
    if (removingIds.size === 0) return
    const currentIds = new Set(filteredMovies.map((m) => m.id))
    setRemovingIds((prev) => {
      const next = new Set<number>()
      for (const id of prev) {
        if (currentIds.has(id)) next.add(id)
      }
      return next.size === prev.size ? prev : next
    })
  }, [filteredMovies, removingIds])

  // Mantém `centerIdx` sincronizado com o card visualmente sob o marcador.
  // Em repouso (translateX fixo), basta computar uma vez por mudança.
  // Durante spin/pan (transição CSS animando), usa rAF pra ler a posição
  // real via getBoundingClientRect e atualizar a cada frame.
  useEffect(() => {
    const viewport = viewportRef.current
    const stripEl = stripRef.current
    if (!viewport || !stripEl) return

    const compute = () => {
      const vRect = viewport.getBoundingClientRect()
      const sRect = stripEl.getBoundingClientRect()
      const markerX = vRect.left + vRect.width / 2
      const offset = markerX - sRect.left
      const idx = Math.floor(offset / TOTAL_CARD)
      const within = offset - idx * TOTAL_CARD
      // Só destaca quando o marcador está sobre o card (não no gap entre eles)
      const next =
        idx >= 0 && idx < STRIP_LEN && within >= 0 && within <= CARD_W
          ? idx
          : null
      setCenterIdx((prev) => (prev === next ? prev : next))
    }

    compute()

    if (!isSpinning && !isPanning) return

    let rafId = 0
    const tick = () => {
      compute()
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [isSpinning, isPanning, translateX])

  const handleSpin = useCallback(() => {
    if (isSpinning || stableMovies.length < 2) return

    // Sorteia o vencedor e constrói a fita com ele em WINNER_POS
    const winnerMovie =
      stableMovies[Math.floor(Math.random() * stableMovies.length)]
    const newStrip = buildStripWith(winnerMovie)

    // Reseta posição instantaneamente (sem transition) e troca a fita
    setIsPanning(false)
    setStrip(newStrip)
    setTranslateX(0)

    // Próximos 2 frames: liga a transition e seta o alvo (anima)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const viewportW = viewportRef.current?.clientWidth ?? 768
        // Jitter pequeno pra não cair exatamente no centro toda vez (mais realista)
        const jitter = (Math.random() - 0.5) * (CARD_W * 0.5)
        const target =
          -(WINNER_POS * TOTAL_CARD) + viewportW / 2 - CARD_W / 2 + jitter
        setIsSpinning(true)
        setTranslateX(target)
      })
    })

    // Fim do sorteio
    setTimeout(() => {
      setIsSpinning(false)
      setLastSpunMovie(winnerMovie)
      onSpinEnd(winnerMovie)
    }, SPIN_DURATION + 100)
  }, [isSpinning, stableMovies, onSpinEnd, buildStripWith])

  // Ctrl+Z: desfaz o último sorteio (remove da roleta)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && lastSpunMovie) {
        e.preventDefault()
        handleRemoveAnimated(lastSpunMovie.id)
        toast.success(`"${lastSpunMovie.title}" removido da roleta!`)
        setLastSpunMovie(null)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [lastSpunMovie, handleRemoveAnimated])

  // Se o "último sorteado" foi removido por outro lado, limpa
  useEffect(() => {
    if (
      lastSpunMovie &&
      !validMovies.find((m) => m.id === lastSpunMovie.id)
    ) {
      setLastSpunMovie(null)
    }
  }, [validMovies, lastSpunMovie])


  // ESTADO VAZIO
  if (stableMovies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
        <Sparkles className="w-16 h-16 mb-4 opacity-20" suppressHydrationWarning />
        <h3 className="text-xl font-semibold mb-2">A roleta está vazia</h3>
        <p>
          Vá aos seus Favoritos e clique no botão &quot;+&quot; nos cards para
          adicionar filmes aqui.
        </p>
      </div>
    )
  }

  // SÓ 1 FILME
  if (stableMovies.length === 1) {
    const singleMovie = stableMovies[0]
    return (
      <div className="flex flex-col md:flex-row items-center justify-center gap-12 py-12">
        <div className="flex flex-col items-center justify-center w-80 h-80 rounded-full border-4 border-dashed border-muted-foreground/30 bg-secondary/20 p-8 text-center">
          <AlertTriangle
            className="w-12 h-12 text-yellow-500 mb-4"
            suppressHydrationWarning
          />
          <h3 className="text-lg font-bold text-foreground mb-2">Falta pouco!</h3>
          <p className="text-sm text-muted-foreground">
            Adicione mais <b>1 filme</b> para a roleta poder sortear.
          </p>
        </div>
        <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-xl flex flex-col max-h-[500px]">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Sparkles
              className="w-5 h-5 text-yellow-500"
              suppressHydrationWarning
            />
            Filmes (1)
          </h3>
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 text-foreground group">
            <span className="text-sm font-medium truncate flex-1 pr-4">
              {singleMovie.title}
            </span>
            <button
              onClick={() => onRemoveMovie(singleMovie.id)}
              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-4 h-4" suppressHydrationWarning />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // FILMSTRIP + LISTA
  return (
    <div className="flex flex-col items-center gap-8 py-8">
      {/* Viewport da fita */}
      <div
        ref={viewportRef}
        className="group relative w-full max-w-5xl h-[300px] md:h-[380px] rounded-2xl overflow-hidden bg-card border border-border shadow-2xl"
      >
        {/* Wrapper de centralização vertical */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 will-change-transform">
          {/* Fita que translada horizontalmente */}
          <div
            ref={stripRef}
            className="flex py-3"
            style={{
              gap: `${CARD_GAP}px`,
              transform: `translateX(${translateX}px)`,
              transition: isSpinning
                ? `transform ${SPIN_DURATION}ms cubic-bezier(0.1, 0.6, 0.15, 1)`
                : isPanning
                  ? `transform ${PAN_DURATION_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`
                  : "none",
            }}
          >
            {strip.map((movie, i) => (
              <PosterCard
                key={`${movie.id}-${i}`}
                movie={movie}
                highlight={i === centerIdx}
              />
            ))}
          </div>
        </div>

        {/* Gradientes que desbotam os cards nas bordas — foco no centro */}
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-card to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-card to-transparent z-10 pointer-events-none" />

        {/* Setas de navegação manual — aparecem no hover, escondidas durante sorteio */}
        {!isSpinning && (
          <>
            <button
              onClick={handlePanLeft}
              disabled={!canPanLeft}
              aria-label="Mover fita para a esquerda"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-card/90 backdrop-blur-md border border-white/10 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-card hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" suppressHydrationWarning />
            </button>
            <button
              onClick={handlePanRight}
              disabled={!canPanRight}
              aria-label="Mover fita para a direita"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-card/90 backdrop-blur-md border border-white/10 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-card hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-5 h-5 text-foreground" suppressHydrationWarning />
            </button>
          </>
        )}

        {/* Marcador central — linha vertical com triangulos top/bottom */}
        <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 z-20 pointer-events-none w-3 flex flex-col items-center">
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: "9px solid var(--primary)",
            }}
          />
          <div className="flex-1 w-[2px] bg-primary shadow-[0_0_12px_3px] shadow-primary/60" />
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderBottom: "9px solid var(--primary)",
            }}
          />
        </div>
      </div>

      {/* Botão de sortear */}
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={handleSpin}
          disabled={isSpinning || stableMovies.length < 2}
          className="cursor-pointer group flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-10 py-3.5 rounded-2xl font-bold text-lg shadow-[0_0_24px_4px] shadow-primary/40 hover:shadow-primary/60 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          <Sparkles
            className="w-5 h-5 group-hover:rotate-12 transition-transform"
            suppressHydrationWarning
          />
          {isSpinning ? "Sorteando..." : "Sortear"}
        </button>
        {lastSpunMovie && !isSpinning && (
          <div className="text-xs text-muted-foreground flex items-center gap-1 animate-in fade-in duration-300">
            <RotateCcw className="w-3 h-3" suppressHydrationWarning />
            Ctrl+Z: remover{" "}
            <b className="text-primary">{lastSpunMovie.title}</b> da roleta
          </div>
        )}
      </div>

      {/* Painel da lista de filmes (busca + remove) */}
      <div className="w-full max-w-md bg-card border border-border rounded-xl p-6 shadow-xl flex flex-col max-h-[500px]">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 shrink-0">
          <Sparkles
            className="w-5 h-5 text-yellow-500"
            suppressHydrationWarning
          />
          Filmes ({validMovies.length})
        </h3>

        <div className="relative mb-4 shrink-0">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
            suppressHydrationWarning
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar filme na roleta..."
            className="w-full bg-secondary/50 border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        </div>

        <div className="overflow-y-auto custom-scrollbar pr-2 flex-grow">
          {filteredMovies.length > 0 ? (
            filteredMovies.map((movie) => {
              const isLastSpun = lastSpunMovie?.id === movie.id
              const isRemoving = removingIds.has(movie.id)
              const containerClasses = isLastSpun
                ? "bg-primary/10 border border-primary/20 text-primary"
                : "bg-secondary/50 hover:bg-secondary text-foreground"
              return (
                // Entrada: classe `list-item-enter` (CSS @keyframes) — anima
                // altura, margin, opacity e scale ao montar, sem race condition.
                // Saída: removendo a classe e aplicando estado colapsado, o
                // transition-all anima de volta pra max-h-0.
                <div
                  key={movie.id}
                  className={`overflow-hidden transition-all duration-[450ms] ease-out ${
                    isRemoving
                      ? "max-h-0 mt-0 opacity-0 scale-95 pointer-events-none"
                      : "list-item-enter max-h-20 mt-2 first:mt-0 opacity-100 scale-100"
                  }`}
                >
                  <div
                    className={`flex items-center justify-between p-3 rounded-lg group/item ${containerClasses}`}
                  >
                      <span className="text-sm font-medium truncate flex-1 pr-4 flex items-center gap-1">
                        {isLastSpun && (
                          <Sparkles
                            className="w-3 h-3 text-primary shrink-0"
                            suppressHydrationWarning
                          />
                        )}
                        <span className="truncate">{movie.title}</span>
                      </span>
                      <button
                        onClick={() => handleRemoveAnimated(movie.id)}
                        disabled={isRemoving}
                        className={`p-1.5 rounded-md transition-colors opacity-0 group-hover/item:opacity-100 ${
                          isLastSpun
                            ? "text-primary hover:text-destructive hover:bg-destructive/10"
                            : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        }`}
                        title="Remover da roleta"
                      >
                        <Trash2 className="w-4 h-4" suppressHydrationWarning />
                      </button>
                    </div>
                  </div>
              )
            })
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum filme encontrado.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}