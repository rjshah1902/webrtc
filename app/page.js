"use client";

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import CallerComponent from './component/CallerComponent';

function InnerCallPage() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId') || '1';
  const receiverId = searchParams.get('receiverId') || '2';

  return (
    <div className="container mx-auto py-8">
      <CallerComponent userId={userId} receiverId={receiverId} />
    </div>
  );
}

export default function CallPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InnerCallPage />
    </Suspense>
  );
}
