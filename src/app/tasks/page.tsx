'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import AlertCenter from '@/components/AlertCenter';
import ContactsSection from '@/components/ContactsSection';
import CopyReviewSection from '@/components/CopyReviewSection';
import Header from '@/components/Header';
import QuickAddAndSearch from '@/components/QuickAddAndSearch';
import MetricCard from '@/components/MetricCard';
import NextActions from '@/components/NextActions';
import OverviewStrip from '@/components/OverviewStrip';
import PriorityList from '@/components/PriorityList';
import TemplateSection from '@/components/TemplateSection';
import NewTaskModal from '@/components/NewTaskModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import { useTasks } from '@/hooks/useTasks';
import { useContacts } from '@/hooks/useContacts';
import { useAlerts } from '@/hooks/useAlerts';
import { useTemplates } from '@/hooks/useTemplates';
import { useAuth } from '@/components/AuthProvider';
import { calculatePriority } from '@/lib/taskUtils';
import { formatDate } from '@/lib/utils';
import { getSettings, isQuietHourNow } from '@/lib/settings';
import { authFetch } from '@/lib/apiClient';
import type { Task } from '@/types/models';
import type { TaskStatus, TaskPriority } from '@/types/models';
import type { Template } from '@/types/models';

const TASKS_FILTER_KEY = 'autoflow_tasks_filter';
type StatusFilter = 'all' | 'todo' | 'in_progress' | 'due_today';

const PRIORITY_OPTIONS: { value: TaskPriority | ''; label: string }[] = [
  { value: '', label: '우선순위 전체' },
  { value: 'urgent', label: '긴급' },
  { value: 'high', label: '높음' },
  { value: 'medium', label: '중간' },
  { value: 'low', label: '낮음' },
];

