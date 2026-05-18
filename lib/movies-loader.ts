const DEFAULT_BATCH_SIZE = 20

export async function loadByIds<T>(
  ids: readonly number[],
  fetcher: (id: number) => Promise<T>,
  options?: {
    batchSize?: number
    // Chamado após cada lote, com os resultados desse lote.
    // Permite anexar resultados incrementalmente em vez de esperar tudo.
    onBatch?: (batch: Awaited<T>[]) => void
  },
): Promise<Awaited<T>[]> {
  if (ids.length === 0) return []

  const batchSize = options?.batchSize ?? DEFAULT_BATCH_SIZE
  const fulfilled: Awaited<T>[] = []

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize)
    const results = await Promise.allSettled(batch.map(fetcher))
    const batchFulfilled: Awaited<T>[] = []
    for (const r of results) {
      if (r.status === "fulfilled") batchFulfilled.push(r.value)
    }
    fulfilled.push(...batchFulfilled)
    options?.onBatch?.(batchFulfilled)
  }

  return fulfilled
}
