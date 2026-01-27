import { NextResponse } from 'next/server';
import { getUidFromRequest } from '@/lib/apiAuth';
import { getWorkLogById, updateWorkLog, deleteWorkLog } from '@/lib/firestoreAdmin';

const isValidId = (value: string) =>
  /^[a-zA-Z0-9_-]+$/.test(value) && value.length >= 10;

export const runtime = 'nodejs';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !isValidId(id)) {
      return NextResponse.json({ error: '잘못된 삭제 요청입니다.' }, { status: 400 });
    }
    const uid = await getUidFromRequest(_request);
    if (!uid) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }
    const existing = await getWorkLogById(id, uid);
    if (!existing) {
      return NextResponse.json({ error: '기록을 찾을 수 없습니다.' }, { status: 404 });
    }
    await deleteWorkLog(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Log delete error:', error);
    return NextResponse.json({ error: '삭제에 실패했습니다.' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !isValidId(id)) {
      return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 });
    }
    const uid = await getUidFromRequest(request);
    if (!uid) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }
    const existing = await getWorkLogById(id, uid);
    if (!existing) {
      return NextResponse.json({ error: '기록을 찾을 수 없습니다.' }, { status: 404 });
    }
    const body = (await request.json().catch(() => ({}))) as { hashtags?: string[] };
    const hashtags = Array.isArray(body.hashtags)
      ? body.hashtags.filter((t) => typeof t === 'string')
      : [];
    await updateWorkLog(id, {
      analysis_json: { ...existing.analysis_json, hashtags },
      tags: hashtags,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Log patch error:', error);
    return NextResponse.json({ error: '태그 수정에 실패했습니다.' }, { status: 500 });
  }
}
