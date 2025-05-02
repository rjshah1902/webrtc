"use client";
import { useSearchParams } from 'next/navigation';
import ReceiverComponent from '../component/ReceiverComponent';

export default function ReceivePage() {
    const searchParams = useSearchParams();
    const userId = searchParams.get('userId') || '2';

    return (
        <div className="container mx-auto py-8">
            <ReceiverComponent userId={userId} />
        </div>
    );
}