import { NextResponse } from 'next/server';
import { getTasks, createTask } from '@/lib/firestoreAdmin';
import { getUidFromRequest } from '@/lib/apiAuth';
import { API_MESSAGES } from '@/lib/apiMessages';

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
