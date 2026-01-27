'use client';

import { useState } from 'react';
import { authFetch } from '@/lib/apiClient';

type EmojiToneResult = {
  summary?: string;
  tone_type?: string;
  versions?: Array<{ label?: string; message?: string; emoji?: string; cta?: string }>;
  hashtags?: string[];
};

const PURPOSE_OPTIONS = [
  { id: 'notice', label: '공지/알림' },
  { id: 'request', label: '요청/설명' },
  { id: 'thanks', label: '감사/사과' },
  { id: 'memo', label: '일반 메모' },
];

export default function EmojiTonePage() {
  const [text, setText] = useState('');
  const [purpose, setPurpose] = useState('notice');
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EmojiToneResult | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleAnalyze = async () => {
    if (!text.trim()) {
      setError('분석할 텍스트가 없습니다.');
      return;
    }
    setStatus('loading');
    setError(null);
    const formData = new FormData();
    formData.append('text', text);
    formData.append('mode', 'emoji-tone');
    formData.append('purpose', purpose);

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

  const handleCopy = async (item: { emoji?: string; message?: string; cta?: string }, index: number) => {
    const line = [item.emoji, item.message, item.cta].filter(Boolean).join(' ');
    try {
      await navigator.clipboard.writeText(line);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 1500);
    } catch {
      setCopiedIndex(null);
    }
  };

  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Emoji Tone</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          공지·요청·감사 등 업무 문구를 목적에 맞는 톤으로 바꿔 드립니다.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800">
        <p className="mb-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">어디에 쓸 문구인가요?</p>
        <div className="flex flex-wrap gap-2">
          {PURPOSE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setPurpose(opt.id)}
              className={`rounded-full border px-3 py-2 text-xs font-semibold transition ${
                purpose === opt.id
                  ? 'border-zinc-400 bg-zinc-100 text-zinc-800 dark:bg-zinc-600 dark:text-zinc-100'
                  : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-zinc-600 dark:text-zinc-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800">
        <label className="text-xs font-semibold text-zinc-500">문서 텍스트</label>
        <textarea
          className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm text-zinc-700 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
          rows={6}
          placeholder="분위기를 분석할 텍스트를 입력하세요."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setText('안녕하세요. 금주 일정이 변경되어 안내드립니다. 확인 부탁드립니다.')}
            className="rounded-full border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-600 dark:border-zinc-600 dark:text-zinc-400"
          >
            템플릿 삽입
          </button>
          <button
            type="button"
            onClick={handleAnalyze}
            className="rounded-full border border-zinc-200 bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
          >
            {status === 'loading' ? '분석 중...' : '톤 분석'}
          </button>
        </div>
        {error && (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20">
            {error}
          </p>
        )}
      </div>

      {result && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800">
              <p className="text-xs font-semibold text-zinc-500">요약</p>
              <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{result.summary ?? '-'}</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800">
              <p className="text-xs font-semibold text-zinc-500">톤 유형</p>
              <span className="mt-2 inline-block rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-700">
                {result.tone_type ?? '미상'}
              </span>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {(result.versions ?? []).map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-zinc-500">{item.label ?? '버전'}</p>
                  <button
                    type="button"
                    onClick={() => handleCopy(item, index)}
                    className="rounded-full border border-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-600 dark:border-zinc-600 dark:text-zinc-400"
                  >
                    {copiedIndex === index ? '복사됨' : '복사'}
                  </button>
                </div>
                <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                  {item.emoji ? `${item.emoji} ` : ''}{item.message ?? '-'}
                </p>
                {item.cta && <p className="mt-2 text-xs text-zinc-500">{item.cta}</p>}
              </div>
            ))}
          </div>

          {result.hashtags && result.hashtags.length > 0 && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800">
              <p className="text-xs font-semibold text-zinc-500">해시태그</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
