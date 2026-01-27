'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { authFetch } from '@/lib/apiClient';

type MeetingResult = {
  summary?: string;
  decisions?: string[];
  action_items?: string[];
  risks?: string[];
  hashtags?: string[];
};

const formatLocalDateTime = (value: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${[value.getFullYear(), pad(value.getMonth() + 1), pad(value.getDate())].join('-')}T${[pad(value.getHours()), pad(value.getMinutes())].join(':')}`;
};

const formatDisplayDateTime = (value: string) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.replace('T', ' ').slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${[d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join('-')} ${[pad(d.getHours()), pad(d.getMinutes())].join(':')}`;
};

export default function MeetingPage() {
  const [text, setText] = useState('');
  const [meetingStart, setMeetingStart] = useState(formatLocalDateTime(new Date()));
  const [meetingEnd, setMeetingEnd] = useState('');
  const [participantsInternal, setParticipantsInternal] = useState('');
  const [participantsExternal, setParticipantsExternal] = useState('');
  const [location, setLocation] = useState('');
  const [agenda, setAgenda] = useState('');
  const [meetingProject, setMeetingProject] = useState('');
  const [meetingWorkType, setMeetingWorkType] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MeetingResult | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'location'>('date');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [recordingStart, setRecordingStart] = useState<number | null>(null);
  const [recordingEnd, setRecordingEnd] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    setSpeechSupported(true);
    const r = new SR();
    r.lang = 'ko-KR';
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e: { results: Iterable<SpeechRecognitionResult> }) => {
      const t = Array.from(e.results).map((r) => r[0]?.transcript ?? '').join('');
      setText(t);
    };
    r.onend = () => setIsRecording(false);
    recognitionRef.current = r;
  }, []);

  useEffect(() => {
    let active = true;
    setLogsLoading(true);
    setLogsError(null);
    authFetch('/api/search?mode=meeting')
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((payload) => {
        if (active) setLogs(payload.data ?? []);
      })
      .catch((err) => {
        if (active) setLogsError(String(err));
      })
      .finally(() => {
        if (active) setLogsLoading(false);
      });
    return () => { active = false; };
  }, [status]);

  const handleToggleRecording = () => {
    if (!speechSupported) {
      setError('이 브라우저는 실시간 녹음을 지원하지 않습니다.');
      return;
    }
    if (isRecording) {
      recognitionRef.current?.stop();
      setRecordingEnd(Date.now());
      setMeetingEnd(formatLocalDateTime(new Date()));
    } else {
      setError(null);
      recognitionRef.current?.start();
      setRecordingStart(Date.now());
      setMeetingStart(formatLocalDateTime(new Date()));
    }
    setIsRecording(!isRecording);
  };

  const handleAnalyze = async () => {
    const content = [
      meetingStart ? `회의 시작: ${meetingStart}` : null,
      meetingEnd ? `회의 종료: ${meetingEnd}` : null,
      participantsInternal ? `참석자(내부): ${participantsInternal}` : null,
      participantsExternal ? `참석자(외부): ${participantsExternal}` : null,
      location ? `장소: ${location}` : null,
      agenda ? `안건: ${agenda}` : null,
      meetingProject ? `프로젝트: ${meetingProject}` : null,
      meetingWorkType ? `업무유형: ${meetingWorkType}` : null,
      text ? `회의 내용:\n${text}` : null,
    ].filter(Boolean).join('\n');
    if (!content.trim()) {
      setError('분석할 텍스트가 없습니다.');
      return;
    }
    setStatus('loading');
    setError(null);
    const formData = new FormData();
    formData.append('text', content);
    formData.append('mode', 'meeting');
    formData.append('meeting_date', meetingStart);
    formData.append('meeting_start', meetingStart);
    formData.append('meeting_end', meetingEnd);
    formData.append('meeting_location', location);
    formData.append('meeting_participants', [participantsInternal, participantsExternal].filter(Boolean).join(', '));
    formData.append('meeting_project', meetingProject);
    formData.append('meeting_work_type', meetingWorkType);

    try {
      const response = await authFetch('/api/analyze', { method: 'POST', body: formData });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? body.details ?? '분석에 실패했습니다.');
        setStatus('error');
        return;
      }
      const payload = await response.json();
      setResult(payload?.data?.analysis_json ?? payload?.analysis ?? null);
      setStatus('done');
    } catch (err) {
      setError(String(err));
      setStatus('error');
    }
  };

  const normalizedLogs = useMemo(() => {
    return logs.map((log) => {
      const a = log.analysis_json ?? {};
      const start = a.meeting_start ?? a.meeting_date ?? log.created_at ?? '';
      const end = a.meeting_end ?? '';
      let dur = Number(a.meeting_duration_seconds ?? 0);
      if (!dur && start && end) {
        dur = Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000));
      }
      return {
        ...log,
        _meetingStart: start,
        _meetingEnd: end,
        _durationSeconds: dur,
        _participantCount: a.meeting_participant_count ?? (a.meeting_participants ? a.meeting_participants.split(',').filter(Boolean).length : 0),
        _location: a.meeting_location ?? '장소 미상',
        _summary: a.summary ?? '요약 없음',
        _participants: a.meeting_participants ?? '',
        _project: a.meeting_project ?? '',
        _hashtags: Array.isArray(a.hashtags) ? a.hashtags : [],
      };
    });
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    let list = q
      ? normalizedLogs.filter((l) =>
          [l._summary, l._location, l._participants, l._meetingStart, l._project, l._hashtags.join(' ')].some((v) =>
            String(v).toLowerCase().includes(q)
          )
        )
      : [...normalizedLogs];
    list = [...list].sort((a, b) => {
      if (sortBy === 'location') return (a._location as string).localeCompare(b._location as string, 'ko-KR');
      const at = Date.parse(a._meetingStart || a.created_at || '');
      const bt = Date.parse(b._meetingStart || b.created_at || '');
      return (Number.isNaN(bt) ? 0 : bt) - (Number.isNaN(at) ? 0 : at);
    });
    return list;
  }, [normalizedLogs, searchTerm, sortBy]);

  const formattedDuration = useMemo(() => {
    if (meetingStart && meetingEnd) {
      const diff = (new Date(meetingEnd).getTime() - new Date(meetingStart).getTime()) / 1000;
      if (diff > 0) return `${Math.floor(diff / 60)}분`;
    }
    if (recordingStart && recordingEnd) {
      return `${Math.floor((recordingEnd - recordingStart) / 60000)}분`;
    }
    return '-';
  }, [meetingStart, meetingEnd, recordingStart, recordingEnd]);

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Meeting</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          회의 기록을 입력하면 요약과 액션 아이템을 생성합니다.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold text-zinc-700 dark:text-zinc-300">회의 기록 보기</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="rounded-full border border-zinc-200 px-3 py-1.5 text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              placeholder="검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="rounded-full border border-zinc-200 px-3 py-1.5 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'location')}
            >
              <option value="date">날짜순</option>
              <option value="location">장소순</option>
            </select>
          </div>
        </div>
        {logsLoading ? (
          <p className="mt-3 text-zinc-500">불러오는 중...</p>
        ) : logsError ? (
          <p className="mt-3 text-red-600">{logsError}</p>
        ) : (
          <div className="mt-3 space-y-2">
            {filteredLogs.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-200 py-6 text-center text-zinc-400 dark:border-zinc-600">
                표시할 기록이 없습니다.
              </p>
            ) : (
              filteredLogs.map((log: any) => {
                const detail = log.analysis_json ?? {};
                const isOpen = expandedLogId === log.id;
                return (
                  <div key={log.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setExpandedLogId(isOpen ? null : log.id)}
                      onKeyDown={(e) => e.key === 'Enter' && setExpandedLogId(isOpen ? null : log.id)}
                      className="flex cursor-pointer flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                    >
                      <span className="text-zinc-500">{formatDisplayDateTime(log._meetingStart)}</span>
                      <span>{log._location}</span>
                      <span>{log._participantCount || '-'}명</span>
                      <span>{log._durationSeconds > 0 ? `${Math.floor(log._durationSeconds / 60)}분` : '-'}</span>
                      <span className="min-w-0 flex-1 truncate text-zinc-700 dark:text-zinc-300">{log._summary?.slice(0, 60)}</span>
                    </div>
                    {isOpen && (
                      <div className="mt-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs dark:border-zinc-700 dark:bg-zinc-800">
                        <p><strong>요약</strong> {detail.summary ?? '-'}</p>
                        <p><strong>의사결정</strong> {Array.isArray(detail.decisions) ? detail.decisions.join(', ') : '-'}</p>
                        <p><strong>액션 아이템</strong> {Array.isArray(detail.action_items) ? detail.action_items.join(', ') : '-'}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-zinc-500">회의 기본 정보</label>
          <button
            type="button"
            onClick={handleToggleRecording}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              isRecording ? 'border-red-300 bg-red-50 text-red-700 dark:bg-red-900/20' : 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20'
            }`}
          >
            {isRecording ? '● 녹음 중지' : '실시간 녹음'}
          </button>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-zinc-500">회의 시작</label>
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
              value={meetingStart}
              onChange={(e) => setMeetingStart(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500">회의 종료</label>
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
              value={meetingEnd}
              onChange={(e) => setMeetingEnd(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500">회의시간</label>
            <input readOnly className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300" value={formattedDuration} />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500">장소</label>
            <input
              className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
              placeholder="회의실 / 온라인"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500">참석자(내부)</label>
            <input
              className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
              placeholder="쉼표로 구분"
              value={participantsInternal}
              onChange={(e) => setParticipantsInternal(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500">참석자(외부)</label>
            <input
              className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
              placeholder="쉼표로 구분"
              value={participantsExternal}
              onChange={(e) => setParticipantsExternal(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-zinc-500">안건</label>
            <input
              className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
              placeholder="회의 안건"
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500">프로젝트</label>
            <input
              className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
              value={meetingProject}
              onChange={(e) => setMeetingProject(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-500">업무유형</label>
            <select
              className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
              value={meetingWorkType}
              onChange={(e) => setMeetingWorkType(e.target.value)}
            >
              <option value="">선택</option>
              <option value="장기">장기</option>
              <option value="단기">단기</option>
              <option value="일별">일별</option>
              <option value="긴급">긴급</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <label className="text-xs font-semibold text-zinc-500">회의 내용 메모</label>
          <textarea
            className="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
            rows={3}
            placeholder="메모를 입력하면 요약됩니다."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleAnalyze}
            className="rounded-full border border-zinc-200 bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
          >
            {status === 'loading' ? '분석 중...' : '분석 시작'}
          </button>
        </div>
        {error && <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20">{error}</p>}
        {result && (
          <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
            <p className="font-semibold text-zinc-700 dark:text-zinc-300">요약</p>
            <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{result.summary ?? '-'}</p>
            <p className="mt-2 font-semibold text-zinc-700 dark:text-zinc-300">의사결정</p>
            <ul className="list-disc pl-4 text-sm text-zinc-600 dark:text-zinc-400">{(result.decisions ?? []).map((d, i) => <li key={i}>{d}</li>)}</ul>
            <p className="mt-2 font-semibold text-zinc-700 dark:text-zinc-300">액션 아이템</p>
            <ul className="list-disc pl-4 text-sm text-zinc-600 dark:text-zinc-400">{(result.action_items ?? []).map((a, i) => <li key={i}>{a}</li>)}</ul>
          </div>
        )}
      </div>
    </section>
  );
}
