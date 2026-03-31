import { Suspense } from 'react';
import TokenDetailPage from './TokenDetailPage';

export default function DetailPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-5 h-5 border border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
      </div>
    }>
      <TokenDetailPage />
    </Suspense>
  );
}