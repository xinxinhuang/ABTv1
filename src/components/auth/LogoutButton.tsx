'use client';

import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return <Button onClick={handleLogout}>Logout</Button>;
}
