import { NextResponse } from 'next/server';
import { detectDelays } from '@/lib/automation';
import { sendSlackMessage } from '@/lib/slack';

export async function POST() {
  try {
    const { delayedCount } = await detectDelays();
    if (delayedCount > 0) {
      await sendSlackMessage(`⚠️ AutoFlow 지연 감지: ${delayedCount}건의 업무가 마감일을 지났습니다.`);
    }
    return NextResponse.json({ success: true, delayedCount });
  } catch (error) {
    console.error('Error in delay detection:', error);
    return NextResponse.json({ error: 'Failed to detect delays' }, { status: 500 });
  }
}
