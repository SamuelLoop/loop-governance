type QueueRow = { id: number; user_id: string; subject: string }

export async function processQueue(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  batchSize = 500,
): Promise<{ processed: number }> {
  let totalProcessed = 0

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data: rows } = await supabase
      .from('accreditation_score_queue')
      .select('id, user_id, subject')
      .order('queued_at', { ascending: true })
      .limit(batchSize)

    const batch: QueueRow[] = rows ?? []
    if (batch.length === 0) break

    // Deduplicate by (user_id, subject) — compute each pair once per cron run
    const seen = new Set<string>()
    const unique = batch.filter(r => {
      const key = `${r.user_id}:${r.subject}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    await Promise.all(
      unique.map(r =>
        supabase.rpc('recompute_power_score', { p_user_id: r.user_id, p_subject: r.subject })
      )
    )

    const ids = batch.map(r => r.id)
    await supabase.from('accreditation_score_queue').delete().in('id', ids)

    totalProcessed += unique.length

    if (batch.length < batchSize) break // last batch
  }

  return { processed: totalProcessed }
}
