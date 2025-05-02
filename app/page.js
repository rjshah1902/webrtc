"use client";
import { useSearchParams } from 'next/navigation';
import CallerComponent from './component/CallerComponent';

export default function CallPage() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId') || '1';
  const receiverId = searchParams.get('receiverId') || '2';

  return (
    <div className="container mx-auto py-8">
      <CallerComponent userId={userId} receiverId={receiverId} />
    </div>
  );
}