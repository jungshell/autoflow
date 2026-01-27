import { NextResponse } from 'next/server';
import { getTemplates } from '@/lib/firestoreAdmin';
import { getUidFromRequest } from '@/lib/apiAuth';
import { API_MESSAGES } from '@/lib/apiMessages';

export async function GET(request: Request) {
  try {
    const uid = await getUidFromRequest(request);
    const templates = await getTemplates(uid ?? undefined);
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: '템플릿 목록을 불러오지 못했습니다.' },
      { status: 500 }
    );
  }
}
