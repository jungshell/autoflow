import { NextResponse } from 'next/server';
import { generateDailySummary } from '@/lib/automation';
import { createAlert } from '@/lib/firestoreAdmin';
import { sendSlackMessage } from '@/lib/slack';
import { API_MESSAGES } from '@/lib/apiMessages';

async function handleDailySummary() {
  try {
    const summary = await generateDailySummary();
    await createAlert({
      type: 'summary',
      message: summary,
    });
    await sendSlackMessage(`📋 AutoFlow 데일리 요약\n${summary}`);
    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error('Error generating daily summary:', error);
    return NextResponse.json(
      { error: API_MESSAGES.SUMMARY_FAIL },
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
