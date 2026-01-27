import { NextResponse } from 'next/server';
import { getUidFromRequest } from '@/lib/apiAuth';
import { createWorkLog } from '@/lib/firestoreAdmin';
import { analyzeMeeting, analyzeEmojiTone } from '@/lib/workLogAnalyze';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const uid = await getUidFromRequest(request);
    const ownerId = uid ?? 'user1';

    const formData = await request.formData();
    const textInput = formData.get('text');
    const modeRaw = (formData.get('mode') ?? '').toString().trim();
    const meetingStart = (formData.get('meeting_start') ?? '').toString().trim();
    const meetingEnd = (formData.get('meeting_end') ?? '').toString().trim();
    const meetingLocation = (formData.get('meeting_location') ?? '').toString().trim();
    const meetingParticipants = (formData.get('meeting_participants') ?? '').toString().trim();
    const meetingProject = (formData.get('meeting_project') ?? '').toString().trim();
    const meetingWorkType = (formData.get('meeting_work_type') ?? '').toString().trim();
    const meetingDate = (formData.get('meeting_date') ?? '').toString().trim();

    const contentText = typeof textInput === 'string' ? textInput : '';
    if (!contentText.trim()) {
      return NextResponse.json({ error: '분석할 텍스트가 없습니다.' }, { status: 400 });
    }

    const resolvedMode = modeRaw || 'meeting';
    let analysis_json: Record<string, unknown>;

    if (resolvedMode === 'meeting') {
      analysis_json = analyzeMeeting(contentText, {
        meeting_date: meetingDate,
        meeting_start: meetingStart,
        meeting_end: meetingEnd,
        meeting_location: meetingLocation,
        meeting_participants: meetingParticipants,
        meeting_project: meetingProject,
        meeting_work_type: meetingWorkType,
      }) as Record<string, unknown>;
    } else if (resolvedMode === 'emoji-tone') {
      analysis_json = analyzeEmojiTone(contentText) as Record<string, unknown>;
    } else {
      analysis_json = analyzeMeeting(contentText, {}) as Record<string, unknown>;
    }

    const logId = await createWorkLog({
      ownerId,
      content_text: contentText,
      analysis_json: { ...analysis_json, mode: resolvedMode },
      tags: (analysis_json.hashtags as string[]) ?? [],
      importance: Number(analysis_json.importance) || 3,
      version: 1,
      mode: resolvedMode,
    });

    return NextResponse.json({
      data: {
        id: logId,
        analysis_json,
        analysis: analysis_json,
      },
    });
  } catch (error) {
    console.error('Analyze error:', error);
    return NextResponse.json(
      { error: '분석에 실패했습니다.', details: error instanceof Error ? error.message : '' },
      { status: 500 }
    );
  }
}
