"use client";

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import ReceiverComponent from '../component/ReceiverComponent';

function InnerReceivePage() {
    const searchParams = useSearchParams();
    const userId = searchParams.get('userId') || '2';

    return (
        <div className="container mx-auto py-8">
            <ReceiverComponent userId={userId} />
        </div>
    );
}

export default function ReceivePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <InnerReceivePage />
        </Suspense>
    );
}
