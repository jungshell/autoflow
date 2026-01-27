import { NextResponse } from 'next/server';
import { getUidFromRequest } from '@/lib/apiAuth';
import { getTasks, getTaskById, updateTask } from '@/lib/firestoreAdmin';
import { createCalendarEvent } from '@/lib/googleCalendar';

/**
 * 기존 Task들에 대한 Google Calendar 이벤트 일괄 생성/동기화
 * GET: 동기화 상태 확인
 * POST: 마감일이 있지만 캘린더 이벤트가 없는 Task들에 대해 이벤트 생성
 */
export async function GET(request: Request) {
  try {
    const uid = await getUidFromRequest(request);
    if (!uid) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const tasks = await getTasks(uid);
    const tasksWithDueDate = tasks.filter((t) => t.dueAt && !t.calendarEventId);
    const tasksWithEvent = tasks.filter((t) => t.calendarEventId);

    return NextResponse.json({
      total: tasks.length,
      withDueDate: tasksWithDueDate.length,
      withEvent: tasksWithEvent.length,
      needsSync: tasksWithDueDate.length,
    });
  } catch (error) {
    console.error('Error checking sync status:', error);
    return NextResponse.json({ error: '동기화 상태 확인 실패' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const uid = await getUidFromRequest(request);
    if (!uid) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const tasks = await getTasks(uid);
    const tasksToSync = tasks.filter((t) => t.dueAt && !t.calendarEventId);

    if (tasksToSync.length === 0) {
      return NextResponse.json({
        success: true,
        message: '동기화할 Task가 없습니다.',
        synced: 0,
        failed: 0,
      });
    }

    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const task of tasksToSync) {
      try {
        const eventId = await createCalendarEvent(uid, {
          id: task.id,
          title: task.title,
          description: task.description,
          dueAt: task.dueAt!,
        });

        if (eventId) {
          await updateTask(task.id, { calendarEventId: eventId });
          synced++;
        } else {
          failed++;
          errors.push(`${task.title}: 이벤트 생성 실패`);
        }
      } catch (error) {
        failed++;
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${task.title}: ${message}`);
      }
    }

    return NextResponse.json({
      success: true,
      synced,
      failed,
      total: tasksToSync.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error syncing calendar events:', error);
    return NextResponse.json({ error: '동기화 실패' }, { status: 500 });
  }
}
