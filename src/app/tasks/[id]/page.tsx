'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { authFetch } from '@/lib/apiClient';
import type { Task } from '@/types/models';
import NewTaskModal from '@/components/NewTaskModal';
import { useContacts } from '@/hooks/useContacts';
import { useAuth } from '@/components/AuthProvider';

const STATUS_LABEL: Record<string, string> = {
  todo: '할 일',
  in_progress: '진행 중',
  done: '완료',
  blocked: '보류',
};
const PRIORITY_LABEL: Record<string, string> = {
  low: '낮음',
  medium: '중간',
  high: '높음',
  urgent: '긴급',
};

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';
  const { contacts } = useContacts();
  const { user } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!id) return;
    authFetch(`/api/tasks/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(setTask)
      .catch(() => setTask(null))
      .finally(() => setLoading(false));
  }, [id]);

  const assigneeName = task?.assigneeId
    ? contacts.find((c) => c.id === task.assigneeId)?.name
    : undefined;
  const receivedAtStr = task?.receivedAt ? formatDate(task.receivedAt) : '—';

  const handleDelete = async () => {
    if (!task || !confirm('이 업무를 삭제할까요?')) return;
    const res = await authFetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
    if (res.ok) router.push('/tasks');
    else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? '삭제에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 flex items-center justify-center">
        <p className="text-zinc-500 dark:text-zinc-400">로딩 중...</p>
      </div>
    );
  }
  if (!task) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 flex flex-col items-center justify-center gap-4">
        <p className="text-zinc-500 dark:text-zinc-400">업무를 찾을 수 없습니다.</p>
        <Link href="/tasks" className="text-sm font-semibold text-black underline dark:text-zinc-100">
          전체 업무로
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 pt-10">
        <Link
          href="/tasks"
          className="text-sm font-semibold text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← 전체 업무
        </Link>
        <Link
          href="/"
          className="text-sm font-semibold text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          대시보드
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className="rounded-3xl bg-white p-6 shadow-sm dark:bg-zinc-800 dark:shadow-none">
          <h1 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">{task.title}</h1>
          <dl className="space-y-4 text-sm">
            {task.description && (
              <div>
                <dt className="text-zinc-500 dark:text-zinc-400">설명</dt>
                <dd className="whitespace-pre-wrap text-zinc-800 dark:text-zinc-300">{task.description}</dd>
              </div>
            )}
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">지시자</dt>
              <dd className="text-zinc-900 dark:text-zinc-100">{task.assigner ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">업무접수일</dt>
              <dd className="text-zinc-900 dark:text-zinc-100">{receivedAtStr}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">마감일</dt>
              <dd className="text-zinc-900 dark:text-zinc-100">{formatDate(task.dueAt)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">담당자</dt>
              <dd className="text-zinc-900 dark:text-zinc-100">{assigneeName ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">우선순위</dt>
              <dd className="text-zinc-900 dark:text-zinc-100">{PRIORITY_LABEL[task.priority] ?? task.priority}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 dark:text-zinc-400">상태</dt>
              <dd className="text-zinc-900 dark:text-zinc-100">{STATUS_LABEL[task.status] ?? task.status}</dd>
            </div>
          </dl>
          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-full border border-black bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-zinc-50 dark:border-zinc-400 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600"
            >
              수정
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              삭제
            </button>
          </div>
        </div>
      </main>

      <NewTaskModal
        open={editing}
        contacts={contacts}
        onClose={() => setEditing(false)}
        onCreated={() => {}}
        initialTask={task}
        ownerId={user?.uid ?? 'user1'}
        onUpdated={() => {
          authFetch(`/api/tasks/${id}`)
            .then((res) => (res.ok ? res.json() : null))
            .then(setTask);
          setEditing(false);
        }}
      />
    </div>
  );
}
