import { NextResponse } from 'next/server';
import { getTaskById, updateTask, deleteTask } from '@/lib/firestoreAdmin';
import { getUidFromRequest } from '@/lib/apiAuth';
import { API_MESSAGES } from '@/lib/apiMessages';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/googleCalendar';

function canAccessTask(task: { ownerId?: string }, uid: string | null): boolean {
  if (!uid) return true;
  return task.ownerId === uid;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const uid = await getUidFromRequest(request);
    const task = await getTaskById(id);
    if (!task) {
      return NextResponse.json({ error: API_MESSAGES.TASK_NOT_FOUND }, { status: 404 });
    }
    if (!canAccessTask(task, uid)) {
      return NextResponse.json({ error: '이 업무에 접근할 수 없습니다.' }, { status: 403 });
    }
    return NextResponse.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { error: API_MESSAGES.TASKS_FETCH_FAIL },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const uid = await getUidFromRequest(request);
    const existing = await getTaskById(id);
    if (!existing) {
      return NextResponse.json({ error: API_MESSAGES.TASK_NOT_FOUND }, { status: 404 });
    }
    if (!canAccessTask(existing, uid)) {
      return NextResponse.json({ error: '이 업무를 수정할 수 없습니다.' }, { status: 403 });
    }
    const body = await request.json();
    await updateTask(id, body);
    
    // Google Calendar 동기화 (비동기, 실패해도 Task 수정은 성공)
    if (uid) {
      try {
        const updatedTask = { ...existing, ...body };
        if (existing.calendarEventId) {
          // 기존 이벤트가 있으면 업데이트 또는 삭제
          if (updatedTask.dueAt) {
            await updateCalendarEvent(uid, existing.calendarEventId, {
              id: updatedTask.id,
              title: updatedTask.title,
              description: updatedTask.description,
              dueAt: updatedTask.dueAt,
            });
          } else {
            // 마감일이 제거되면 이벤트 삭제
            await deleteCalendarEvent(uid, existing.calendarEventId);
            await updateTask(id, { calendarEventId: undefined });
          }
        } else if (updatedTask.dueAt) {
          // 이벤트가 없고 마감일이 추가되면 생성
          const eventId = await createCalendarEvent(uid, {
            id: updatedTask.id,
            title: updatedTask.title,
            description: updatedTask.description,
            dueAt: updatedTask.dueAt,
          });
          if (eventId) {
            await updateTask(id, { calendarEventId: eventId });
          }
        }
      } catch (calError) {
        console.warn('Calendar sync failed (task updated):', calError);
        // 캘린더 동기화 실패해도 Task 수정은 성공으로 처리
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: API_MESSAGES.TASK_UPDATE_FAIL },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const uid = await getUidFromRequest(request);
    const existing = await getTaskById(id);
    if (!existing) {
      return NextResponse.json({ error: API_MESSAGES.TASK_NOT_FOUND }, { status: 404 });
    }
    if (!canAccessTask(existing, uid)) {
      return NextResponse.json({ error: '이 업무를 삭제할 수 없습니다.' }, { status: 403 });
    }
    
    // Google Calendar 이벤트 삭제 (비동기, 실패해도 Task 삭제는 성공)
    if (uid && existing.calendarEventId) {
      try {
        await deleteCalendarEvent(uid, existing.calendarEventId);
      } catch (calError) {
        console.warn('Calendar sync failed (task deleted):', calError);
        // 캘린더 동기화 실패해도 Task 삭제는 성공으로 처리
      }
    }
    
    await deleteTask(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: API_MESSAGES.TASK_DELETE_FAIL },
      { status: 500 }
    );
  }
}
