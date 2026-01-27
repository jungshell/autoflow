'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useContacts } from '@/hooks/useContacts';
import { authFetch } from '@/lib/apiClient';
import type { Contact } from '@/types/models';

export default function ContactsPage() {
  const { contacts, loading, refetch } = useContacts();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!modalOpen) {
      setEditing(null);
      setName('');
      setCompany('');
      setEmail('');
      setPhone('');
      setError(null);
      return;
    }
    if (editing) {
      setName(editing.name);
      setCompany(editing.company ?? '');
      setEmail(editing.email ?? '');
      setPhone(editing.phone ?? '');
    }
  }, [modalOpen, editing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const res = await authFetch(`/api/contacts/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            company: company.trim() || undefined,
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? '수정에 실패했습니다.');
        }
      } else {
        const res = await authFetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            company: company.trim() || undefined,
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? '추가에 실패했습니다.');
        }
      }
      refetch();
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: Contact) => {
    if (!confirm(`"${c.name}" 연락처를 삭제할까요? 이 연락처가 담당자인 업무는 담당자 없음으로 표시됩니다.`)) return;
    try {
      const res = await authFetch(`/api/contacts/${c.id}`, { method: 'DELETE' });
      if (res.ok) refetch();
      else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? '삭제에 실패했습니다.');
      }
    } catch {
      alert('삭제에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center">
        <p className="text-zinc-500 dark:text-zinc-400">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 space-y-4">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 pt-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white dark:bg-zinc-100 dark:text-zinc-900"
            aria-label="홈"
          >
            ⚡
          </Link>
          <div>
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">AutoFlow</p>
            <h1 className="text-2xl font-semibold tracking-tight dark:text-zinc-100">👥 연락처 관리</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/"
            className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            대시보드
          </Link>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            + 연락처 추가
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl space-y-4 px-6 pb-8">
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          담당자(연락처)를 추가·수정·삭제할 수 있습니다. 업무 등록 시 담당자로 선택됩니다.
        </p>
        <ul className="space-y-3">
          {contacts.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-zinc-200 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              연락처가 없습니다. + 연락처 추가로 담당자를 등록하세요.
            </li>
          ) : (
            contacts.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800"
              >
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">{c.name}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {[c.company, c.email, c.phone].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setEditing(c); setModalOpen(true); }}
                    className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(c)}
                    className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </main>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 dark:bg-zinc-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold dark:text-zinc-100">
              {editing ? '연락처 수정' : '연락처 추가'}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">이름 *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                  placeholder="예: 홍길동"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">소속</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                  placeholder="예: 디자인팀"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">이메일</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                  placeholder="example@email.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">전화</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-200 px-4 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                  placeholder="010-0000-0000"
                />
              </div>
              {error && (
                <p className="rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  {error}
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-full border border-zinc-200 py-2 text-sm font-semibold text-zinc-700 dark:border-zinc-600 dark:text-zinc-300"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-full bg-black py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  {saving ? '저장 중...' : editing ? '수정' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
