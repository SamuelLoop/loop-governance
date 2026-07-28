import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { processQueue } from './process-queue'

export async function GET(): Promise<NextResponse> {
  const supabase = createServiceClient()
  const result = await processQueue(supabase)
  return NextResponse.json(result)
}
