import { NextResponse } from 'next/server';
import { getTaskById, updateTask, deleteTask } from '@/lib/firestoreAdmin';
import { getUidFromRequest } from '@/lib/apiAuth';
import { API_MESSAGES } from '@/lib/apiMessages';

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
