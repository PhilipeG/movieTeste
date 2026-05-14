const DEFAULT_BATCH_SIZE = 10

export async function loadByIds<T>(
  ids: readonly number[],
  fetcher: (id: number) => Promise<T>,
  options?: { batchSize?: number },
): Promise<Awaited<T>[]> {
  if (ids.length === 0) return []

  const batchSize = options?.batchSize ?? DEFAULT_BATCH_SIZE
  const fulfilled: Awaited<T>[] = []

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize)
    const results = await Promise.allSettled(batch.map(fetcher))
    for (const r of results) {
      if (r.status === "fulfilled") fulfilled.push(r.value)
    }
  }

  return fulfilled
}
