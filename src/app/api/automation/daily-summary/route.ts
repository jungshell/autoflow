import { NextResponse } from 'next/server';
import { generateDailySummary } from '@/lib/automation';
import { createAlert } from '@/lib/firestore';
import { API_MESSAGES } from '@/lib/apiMessages';

export async function POST() {
  try {
    const summary = await generateDailySummary();
    await createAlert({
      type: 'summary',
      message: summary
    });
    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error('Error generating daily summary:', error);
    return NextResponse.json(
      { error: API_MESSAGES.SUMMARY_FAIL },
      { status: 500 }
    );
  }
}
