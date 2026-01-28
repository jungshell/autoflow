'use client';

import { useState, useMemo } from 'react';
import { useTasks } from '@/hooks/useTasks';
import Header from '@/components/Header';
import { formatDate } from '@/lib/utils';

type ViewMode = 'month' | 'week';

export default function CalendarPage() {
  const { tasks, loading } = useTasks();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 월간 뷰: 해당 월의 첫 날과 마지막 날
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstDayWeekday = firstDayOfMonth.getDay(); // 0 (일) ~ 6 (토)

  // 주간 뷰: 현재 날짜가 포함된 주의 시작일 (일요일)
  const currentWeekStart = new Date(currentDate);
  currentWeekStart.setDate(currentDate.getDate() - currentDate.getDay());

  // 날짜별로 업무 그룹화
  const tasksByDate = useMemo(() => {
    const map = new Map<string, typeof tasks>();
    tasks.forEach((task) => {
      if (task.dueAt) {
        const dateKey = new Date(task.dueAt).toISOString().split('T')[0];
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(task);
      }
    });
    return map;
  }, [tasks]);

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
    return date.toISOString().split('T')[0];
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
              onClick={() => window.location.href = '/tasks'}
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

        {/* 범례 */}
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-700 dark:bg-zinc-800">
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">우선순위:</span>
          <div className="flex items-center gap-2">
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
      </main>
    </div>
  );
}
