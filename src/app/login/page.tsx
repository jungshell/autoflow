'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithGoogle } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 dark:bg-zinc-900">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-sm dark:bg-zinc-800 dark:shadow-none">
        <div className="mb-6 flex justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white">⚡</span>
        </div>
        <h1 className="mb-2 text-center text-xl font-semibold text-zinc-900 dark:text-zinc-100">AutoFlow</h1>
        <p className="mb-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          로그인하면 내 업무만 안전하게 사용할 수 있습니다.
        </p>
        {error && (
          <p className="mb-4 rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full rounded-full bg-black py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? '로그인 중...' : 'Google로 로그인'}
        </button>
        <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
          로그인하지 않아도 대시보드는 이용할 수 있습니다.{' '}
          <Link href="/" className="underline">
            대시보드로 이동
          </Link>
        </p>
      </div>
    </div>
  );
}
