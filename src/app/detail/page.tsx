import { Suspense } from 'react';
import TokenDetailPage from './TokenDetailPage';

export default function DetailPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TokenDetailPage />
    </Suspense>
  );
}