export default function TasksPage() {
  const { tasks, loading: tasksLoading, refetch, quickAdd, updateStatusOptimistic } = useTasks();
  const { contacts, loading: contactsLoading } = useContacts();
  const { alerts, loading: alertsLoading } = useAlerts();
  const { templates } = useTemplates();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | ''>('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkChanging, setBulkChanging] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [templateForNewTask, setTemplateForNewTask] = useState<Template | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [quietHoursActive, setQuietHoursActive] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(TASKS_FILTER_KEY);
      if (raw) {
        const p = JSON.parse(raw) as { search?: string; statusFilter?: string; priorityFilter?: string; assigneeFilter?: string };
        if (p.search !== undefined) setSearch(p.search);
        if (p.statusFilter !== undefined && ['all', 'todo', 'in_progress', 'due_today'].includes(p.statusFilter)) setStatusFilter(p.statusFilter as StatusFilter);
        if (p.priorityFilter !== undefined) setPriorityFilter(p.priorityFilter as TaskPriority | '');
        if (p.assigneeFilter !== undefined) setAssigneeFilter(p.assigneeFilter);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        TASKS_FILTER_KEY,
        JSON.stringify({ search, statusFilter, priorityFilter, assigneeFilter })
      );
    } catch {
      // ignore
    }
  }, [search, statusFilter, priorityFilter, assigneeFilter]);

  useEffect(() => {
    const tick = () => setQuietHoursActive(isQuietHourNow(getSettings()));
    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch('/api/automation/delay-detection', { method: 'POST' }).catch(console.error);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !/(INPUT|TEXTAREA)/.test((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if ((e.key === 'n' && !e.ctrlKey && !e.metaKey) || ((e.ctrlKey || e.metaKey) && e.key === 'k')) {
        const target = e.target as HTMLElement;
        if (target.closest('input') || target.closest('textarea')) return;
        e.preventDefault();
        setIsNewTaskOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const metrics = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const todo = tasks.filter(t => t.status === 'todo').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const blocked = tasks.filter(t => t.status === 'blocked').length;
    const now = new Date();
    const delayed = tasks.filter(t => {
      if (t.status === 'done') return false;
      const dueDate = t.dueAt ? new Date(t.dueAt) : null;
      return dueDate && dueDate < now;
    });
    const delayedCount = delayed.length;
    const delayedTitles = delayed.slice(0, 5).map(t => t.title);
    const completionDetail = totalTasks === 0
      ? '등록된 업무가 없습니다.'
      : `완료 ${completedTasks}건 / 전체 ${totalTasks}건\n할 일 ${todo}건, 진행 중 ${inProgress}건, 완료 ${completedTasks}건, 보류 ${blocked}건`;
    const delayedDetail = delayedCount === 0
      ? '지연된 업무가 없습니다.'
      : `마감일이 지난 미완료 업무:\n${delayedTitles.map((title, i) => `${i + 1}. ${title}`).join('\n')}${delayed.length > 5 ? `\n… 외 ${delayed.length - 5}건` : ''}`;
    const totalDetail = totalTasks === 0
      ? '등록된 업무가 없습니다.'
      : `할 일 ${todo}건, 진행 중 ${inProgress}건, 완료 ${completedTasks}건, 보류 ${blocked}건`;
    return { completionRate, delayedCount, totalTasks, completionDetail, delayedDetail, totalDetail };
  }, [tasks]);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

  const prioritizedTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = tasks
      .filter(t => t.status !== 'done')
      .map(task => ({ ...task, calculatedPriority: calculatePriority(task) }));

    if (statusFilter === 'todo') list = list.filter(t => t.status === 'todo');
    else if (statusFilter === 'in_progress') list = list.filter(t => t.status === 'in_progress');
    else if (statusFilter === 'due_today') {
      list = list.filter(t => {
        if (!t.dueAt) return false;
        const d = new Date(t.dueAt).getTime();
        return d >= startOfToday.getTime() && d < endOfToday.getTime();
      });
    }

    if (q) {
      list = list.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description?.toLowerCase().includes(q)) ||
        (t.assigner?.toLowerCase().includes(q)) ||
        (t.assigneeId && contacts.find(c => c.id === t.assigneeId)?.name?.toLowerCase().includes(q))
      );
    }
    if (priorityFilter) list = list.filter(t => t.priority === priorityFilter);
    if (assigneeFilter) list = list.filter(t => t.assigneeId === assigneeFilter);

    list.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.calculatedPriority] || 0;
      const bPriority = priorityOrder[b.calculatedPriority] || 0;
      if (aPriority !== bPriority) return bPriority - aPriority;
      const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
      const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
      return aDue - bDue;
    });

    return list.map(task => {
      const dueTime = task.dueAt ? new Date(task.dueAt).getTime() : null;
      const isDueToday = dueTime != null && dueTime >= startOfToday.getTime() && dueTime < endOfToday.getTime();
      return {
        taskId: task.id,
        title: task.title,
        assignee: task.assigneeId ? contacts.find(c => c.id === task.assigneeId)?.name || '담당자 없음' : '담당자 없음',
        due: formatDate(task.dueAt),
        status: task.calculatedPriority === 'urgent' ? '긴급' : task.calculatedPriority === 'high' ? '높음' : task.calculatedPriority === 'medium' ? '중간' : '낮음',
        statusValue: task.status,
        isDueToday,
      };
    });
  }, [tasks, contacts, statusFilter, search, priorityFilter, assigneeFilter]);

  const nextActions = useMemo(() => {
    const urgentTasks = tasks.filter(t => {
      if (t.status === 'done') return false;
      const dueDate = t.dueAt ? new Date(t.dueAt) : null;
      if (!dueDate) return false;
      const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursUntilDue <= 48 && hoursUntilDue > 0;
    }).length;
    return [
      urgentTasks > 0 ? `미완료 업무 중 가장 지연 위험 높은 ${urgentTasks}건 확인` : '모든 업무가 정상 진행 중입니다',
      '연락처별 업무 묶음에서 우선순위 재정렬',
      '오늘의 요약 리포트 자동 발송 설정 확인',
    ];
  }, [tasks]);

  const alertMessages = useMemo(() => alerts.map(alert => alert.message), [alerts]);

  const contactsWithTasks = useMemo(() => {
    return contacts
      .map(contact => {
        const contactTasks = tasks.filter(t => t.assigneeId === contact.id);
        return {
          id: contact.id,
          name: contact.name,
          label: contact.company || '연락처',
          taskCount: contactTasks.length,
          tasks: contactTasks.map(t => ({ id: t.id, title: t.title })),
        };
      })
      .filter(c => c.taskCount > 0);
  }, [contacts, tasks]);

  const overview = useMemo(() => {
    const pending = tasks.filter(t => t.status !== 'done' && t.status !== 'blocked');
    const doneCount = tasks.filter(t => t.status === 'done').length;
    const delayedCount = pending.filter(t => t.dueAt && new Date(t.dueAt) < now).length;
    const dueTodayCount = pending.filter(t => {
      if (!t.dueAt) return false;
      const d = new Date(t.dueAt).getTime();
      return d >= startOfToday.getTime() && d < endOfToday.getTime();
    }).length;
    const focus = [...pending]
      .sort((a, b) => {
        const order = { urgent: 4, high: 3, medium: 2, low: 1 };
        return (order[b.priority] ?? 0) - (order[a.priority] ?? 0);
      })
      .slice(0, 3);
    return {
      pendingCount: pending.length,
      doneCount,
      delayedCount,
      dueTodayCount,
      focusTitles: focus.map(t => t.title),
      focusTaskId: focus[0]?.id ?? null,
    };
  }, [tasks]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === prioritizedTasks.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(prioritizedTasks.map(t => t.taskId)));
  };

  const setBulkStatus = async (status: TaskStatus) => {
    if (selectedIds.size === 0) return;
    setBulkChanging(true);
    try {
      for (const id of selectedIds) {
        await updateStatusOptimistic(id, status);
      }
      setSelectedIds(new Set());
    } catch {
      refetch();
    } finally {
      setBulkChanging(false);
    }
  };

  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) ?? null : null;
  const assigneeName = selectedTask?.assigneeId ? contacts.find(c => c.id === selectedTask.assigneeId)?.name : undefined;
  const showLoading = (tasksLoading || contactsLoading || alertsLoading) && !isNewTaskOpen && !editingTask;

  if (showLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <p className="text-zinc-500 dark:text-zinc-400">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 space-y-4">
      <Header
        title="업무"
        subtitle="AutoFlow"
        ctaLabel="+ 새 업무"
        onAddTask={() => setIsNewTaskOpen(true)}
        showSettingsLink={true}
      />

      <main className="mx-auto w-full max-w-6xl space-y-4 px-6 pb-8">
        <section className="flex flex-wrap items-center gap-4">
          <QuickAddAndSearch
            tasks={tasks}
            contacts={contacts}
            ownerId={user?.uid ?? 'user1'}
            onQuickAdd={async (title) => { await quickAdd(title, user?.uid ?? 'user1'); }}
            onTaskSelect={setSelectedTaskId}
            inputRef={searchInputRef}
          />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">/ 검색 · N 새 업무</span>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="오늘 완료율"
            value={`${metrics.completionRate}%`}
            description="자동 분류된 우선순위 기준"
            detail={metrics.completionDetail}
          />
          <MetricCard
            label="지연 위험"
            value={`${metrics.delayedCount}건`}
            description="병목 탐지 알림 활성"
            detail={metrics.delayedDetail}
          />
          <MetricCard
            label="총 업무"
            value={`${metrics.totalTasks}건`}
            description="전체 업무 수"
            detail={metrics.totalDetail}
          />
        </section>

        <OverviewStrip
          pendingCount={overview.pendingCount}
          doneCount={overview.doneCount}
          delayedCount={overview.delayedCount}
          dueTodayCount={overview.dueTodayCount}
          focusTitles={overview.focusTitles}
          focusTaskId={overview.focusTaskId}
        />

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {[
                { value: 'all' as const, label: '전체' },
                { value: 'todo' as const, label: '할 일만' },
                { value: 'in_progress' as const, label: '진행 중만' },
                { value: 'due_today' as const, label: '오늘 마감' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    statusFilter === value
                      ? 'bg-black text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'
                  }`}
                >
                  {label}
                </button>
              ))}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | '')}
                className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                aria-label="우선순위 필터"
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value || 'all'} value={o.value}>{o.label}</option>
                ))}
              </select>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                aria-label="담당자 필터"
              >
                <option value="">담당자 전체</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {prioritizedTasks.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  총 {prioritizedTasks.length}건
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-xs font-semibold text-zinc-600 dark:text-zinc-400"
                  >
                    {selectedIds.size === prioritizedTasks.length ? '전체 해제' : '전체 선택'}
                  </button>
                  {selectedIds.size > 0 && (
                    <>
                      <span className="text-zinc-400">|</span>
                      <span className="text-xs text-zinc-500">{selectedIds.size}건 선택</span>
                      <button
                        type="button"
                        onClick={() => setBulkStatus('in_progress')}
                        disabled={bulkChanging}
                        className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600 disabled:opacity-50"
                      >
                        진행 중
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkStatus('done')}
                        disabled={bulkChanging}
                        className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 disabled:opacity-50"
                      >
                        완료
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            <PriorityList
              items={prioritizedTasks}
              onTaskClick={setSelectedTaskId}
              onStatusChange={async (taskId, status) => {
                try { await updateStatusOptimistic(taskId, status); } catch { refetch(); }
              }}
              onQuickComplete={async (taskId) => {
                try { await updateStatusOptimistic(taskId, 'done'); } catch { refetch(); }
              }}
              showAllView={true}
              selectable={true}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />
          </div>

          <div className="space-y-6">
            <AlertCenter alerts={alertMessages} quietHoursActive={quietHoursActive} />
            <NextActions actions={nextActions} />
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <TemplateSection
            templates={templates}
            onUseTemplate={(t) => {
              setTemplateForNewTask(t);
              setIsNewTaskOpen(true);
            }}
          />
          <CopyReviewSection />
        </section>

        {contactsWithTasks.length > 0 && (
          <ContactsSection contacts={contactsWithTasks} />
        )}
      </main>

      <NewTaskModal
        open={isNewTaskOpen || Boolean(editingTask)}
        contacts={contacts}
        onClose={() => {
          setIsNewTaskOpen(false);
          setTemplateForNewTask(null);
          setEditingTask(null);
        }}
        onCreated={() => refetch()}
        initialTask={editingTask ?? undefined}
        onUpdated={() => refetch()}
        ownerId={user?.uid ?? 'user1'}
        initialTitle={templateForNewTask?.name}
        initialDescription={templateForNewTask?.checklist?.length ? templateForNewTask.checklist.map((s, i) => `${i + 1}. ${s}`).join('\n') : templateForNewTask?.description}
      />

      <TaskDetailModal
        task={selectedTask}
        assigneeName={assigneeName}
        onClose={() => setSelectedTaskId(null)}
        onEdit={() => {
          if (selectedTask) {
            setEditingTask(selectedTask);
            setSelectedTaskId(null);
          }
        }}
        onDelete={async () => {
          if (!selectedTaskId || !confirm('이 업무를 삭제할까요?')) return;
          try {
            const res = await authFetch(`/api/tasks/${selectedTaskId}`, { method: 'DELETE' });
            if (res.ok) {
              refetch();
              setSelectedTaskId(null);
            } else {
              const data = await res.json().catch(() => ({}));
              alert(data.error ?? '삭제에 실패했습니다.');
            }
          } catch {
            alert('삭제에 실패했습니다.');
          }
        }}
      />
    </div>
  );
}
