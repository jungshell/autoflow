'use client';

import { useEffect, useMemo, useState } from 'react';
import { authFetch } from '@/lib/apiClient';

export default function PdfReaderPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoadingLogs(true);
    setLogsError(null);
    authFetch('/api/search?source=pdf')
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((payload) => {
        if (!active) return;
        const items = (payload.data ?? []).slice().sort((a: any, b: any) => {
          const at = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bt - at;
        });
        setLogs(items);
        setSelectedLog((prev: unknown) => prev ?? items[0] ?? null);
      })
      .catch((err) => {
        if (active) setLogsError(String(err));
      })
      .finally(() => {
        if (active) setLoadingLogs(false);
      });
    return () => { active = false; };
  }, [refreshKey]);

  const logItems = useMemo(() => {
    return logs.map((log) => ({
      id: log.id,
      filename:
        log.analysis_json?.source_filename ?? log.analysis_json?.sourceFilename ?? '파일명 없음',
      createdAt: log.created_at,
    }));
  }, [logs]);

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">PDF Reader</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          PDF 업로드 및 분석 기록을 확인할 수 있습니다. (통합 후 Firebase 기준으로 조회)
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-500">업로드 기록</span>
          <span className="text-xs text-zinc-400">
            {loadingLogs ? '불러오는 중' : `${logItems.length}건`}
          </span>
        </div>
        {logsError && (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20">
            {logsError}
          </p>
        )}
        <div className="mt-3 space-y-2">
          {logItems.length === 0 ? (
            <p className="text-sm text-zinc-500">업로드 기록이 없습니다. Meeting에서 회의 분석을 하면 기록이 쌓입니다.</p>
          ) : (
            logItems.map((item) => {
              const log = logs.find((l) => l.id === item.id);
              const isOpen = selectedLog?.id === item.id;
              const analysis = log?.analysis_json ?? {};
              const summary = typeof analysis.summary === 'string' ? analysis.summary : '';
              const tags: string[] = Array.isArray(analysis.hashtags) ? analysis.hashtags : [];
              const actions: string[] = Array.isArray(analysis.action_items) ? analysis.action_items : [];
              return (
                <div key={item.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => log && setSelectedLog(log)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && log && setSelectedLog(log)}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm ${
                      isOpen ? 'border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700' : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-700'
                    }`}
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-600 dark:text-zinc-300">
                      📄
                    </span>
                    <span className="flex-1 truncate font-medium text-zinc-700 dark:text-zinc-300">{item.filename}</span>
                    <span className="text-xs text-zinc-500">
                      {item.createdAt ? new Date(item.createdAt).toISOString().slice(0, 10) : ''}
                    </span>
                  </div>
                  {isOpen && (
                    <div className="mt-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-800">
                      <p className="text-xs font-semibold text-zinc-500">요약</p>
                      <p className="mt-1 text-zinc-700 dark:text-zinc-300">{summary || '요약 없음'}</p>
                      {actions.length > 0 && (
                        <>
                          <p className="mt-2 text-xs font-semibold text-zinc-500">액션 아이템</p>
                          <ul className="list-disc pl-4 text-zinc-600 dark:text-zinc-400">{actions.map((a, i) => <li key={i}>{a}</li>)}</ul>
                        </>
                      )}
                      {tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {tags.map((tag) => (
                            <span key={tag} className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs dark:border-zinc-600 dark:bg-zinc-800">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
