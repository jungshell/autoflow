import { NextResponse } from 'next/server';
import { getUidFromRequest } from '@/lib/apiAuth';
import { getTasks, createTask, updateTask } from '@/lib/firestoreAdmin';
import { listCalendarEvents, getTasksCalendarId } from '@/lib/googleCalendar';

/**
 * Google Calendar에서 이벤트를 가져와서 앱의 Task로 변환합니다.
 * GET: 가져올 수 있는 이벤트 목록 미리보기
 * POST: 실제로 이벤트를 Task로 변환하여 저장
 */
export async function GET(request: Request) {
  try {
    const uid = await getUidFromRequest(request);
    if (!uid) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    // Tasks 캘린더와 primary 캘린더 모두에서 이벤트 가져오기
    const tasksCalendarId = await getTasksCalendarId(uid);
    const calendars = [
      { id: tasksCalendarId || 'primary', name: tasksCalendarId ? 'Tasks' : 'Primary' },
      ...(tasksCalendarId ? [{ id: 'primary', name: 'Primary' }] : []),
    ];

    const allEvents: any[] = [];
    for (const cal of calendars) {
      if (cal.id) {
        const events = await listCalendarEvents(uid, { calendarId: cal.id });
        allEvents.push(...events.map((e) => ({ ...e, calendarName: cal.name })));
      }
    }

    // 기존 Task의 calendarEventId 목록
    const existingTasks = await getTasks(uid);
    const existingEventIds = new Set(
      existingTasks.filter((t) => t.calendarEventId).map((t) => t.calendarEventId!)
    );

    // 이미 가져온 이벤트 제외
    const newEvents = allEvents.filter((e) => !existingEventIds.has(e.id));

    // [업무]가 포함된 이벤트 필터링 (앱에서 생성한 이벤트)
    // "AM 10시 [업무] 도수치료" 같은 형식도 포함
    const taskEvents = newEvents.filter((e) => {
      const summary = e.summary || '';
      return summary.includes('[업무]');
    });

    return NextResponse.json({
      total: allEvents.length,
      new: newEvents.length,
      taskEvents: taskEvents.length,
      events: taskEvents.slice(0, 10).map((e) => ({
        id: e.id,
        summary: e.summary,
        start: e.start?.dateTime || e.start?.date,
        calendarName: e.calendarName,
      })),
    });
  } catch (error) {
    console.error('Error previewing calendar events:', error);
    return NextResponse.json({ error: '이벤트 미리보기 실패' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const uid = await getUidFromRequest(request);
    if (!uid) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const importFromPrimary = body.includePrimary !== false; // 기본값: true

    // Tasks 캘린더와 primary 캘린더에서 이벤트 가져오기
    const tasksCalendarId = await getTasksCalendarId(uid);
    const calendars: { id: string; name: string }[] = [];
    
    if (tasksCalendarId) {
      calendars.push({ id: tasksCalendarId, name: 'Tasks' });
    }
    if (importFromPrimary) {
      calendars.push({ id: 'primary', name: 'Primary' });
    }

    const allEvents: any[] = [];
    for (const cal of calendars) {
      const events = await listCalendarEvents(uid, { calendarId: cal.id });
      allEvents.push(...events.map((e) => ({ ...e, calendarName: cal.name })));
    }

    // 기존 Task의 calendarEventId 목록
    const existingTasks = await getTasks(uid);
    const existingEventIds = new Set(
      existingTasks.filter((t) => t.calendarEventId).map((t) => t.calendarEventId!)
    );

    // 이미 가져온 이벤트 제외
    const newEvents = allEvents.filter((e) => !existingEventIds.has(e.id));

    // [업무]가 포함된 이벤트 필터링 (앱에서 생성한 이벤트)
    // "AM 10시 [업무] 도수치료" 같은 형식도 포함
    const taskEvents = newEvents.filter((e) => {
      if (body.importAll) {
        // 모든 이벤트 가져오기 옵션
        return true;
      }
      // 기본: [업무]가 포함된 이벤트 (시작이 아니어도 됨)
      const summary = e.summary || '';
      return summary.includes('[업무]');
    });

    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const event of taskEvents) {
      try {
        // 이벤트에서 Task 정보 추출
        // "[업무]" 또는 "AM 10시 [업무]" 같은 형식에서 제목 추출
        let title = event.summary || '제목 없음';
        title = title.replace(/^.*?\[업무\]\s*/, '').trim() || title.replace(/\[업무\]/g, '').trim() || title;
        const description = event.description || '';
        
        // 시작 시간을 dueAt으로 사용
        let dueAt: string | undefined;
        if (event.start?.dateTime) {
          dueAt = event.start.dateTime;
        } else if (event.start?.date) {
          // 종일 이벤트인 경우 시간 추가
          const date = new Date(event.start.date);
          date.setHours(9, 0, 0, 0); // 기본 9시
          dueAt = date.toISOString();
        }

        if (!dueAt) {
          failed++;
          errors.push(`${title}: 시작 시간이 없습니다`);
          continue;
        }

        // Task 생성
        const taskId = await createTask({
          title,
          description,
          status: 'todo',
          priority: 'medium',
          ownerId: uid,
          dueAt,
          calendarEventId: event.id, // Google Calendar 이벤트 ID 저장
        });

        imported++;
      } catch (error) {
        failed++;
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${event.summary || '알 수 없음'}: ${message}`);
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      failed,
      total: taskEvents.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error importing calendar events:', error);
    return NextResponse.json({ error: '가져오기 실패' }, { status: 500 });
  }
}
