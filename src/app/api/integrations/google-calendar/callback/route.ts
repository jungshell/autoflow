import { NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/verifyToken';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

/**
 * Google OAuth 콜백. code를 토큰으로 교환 후 Firestore에 저장하고 설정 페이지로 리다이렉트합니다.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/settings?calendar=error&message=${encodeURIComponent(error)}`, request.url)
    );
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL('/settings?calendar=missing', request.url));
  }

  let uid: string;
  try {
    uid = JSON.parse(Buffer.from(state, 'base64url').toString()).uid;
  } catch {
    return NextResponse.redirect(new URL('/settings?calendar=invalid_state', request.url));
  }

  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/settings?calendar=not_configured', request.url));
  }

  const origin = request.headers.get('x-vercel-url')
    ? `https://${request.headers.get('x-vercel-url')}`
    : request.nextUrl.origin;
  const redirectUri = `${origin}/api/integrations/google-calendar/callback`;

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error('Google token error:', err);
    return NextResponse.redirect(
      new URL(`/settings?calendar=token_error&message=${encodeURIComponent(err.slice(0, 100))}`, request.url)
    );
  }

  const tokens = await tokenRes.json();
  const app = getAdminApp();
  if (!app) {
    return NextResponse.redirect(new URL('/settings?calendar=server_error', request.url));
  }
  const db = getFirestore(app);
  await db.collection('calendar_tokens').doc(uid).set({
    refresh_token: tokens.refresh_token,
    access_token: tokens.access_token ?? null,
    expiry: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : null,
    updatedAt: Timestamp.now(),
  });

  return NextResponse.redirect(new URL('/settings?calendar=connected', request.url));
}
