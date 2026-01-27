import { NextResponse } from 'next/server';
import { detectDelays } from '@/lib/automation';

export async function POST() {
  try {
    await detectDelays();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in delay detection:', error);
    return NextResponse.json({ error: 'Failed to detect delays' }, { status: 500 });
  }
}
