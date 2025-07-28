'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

import { LoginForm } from '@/components/auth/LoginForm';

function LoginContent() {
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered');
  
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoginForm registered={registered} />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
