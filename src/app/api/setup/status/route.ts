import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { settings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, 'setupComplete'));
    return NextResponse.json({ complete: !!row });
  } catch {
    return NextResponse.json({ complete: false });
  }
}
