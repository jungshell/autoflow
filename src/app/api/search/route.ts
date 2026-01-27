import { NextResponse } from 'next/server';
import { getUidFromRequest } from '@/lib/apiAuth';
import { getWorkLogs } from '@/lib/firestoreAdmin';

export async function GET(request: Request) {
  try {
    const uid = await getUidFromRequest(request);
    const ownerId = uid ?? 'user1';
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source')?.trim() ?? undefined;
    const mode = searchParams.get('mode')?.trim() ?? undefined;

    const data = await getWorkLogs(ownerId, { mode, source });
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: '검색에 실패했습니다.' },
      { status: 500 }
    );
  }
}
