import { NextResponse } from 'next/server';
import { getTasks, createTask, getTaskById, updateTask } from '@/lib/firestoreAdmin';
import { getUidFromRequest } from '@/lib/apiAuth';
import { API_MESSAGES } from '@/lib/apiMessages';
import { createCalendarEvent } from '@/lib/googleCalendar';

export async function GET(request: Request) {
  try {
    const uid = await getUidFromRequest(request);
    const tasks = await getTasks(uid ?? undefined);
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: API_MESSAGES.TASKS_FETCH_FAIL }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const uid = await getUidFromRequest(request);
    const body = await request.json();
    const ownerId = uid ?? body.ownerId ?? 'user1';
    const taskId = await createTask({ ...body, ownerId });
    
    // Google Calendar 동기화 (비동기, 실패해도 Task 생성은 성공)
    if (uid && body.dueAt) {
      try {
        const eventId = await createCalendarEvent(uid, {
          id: taskId,
          title: body.title,
          description: body.description,
          dueAt: body.dueAt,
        });
        if (eventId) {
          // 이벤트 ID를 Task에 저장
          await updateTask(taskId, { calendarEventId: eventId });
        }
      } catch (calError) {
        console.warn('Calendar sync failed (task created):', calError);
        // 캘린더 동기화 실패해도 Task 생성은 성공으로 처리
      }
    }
    
    return NextResponse.json({ id: taskId });
  } catch (error) {
    console.error('Error creating task:', error);
    const message =
      error instanceof Error && error.message.includes('Firebase Admin')
        ? error.message
        : API_MESSAGES.TASK_CREATE_FAIL;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
