import { NextResponse } from 'next/server';
import { getUidFromRequest } from '@/lib/apiAuth';

const SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const BASE = 'https://accounts.google.com/o/oauth2/v2/auth';

/**
 * Google Calendar 연동 시작.
 * GET 요청 시 현재 사용자 uid를 state에 담아 Google OAuth URL을 반환합니다.
 * 프론트에서 이 URL로 리다이렉트하면 됩니다.
 */
export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        error: 'Google Calendar 연동이 설정되지 않았습니다.',
        hint: 'GOOGLE_CALENDAR_CLIENT_ID, GOOGLE_CALENDAR_CLIENT_SECRET 환경 변수를 추가한 뒤 재배포하세요. docs/선택기능-진행가이드.md 참고.',
      },
      { status: 503 }
    );
  }

  const uid = await getUidFromRequest(request);
  if (!uid) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const origin = request.headers.get('x-vercel-url')
    ? `https://${request.headers.get('x-vercel-url')}`
    : request.nextUrl.origin;
  const redirectUri = `${origin}/api/integrations/google-calendar/callback`;
  const state = Buffer.from(JSON.stringify({ uid })).toString('base64url');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPE,
    state,
    access_type: 'offline',
    prompt: 'consent',
  });
  const url = `${BASE}?${params.toString()}`;
  return NextResponse.json({ url });
}
