'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getSettings, setSettings, type Settings, type TemplateSchedule } from '@/lib/settings';
import { useTheme } from '@/components/ThemeProvider';
import { useTemplates } from '@/hooks/useTemplates';
import { authFetch } from '@/lib/apiClient';

const DAY_LABELS: { value: TemplateSchedule['day']; label: string }[] = [
  { value: 'monday', label: '월' },
  { value: 'tuesday', label: '화' },
  { value: 'wednesday', label: '수' },
  { value: 'thursday', label: '목' },
  { value: 'friday', label: '금' },
  { value: 'saturday', label: '토' },
  { value: 'sunday', label: '일' },
];

function SettingsContent() {
  const searchParams = useSearchParams();
  const [settings, setState] = useState<Settings>({});
  const [saved, setSaved] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [newSchedule, setNewSchedule] = useState<{ templateId: string; day: TemplateSchedule['day']; time: string }>({ templateId: '', day: 'monday', time: '09:00' });
  const [calendarLinking, setCalendarLinking] = useState(false);
  const { theme, setTheme } = useTheme();
  const { templates } = useTemplates();
  const calendarStatus = searchParams.get('calendar');

  useEffect(() => {
    setState(getSettings());
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  const handleSave = (next: Partial<Settings>) => {
    const merged = { ...settings, ...next };
    setSettings(merged);
    setState(merged);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const requestPush = () => {
    if (!('Notification' in window)) {
      alert('이 브라우저는 알림을 지원하지 않습니다.');
      return;
    }
    Notification.requestPermission().then((p) => {
      setPushPermission(p);
      handleSave({ pushEnabled: p === 'granted' });
      if (p === 'granted') {
        alert('알림이 허용되었습니다. 데일리 요약 등 푸시를 받을 수 있습니다.');
      }
    });
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 space-y-4">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-6 pt-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white dark:bg-zinc-100 dark:text-zinc-900" aria-label="홈">
            ⚡
          </Link>
          <div>
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">AutoFlow</p>
            <h1 className="text-2xl font-semibold tracking-tight dark:text-zinc-100">설정</h1>
          </div>
        </div>
        <Link href="/" className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700">
          대시보드
        </Link>
      </header>

      <main className="mx-auto w-full max-w-2xl space-y-4 px-6 pb-8">
        <section className="rounded-3xl bg-white p-6 shadow-sm dark:bg-zinc-800 dark:shadow-none">
          <h2 className="mb-4 text-lg font-semibold dark:text-zinc-100">🌓 테마</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${theme === 'light' ? 'bg-black text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'}`}
            >
              라이트
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`rounded-full px-4 py-2 text-sm font-semibold ${theme === 'dark' ? 'bg-black text-white' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'}`}
            >
              다크
            </button>
          </div>
        </section>

        {saved && (
          <div className="rounded-2xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            저장되었습니다.
          </div>
        )}

        <section className="rounded-3xl bg-white p-6 shadow-sm dark:bg-zinc-800 dark:shadow-none">
          <h2 className="mb-4 text-lg font-semibold dark:text-zinc-100">👥 연락처 관리</h2>
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            업무 담당자(연락처)를 추가·수정·삭제할 수 있습니다.
          </p>
          <Link
            href="/contacts"
            className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
          >
            연락처 관리 화면으로 이동 →
          </Link>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm dark:bg-zinc-800 dark:shadow-none">
          <h2 className="mb-4 text-lg font-semibold dark:text-zinc-100">📅 Google Calendar 연동</h2>
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            연동하면 업무 마감일을 Google 캘린더에 이벤트로 추가할 수 있습니다. 환경 변수 설정 후 사용하세요.
          </p>
          {calendarStatus === 'connected' && (
            <p className="mb-3 rounded-2xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              Google Calendar 연동이 완료되었습니다.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={calendarLinking}
              onClick={async () => {
                setCalendarLinking(true);
                try {
                  const res = await authFetch('/api/integrations/google-calendar/auth');
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    alert(data.hint || data.error || '연동 준비에 실패했습니다.');
                    return;
                  }
                  if (data.url) window.location.href = data.url;
                } finally {
                  setCalendarLinking(false);
                }
              }}
              className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
            >
              {calendarLinking ? '연결 중…' : 'Google 계정으로 연동'}
            </button>
            {calendarStatus === 'connected' && (
              <>
                <button
                  type="button"
                  disabled={calendarLinking}
                  onClick={async () => {
                    setCalendarLinking(true);
                    try {
                      const res = await authFetch('/api/integrations/google-calendar/sync', {
                        method: 'POST',
                      });
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        alert(data.error || '동기화에 실패했습니다.');
                        return;
                      }
                      alert(
                        `동기화 완료: ${data.synced}개 성공, ${data.failed}개 실패${
                          data.errors?.length ? `\n\n오류:\n${data.errors.slice(0, 5).join('\n')}` : ''
                        }`
                      );
                    } catch (error) {
                      alert('동기화 중 오류가 발생했습니다.');
                    } finally {
                      setCalendarLinking(false);
                    }
                  }}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                >
                  기존 업무 동기화
                </button>
                <button
                  type="button"
                  disabled={calendarLinking}
                  onClick={async () => {
                    if (!confirm('Google Calendar에서 이벤트를 가져와서 앱의 업무로 추가하시겠습니까?\n\n[업무]가 포함된 이벤트를 가져옵니다.')) {
                      return;
                    }
                    setCalendarLinking(true);
                    try {
                      const res = await authFetch('/api/integrations/google-calendar/import', {
                        method: 'POST',
                      });
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        alert(data.error || '가져오기에 실패했습니다.');
                        return;
                      }
                      alert(
                        `가져오기 완료: ${data.imported}개 추가, ${data.failed}개 실패${
                          data.errors?.length ? `\n\n오류:\n${data.errors.slice(0, 5).join('\n')}` : ''
                        }`
                      );
                      // 페이지 새로고침하여 업무 목록 갱신
                      window.location.reload();
                    } catch (error) {
                      alert('가져오기 중 오류가 발생했습니다.');
                    } finally {
                      setCalendarLinking(false);
                    }
                  }}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                >
                  Google Calendar에서 가져오기
                </button>
              </>
            )}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm dark:bg-zinc-800 dark:shadow-none">
          <h2 className="mb-4 text-lg font-semibold dark:text-zinc-100">🧩 템플릿 자동 생성</h2>
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            지정 요일·시간에 템플릿으로 업무가 자동 생성됩니다.
          </p>
          <ul className="mb-4 space-y-2">
            {(settings.templateSchedules ?? []).map((s, i) => (
              <li key={i} className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-2 dark:bg-zinc-700/50">
                <span className="text-sm">
                  {templates.find((t) => t.id === s.templateId)?.name ?? s.templateId} · {DAY_LABELS.find((d) => d.value === s.day)?.label} {s.time}
                </span>
                <button
                  type="button"
                  onClick={() => handleSave({ templateSchedules: (settings.templateSchedules ?? []).filter((_, j) => j !== i) })}
                  className="text-xs text-red-600 dark:text-red-400"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">템플릿</label>
              <select
                value={newSchedule.templateId}
                onChange={(e) => setNewSchedule((p) => ({ ...p, templateId: e.target.value }))}
                className="rounded-2xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              >
                <option value="">선택</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">요일</label>
              <select
                value={newSchedule.day}
                onChange={(e) => setNewSchedule((p) => ({ ...p, day: e.target.value as TemplateSchedule['day'] }))}
                className="rounded-2xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              >
                {DAY_LABELS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">시간</label>
              <input
                type="time"
                value={newSchedule.time}
                onChange={(e) => setNewSchedule((p) => ({ ...p, time: e.target.value }))}
                className="rounded-2xl border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              />
            </div>
            <button
              type="button"
              disabled={!newSchedule.templateId}
              onClick={() => {
                if (!newSchedule.templateId) return;
                handleSave({ templateSchedules: [...(settings.templateSchedules ?? []), { templateId: newSchedule.templateId, day: newSchedule.day, time: newSchedule.time }] });
                setNewSchedule({ templateId: '', day: 'monday', time: '09:00' });
              }}
              className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              추가
            </button>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm dark:bg-zinc-800 dark:shadow-none">
          <h2 className="mb-4 text-lg font-semibold dark:text-zinc-100">🔕 Quiet hours (방해 금지 시간)</h2>
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            이 시간에는 알림을 줄이거나 요약만 표시할 수 있습니다.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">시작</label>
              <input
                type="time"
                value={settings.quietHoursStart ?? '22:00'}
                onChange={(e) => handleSave({ quietHoursStart: e.target.value })}
                className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">종료</label>
              <input
                type="time"
                value={settings.quietHoursEnd ?? '08:00'}
                onChange={(e) => handleSave({ quietHoursEnd: e.target.value })}
                className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
              />
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm dark:bg-zinc-800 dark:shadow-none">
          <h2 className="mb-4 text-lg font-semibold dark:text-zinc-100">📊 데일리 요약 스케줄</h2>
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            매일 지정한 시간에 오늘의 완료율·지연 위험·총 업무를 요약해 알려드립니다. (알림 허용 시)
          </p>
          <div>
            <label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">요약 시간</label>
            <input
              type="time"
              value={settings.dailySummaryTime ?? '18:30'}
              onChange={(e) => handleSave({ dailySummaryTime: e.target.value })}
              className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
            />
          </div>
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm dark:bg-zinc-800 dark:shadow-none">
          <h2 className="mb-4 text-lg font-semibold dark:text-zinc-100">🔔 푸시 알림</h2>
          <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
            브라우저 알림을 허용하면 지연 알림, 데일리 요약 등을 푸시로 받을 수 있습니다.
          </p>
          <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-300">
            현재 상태: {pushPermission === 'granted' ? '허용됨' : pushPermission === 'denied' ? '거부됨' : '알 수 없음'}
          </p>
          <button
            type="button"
            onClick={requestPush}
            disabled={pushPermission === 'granted'}
            className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {pushPermission === 'granted' ? '알림 허용됨' : '알림 허용하기'}
          </button>
        </section>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 flex items-center justify-center">
        <p className="text-zinc-500">로딩 중...</p>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
