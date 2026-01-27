import { NextResponse } from 'next/server';
import { getUidFromRequest } from '@/lib/apiAuth';
import {
  getWorkLogs,
  updateWorkLog,
  deleteAllWorkLogs,
  deleteWorkLogsByFilename,
} from '@/lib/firestoreAdmin';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const uid = await getUidFromRequest(request);
    const ownerId = uid ?? 'user1';
    const data = await getWorkLogs(ownerId);
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Logs GET error:', error);
    return NextResponse.json({ error: '기록을 불러오지 못했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const uid = await getUidFromRequest(request);
    if (!uid) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename')?.trim();
    if (filename) {
      await deleteWorkLogsByFilename(uid, filename);
    } else {
      await deleteAllWorkLogs(uid);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logs DELETE error:', error);
    return NextResponse.json(
      { error: '삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const uid = await getUidFromRequest(request);
    if (!uid) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename')?.trim();
    if (!filename) {
      return NextResponse.json({ error: '파일명이 필요합니다.' }, { status: 400 });
    }
    const body = (await request.json().catch(() => ({}))) as { hashtags?: string[] };
    const hashtags = Array.isArray(body.hashtags)
      ? body.hashtags.filter((t) => typeof t === 'string')
      : [];
    const logs = await getWorkLogs(uid, { source: 'pdf' });
    const matches = logs.filter(
      (l) => (l.analysis_json as Record<string, string>)?.['source_filename'] === filename
    );
    if (matches.length === 0) {
      return NextResponse.json({ error: '기록을 찾을 수 없습니다.' }, { status: 404 });
    }
    for (const log of matches) {
      await updateWorkLog(log.id, {
        analysis_json: { ...log.analysis_json, hashtags },
        tags: hashtags,
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logs PATCH error:', error);
    return NextResponse.json({ error: '태그 수정에 실패했습니다.' }, { status: 500 });
  }
}
