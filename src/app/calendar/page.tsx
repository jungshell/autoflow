'use client';

import { useState, useMemo } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useContacts } from '@/hooks/useContacts';
import { useAuth } from '@/components/AuthProvider';
import NewTaskModal from '@/components/NewTaskModal';
import { formatDate } from '@/lib/utils';

type ViewMode = 'month' | 'week';

export default function CalendarPage() {
  const { tasks, loading, refetch } = useTasks();
  const { contacts } = useContacts();
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 월간 뷰: 해당 월의 첫 날과 마지막 날
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstDayWeekday = firstDayOfMonth.getDay(); // 0 (일) ~ 6 (토)

  // 주간 뷰: 현재 날짜가 포함된 주의 시작일 (일요일)
  const currentWeekStart = new Date(currentDate);
  currentWeekStart.setDate(currentDate.getDate() - currentDate.getDay());

  // 필터링된 업무
  const filteredTasks = useMemo(() => {
    let filtered = [...tasks];
    if (priorityFilter) {
      filtered = filtered.filter((t) => t.priority === priorityFilter);
    }
    if (statusFilter) {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }
    return filtered;
  }, [tasks, priorityFilter, statusFilter]);

  // 날짜별로 업무 그룹화 (타임존 문제 해결: 로컬 날짜 기준)
  const tasksByDate = useMemo(() => {
    const map = new Map<string, typeof filteredTasks>();
    filteredTasks.forEach((task) => {
      if (task.dueAt) {
        // ISO 문자열을 로컬 시간 기준으로 파싱하여 날짜 키 생성
        const date = new Date(task.dueAt);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(task);
      }
    });
    return map;
  }, [filteredTasks]);

  // 날짜별 업무 개수 (밀도 시각화용)
  const taskCountsByDate = useMemo(() => {
    const counts = new Map<string, number>();
    tasksByDate.forEach((tasks, dateKey) => {
      counts.set(dateKey, tasks.length);
    });
    return counts;
  }, [tasksByDate]);

  // 최대 업무 개수 (밀도 색상 계산용)
  const maxTaskCount = useMemo(() => {
    if (taskCountsByDate.size === 0) return 1;
    return Math.max(...Array.from(taskCountsByDate.values()));
  }, [taskCountsByDate]);

  // 월간 뷰: 42일 (6주 × 7일) 생성
  const monthDays = useMemo(() => {
    const days: Date[] = [];
    // 첫 주의 빈 칸 채우기
    for (let i = 0; i < firstDayWeekday; i++) {
      const date = new Date(year, month, 1 - firstDayWeekday + i);
      days.push(date);
    }
    // 해당 월의 날짜들
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      days.push(new Date(year, month, day));
    }
    // 마지막 주의 빈 칸 채우기
    const remaining = 42 - days.length;
    for (let day = 1; day <= remaining; day++) {
      days.push(new Date(year, month + 1, day));
    }
    return days;
  }, [year, month, firstDayWeekday, lastDayOfMonth]);

  // 주간 뷰: 7일 생성
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      days.push(date);
    }
    return days;
  }, [currentWeekStart]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + (direction === 'prev' ? -7 : 7));
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 시간 포맷팅 (HH:mm)
  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === month && date.getFullYear() === year;
  };

  const getTasksForDate = (date: Date) => {
    const key = getDateKey(date);
    return tasksByDate.get(key) || [];
  };

  const weekDayNames = ['일', '월', '화', '수', '목', '금', '토'];

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 flex items-center justify-center">
        <p className="text-zinc-500 dark:text-zinc-400">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
      <main className="mx-auto w-full max-w-7xl px-6 pb-8 pt-4">
        {/* 필터 바 */}
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">필터:</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <option value="">우선순위 전체</option>
            <option value="urgent">긴급</option>
            <option value="high">높음</option>
            <option value="medium">중간</option>
            <option value="low">낮음</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <option value="">상태 전체</option>
            <option value="todo">할 일</option>
            <option value="in_progress">진행 중</option>
            <option value="done">완료</option>
            <option value="blocked">차단됨</option>
          </select>
          {(priorityFilter || statusFilter) && (
            <button
              onClick={() => {
                setPriorityFilter('');
                setStatusFilter('');
              }}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              필터 초기화
            </button>
          )}
        </div>

        {/* 컨트롤 바 */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          {/* 왼쪽: 월간, 주간 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('month')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                viewMode === 'month'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'
              }`}
            >
              월간
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                viewMode === 'week'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'
              }`}
            >
              주간
            </button>
          </div>

          {/* 가운데: < 2026년 1월 > */}
          <div className="flex items-center gap-2">
            <button
              onClick={viewMode === 'month' ? () => navigateMonth('prev') : () => navigateWeek('prev')}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              ←
            </button>
            <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 min-w-[120px] text-center">
              {viewMode === 'month'
                ? `${year}년 ${month + 1}월`
                : `${weekDays[0].getMonth() + 1}/${weekDays[0].getDate()} - ${weekDays[6].getMonth() + 1}/${weekDays[6].getDate()}`}
            </div>
            <button
              onClick={viewMode === 'month' ? () => navigateMonth('next') : () => navigateWeek('next')}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              →
            </button>
          </div>

          {/* 오른쪽: 오늘, + */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              오늘
            </button>
            <button
              onClick={() => {
                setSelectedDate(currentDate);
                setIsNewTaskOpen(true);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-black text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              title="새 업무 추가"
            >
              +
            </button>
          </div>
        </div>

        {/* 캘린더 그리드 */}
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-700">
            {weekDayNames.map((day) => (
              <div
                key={day}
                className="border-r border-zinc-200 p-3 text-center text-sm font-semibold text-zinc-600 last:border-r-0 dark:border-zinc-700 dark:text-zinc-400"
              >
                {day}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7">
            {(viewMode === 'month' ? monthDays : weekDays).map((date, idx) => {
              const dateTasks = getTasksForDate(date);
              const isCurrentMonthDay = isCurrentMonth(date);
              const isTodayDate = isToday(date);

              return (
                <div
                  key={idx}
                  className={`min-h-[120px] border-r border-b border-zinc-200 p-2 last:border-r-0 dark:border-zinc-700 ${
                    !isCurrentMonthDay && viewMode === 'month'
                      ? 'bg-zinc-50 dark:bg-zinc-900/50'
                      : 'bg-white dark:bg-zinc-800'
                  }`}
                  onDoubleClick={() => {
                    setSelectedDate(date);
                    setIsNewTaskOpen(true);
                  }}
                  title="더블클릭하여 해당 날짜에 업무 추가"
                >
                  <div
                    className={`mb-1 text-sm font-medium ${
                      isTodayDate
                        ? 'flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white'
                        : isCurrentMonthDay
                        ? 'text-zinc-900 dark:text-zinc-100'
                        : 'text-zinc-400 dark:text-zinc-600'
                    }`}
                  >
                    {date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dateTasks.slice(0, 3).map((task) => {
                      const priorityColors = {
                        urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
                        high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
                        medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
                        low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
                      };
                      const color =
                        priorityColors[task.priority || 'medium'] || priorityColors.medium;
                      return (
                        <div
                          key={task.id}
                          className={`truncate rounded px-1.5 py-0.5 text-xs ${color}`}
                          title={task.title}
                        >
                          {task.title}
                        </div>
                      );
                    })}
                    {dateTasks.length > 3 && (
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        +{dateTasks.length - 3}건
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 범례 및 통계 */}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-800">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">우선순위:</span>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
                긴급
              </span>
              <span className="rounded bg-orange-100 px-2 py-1 text-xs text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                높음
              </span>
              <span className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                중간
              </span>
              <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-300">
                낮음
              </span>
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-800">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">업무 밀도:</span>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-emerald-200 dark:bg-emerald-900/40" />
                <span className="text-xs text-zinc-600 dark:text-zinc-400">적음 (1-2건)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-orange-200 dark:bg-orange-900/40" />
                <span className="text-xs text-zinc-600 dark:text-zinc-400">보통 (3-4건)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-200 dark:bg-red-900/40" />
                <span className="text-xs text-zinc-600 dark:text-zinc-400">많음 (5건 이상)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 업무 충돌 감지 알림 */}
        {(() => {
          const conflicts: Array<{ date: string; tasks: typeof filteredTasks; time: string }> = [];
          tasksByDate.forEach((dateTasks, dateKey) => {
            // 같은 시간대에 여러 업무가 있는지 확인
            const timeSlots = new Map<string, typeof dateTasks>();
            dateTasks.forEach((task) => {
              if (task.dueAt) {
                const time = formatTime(task.dueAt);
                if (!timeSlots.has(time)) {
                  timeSlots.set(time, []);
                }
                timeSlots.get(time)!.push(task);
              }
            });
            timeSlots.forEach((tasks, time) => {
              if (tasks.length > 1) {
                conflicts.push({ date: dateKey, tasks, time });
              }
            });
          });
          return conflicts;
        })().length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs dark:border-amber-800 dark:bg-amber-900/20">
            <div className="flex items-start gap-2">
              <span className="text-amber-600 dark:text-amber-400">⚠️</span>
              <div className="flex-1">
                <p className="font-semibold text-amber-800 dark:text-amber-200">업무 시간 충돌 감지</p>
                <p className="mt-1 text-amber-700 dark:text-amber-300">
                  같은 시간대에 여러 업무가 있습니다. 일정을 조정해 주세요.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 새 업무 모달 */}
      <NewTaskModal
        open={isNewTaskOpen}
        contacts={contacts}
        onClose={() => {
          setIsNewTaskOpen(false);
          setSelectedDate(null);
        }}
        onCreated={() => {
          refetch();
          setIsNewTaskOpen(false);
          setSelectedDate(null);
        }}
        ownerId={user?.uid ?? 'user1'}
        initialDueDate={selectedDate ? selectedDate.toISOString().slice(0, 10) : undefined}
      />
    </div>
  );
}
