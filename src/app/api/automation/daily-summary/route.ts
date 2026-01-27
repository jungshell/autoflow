import { NextResponse } from 'next/server';
import { generateDailySummary } from '@/lib/automation';
import { createAlert } from '@/lib/firestoreAdmin';
import { sendSlackMessage } from '@/lib/slack';
import { API_MESSAGES } from '@/lib/apiMessages';

async function handleDailySummary() {
  try {
    // Firebase Admin SDK 초기화 확인
    const { getAdminApp } = await import('@/lib/verifyToken');
    const app = getAdminApp();
    if (!app) {
      const hasJson = !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      const hasProjectId = !!process.env.FIREBASE_PROJECT_ID;
      const hasClientEmail = !!process.env.FIREBASE_CLIENT_EMAIL;
      const hasPrivateKey = !!process.env.FIREBASE_PRIVATE_KEY;
      
      console.error('Firebase Admin SDK not initialized.', {
        hasJson,
        hasProjectId,
        hasClientEmail,
        hasPrivateKey,
      });
      
      return NextResponse.json(
        { 
          error: 'Firebase Admin SDK가 초기화되지 않았습니다. 환경 변수를 확인하세요.',
          hint: hasJson 
            ? 'FIREBASE_SERVICE_ACCOUNT_JSON이 설정되어 있지만 JSON 파싱에 실패했습니다. 형식을 확인하세요.'
            : hasProjectId && hasClientEmail && hasPrivateKey
            ? '3개 환경 변수가 설정되어 있지만 초기화에 실패했습니다. 값이 올바른지 확인하세요.'
            : 'FIREBASE_SERVICE_ACCOUNT_JSON 또는 (FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY) 환경 변수를 설정하세요.',
          envStatus: {
            FIREBASE_SERVICE_ACCOUNT_JSON: hasJson ? '설정됨' : '없음',
            FIREBASE_PROJECT_ID: hasProjectId ? '설정됨' : '없음',
            FIREBASE_CLIENT_EMAIL: hasClientEmail ? '설정됨' : '없음',
            FIREBASE_PRIVATE_KEY: hasPrivateKey ? '설정됨' : '없음',
          }
        },
        { status: 503 }
      );
    }

    const summary = await generateDailySummary();
    
    // createAlert는 ownerId가 없어도 동작하도록 (전체 사용자용 요약)
    try {
      await createAlert({
        type: 'summary',
        message: summary,
        ownerId: undefined, // 전체 요약이므로 ownerId 없음
      });
    } catch (alertError) {
      console.warn('Failed to create alert (continuing):', alertError);
      // 알림 생성 실패해도 요약은 계속 진행
    }
    
    // Slack 메시지 전송 (실패해도 계속 진행)
    try {
      await sendSlackMessage(`📋 AutoFlow 데일리 요약\n${summary}`);
    } catch (slackError) {
      console.warn('Failed to send Slack message (continuing):', slackError);
    }
    
    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error('Error generating daily summary:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        error: API_MESSAGES.SUMMARY_FAIL,
        details: errorMessage,
        hint: 'Vercel Functions → Logs에서 상세 오류를 확인하세요.'
      },
      { status: 500 }
    );
  }
}

// Vercel Cron은 GET 요청을 보냅니다
export async function GET() {
  return handleDailySummary();
}

// 기존 클라이언트 호출을 위한 POST도 유지
export async function POST() {
  return handleDailySummary();
}
