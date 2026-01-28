import { generateDailySummaryData } from '@/lib/automation';

export const dynamic = 'force-dynamic';

function formatTime(dateStr?: string | null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${mm}/${dd} ${hh}:${mi}`;
}

export default async function BriefingPreviewPage() {
  // 프리뷰 페이지는 현재 사용자 데이터만 표시 (ownerId는 서버에서 추출 필요)
  // 일단은 전체 데이터로 표시 (실제 사용 시에는 getUidFromRequest로 필터링)
  const data = await generateDailySummaryData();

  const { stats, todayTasks, threeDayTasks, urgentTasks, delayedTasks } = data;

  const totalForBar = Math.max(
    stats.total,
    stats.completed + (stats.total - stats.completed),
    stats.delayedCount || 1,
  );

  const barWidth = (value: number) =>
    `${Math.max(8, Math.round((value / (totalForBar || 1)) * 100))}%`;

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 flex justify-center px-4 py-8">
      <div className="w-full max-w-5xl bg-white shadow-xl rounded-3xl p-8 space-y-8">
        {/* 헤더 */}
        <header className="flex flex-col gap-2 border-b border-zinc-200 pb-4">
          <h1 className="text-2xl font-semibold tracking-tight">AutoFlow 아침 브리핑 (프리뷰)</h1>
          <p className="text-sm text-zinc-500">
            이 화면은 이메일/PDF 브리핑 디자인을 실험하기 위한 미리보기입니다.
          </p>
        </header>

        {/* 상단 KPI 카드 */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-indigo-50 border border-indigo-100 px-4 py-3 flex flex-col gap-1">
            <span className="text-xs font-medium text-indigo-500 uppercase tracking-wide">
              완료율
            </span>
            <span className="text-2xl font-semibold text-indigo-900">
              {stats.completionRate}
              <span className="text-base font-normal text-indigo-400 ml-1">%</span>
            </span>
          </div>
          <div className="rounded-2xl bg-rose-50 border border-rose-100 px-4 py-3 flex flex-col gap-1">
            <span className="text-xs font-medium text-rose-500 uppercase tracking-wide">
              지연 업무
            </span>
            <span className="text-2xl font-semibold text-rose-900">
              {stats.delayedCount}
              <span className="text-base font-normal text-rose-400 ml-1">건</span>
            </span>
          </div>
          <div className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3 flex flex-col gap-1">
            <span className="text-xs font-medium text-amber-500 uppercase tracking-wide">
              오늘 마감
            </span>
            <span className="text-2xl font-semibold text-amber-900">
              {stats.todayCount}
              <span className="text-base font-normal text-amber-400 ml-1">건</span>
            </span>
          </div>
          <div className="rounded-2xl bg-zinc-50 border border-zinc-200 px-4 py-3 flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
              총 업무
            </span>
            <span className="text-2xl font-semibold text-zinc-900">
              {stats.total}
              <span className="text-base font-normal text-zinc-400 ml-1">건</span>
            </span>
          </div>
        </section>

        {/* 시각화 블록 */}
        <section className="grid md:grid-cols-2 gap-6">
          {/* 완료/진행/지연 비율 - 도넛 느낌 */}
          <div className="rounded-2xl border border-zinc-200 p-5 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
              완료 · 진행 · 지연 비율
            </h2>
            <div className="flex items-center gap-6">
              <div className="relative w-32 h-32">
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-400 via-sky-400 to-rose-400 opacity-70" />
                <div className="absolute inset-3 rounded-full bg-white" />
                <div className="absolute inset-7 rounded-full bg-white flex flex-col items-center justify-center">
                  <span className="text-xs text-zinc-400">완료율</span>
                  <span className="text-xl font-semibold text-zinc-900">
                    {stats.completionRate}%
                  </span>
                </div>
              </div>
              <div className="flex-1 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="w-16 text-zinc-500">완료</span>
                  <span className="flex-1 h-1.5 rounded-full bg-emerald-100 overflow-hidden">
                    <span
                      className="block h-full bg-emerald-500"
                      style={{ width: barWidth(stats.completed) }}
                    />
                  </span>
                  <span className="w-10 text-right text-zinc-700 text-xs">
                    {stats.completed}건
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  <span className="w-16 text-zinc-500">진행/대기</span>
                  <span className="flex-1 h-1.5 rounded-full bg-sky-100 overflow-hidden">
                    <span
                      className="block h-full bg-sky-500"
                      style={{ width: barWidth(stats.total - stats.completed) }}
                    />
                  </span>
                  <span className="w-10 text-right text-zinc-700 text-xs">
                    {stats.total - stats.completed}건
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span className="w-16 text-zinc-500">지연</span>
                  <span className="flex-1 h-1.5 rounded-full bg-rose-100 overflow-hidden">
                    <span
                      className="block h-full bg-rose-500"
                      style={{ width: barWidth(stats.delayedCount) }}
                    />
                  </span>
                  <span className="w-10 text-right text-zinc-700 text-xs">
                    {stats.delayedCount}건
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 우선순위/기간 요약 */}
          <div className="rounded-2xl border border-zinc-200 p-5 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
              기간별 집중 포인트
            </h2>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-6 rounded-full bg-amber-400" />
                  <span className="text-zinc-600">오늘 마감</span>
                </div>
                <span className="text-zinc-900 font-medium">{stats.todayCount}건</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-6 rounded-full bg-indigo-400" />
                  <span className="text-zinc-600">3일 내 마감</span>
                </div>
                <span className="text-zinc-900 font-medium">{stats.threeDayCount}건</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-6 rounded-full bg-rose-400" />
                  <span className="text-zinc-600">긴급/지연 위험</span>
                </div>
                <span className="text-zinc-900 font-medium">{stats.urgentCount}건</span>
              </div>
            </div>
          </div>
        </section>

        {/* 오늘 · 3일 내 마감 타임라인 & 리스트 */}
        <section className="grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-zinc-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-700">오늘 마감 Top 5</h2>
            <ol className="space-y-2 text-xs">
              {todayTasks.slice(0, 5).map((t, idx) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400 w-4 text-right">{idx + 1}.</span>
                    <div className="flex flex-col">
                      <span className="text-zinc-800 text-xs font-medium truncate max-w-[180px]">
                        {t.title}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {t.assigneeId ? `담당: ${t.assigneeId}` : '담당자 미지정'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-amber-600 font-medium">
                      {formatTime(t.dueAt)}
                    </div>
                  </div>
                </li>
              ))}
              {todayTasks.length === 0 && (
                <li className="text-xs text-zinc-400">오늘 마감 예정 업무가 없습니다.</li>
              )}
            </ol>
          </div>

          <div className="rounded-2xl border border-zinc-200 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-700">3일 내 마감 Top 5</h2>
            <ol className="space-y-2 text-xs">
              {threeDayTasks.slice(0, 5).map((t, idx) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400 w-4 text-right">{idx + 1}.</span>
                    <div className="flex flex-col">
                      <span className="text-zinc-800 text-xs font-medium truncate max-w-[180px]">
                        {t.title}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {t.assigneeId ? `담당: ${t.assigneeId}` : '담당자 미지정'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-indigo-600 font-medium">
                      {formatTime(t.dueAt)}
                    </div>
                  </div>
                </li>
              ))}
              {threeDayTasks.length === 0 && (
                <li className="text-xs text-zinc-400">3일 내 마감 예정 업무가 없습니다.</li>
              )}
            </ol>
          </div>
        </section>

        {/* 오늘 바로 봐야 할 업무 (긴급/지연 위주) */}
        <section className="rounded-2xl border border-zinc-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-700">오늘 바로 봐야 할 업무</h2>
          <table className="w-full border-separate border-spacing-y-1 text-xs">
            <thead>
              <tr className="text-[11px] text-zinc-400">
                <th className="text-left font-medium px-2 w-16">우선순위</th>
                <th className="text-left font-medium px-2">업무</th>
                <th className="text-left font-medium px-2 w-24">마감</th>
                <th className="text-left font-medium px-2 w-24">담당자</th>
              </tr>
            </thead>
            <tbody>
              {(urgentTasks.length > 0 ? urgentTasks : delayedTasks).slice(0, 8).map((t) => {
                const priorityEmoji =
                  t.priority === 'urgent'
                    ? '🔴'
                    : t.priority === 'high'
                    ? '🟠'
                    : t.priority === 'medium'
                    ? '🟡'
                    : '🟢';
                return (
                  <tr key={t.id} className="bg-zinc-50 hover:bg-zinc-100 transition-colors">
                    <td className="px-2 py-1.5 text-[11px] whitespace-nowrap">
                      <span className="mr-1">{priorityEmoji}</span>
                      <span className="text-zinc-600">{t.priority || 'low'}</span>
                    </td>
                    <td className="px-2 py-1.5 text-[11px] text-zinc-800">
                      <span className="line-clamp-1">{t.title}</span>
                    </td>
                    <td className="px-2 py-1.5 text-[11px] text-zinc-600">
                      {t.dueAt ? formatTime(t.dueAt) : '-'}
                    </td>
                    <td className="px-2 py-1.5 text-[11px] text-zinc-600">
                      {t.assigneeId || '-'}
                    </td>
                  </tr>
                );
              })}
              {urgentTasks.length === 0 && delayedTasks.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-2 py-3 text-center text-[11px] text-emerald-500 bg-emerald-50 rounded-xl"
                  >
                    긴급하거나 지연된 업무가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* 인사이트 한 줄 */}
        <section className="rounded-2xl border border-dashed border-zinc-200 p-4 text-xs text-zinc-500 bg-zinc-50 flex items-center justify-between">
          <span>
            이 레이아웃은 이메일/PDF 전용 디자인의 초안입니다. 색상, 폰트, 그래프 스타일을 자유롭게
            수정하면서 고도화해 보세요.
          </span>
          <span className="text-[10px] text-zinc-400 whitespace-nowrap ml-4">
            /briefing/preview
          </span>
        </section>
      </div>
    </div>
  );
}

