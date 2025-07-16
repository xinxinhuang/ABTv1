'use client';

import Link from 'next/link';
import { SparklesText } from '@/components/ui/sparkles-text';
import { Button } from '@/components/ui/Button';
import { useUser } from '@/hooks/useUser';
import { LogIn, UserPlus, Package, BookOpen } from 'lucide-react';

export default function Home() {
  const { user } = useUser();

  return (
    <div className="content-height bg-[var(--bg-primary)] flex items-center justify-center">
      <div className="container-game text-center space-y-12">
        {/* Title */}
        <SparklesText 
          text="A Boring TCG"
          colors={{ first: 'var(--color-primary-400)', second: 'var(--color-primary-500)' }}
          className="text-4xl md:text-6xl lg:text-8xl font-bold"
          sparklesCount={15}
        />
        
        {/* Action Buttons */}
        {!user ? (
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button
                size="xl"
                variant="primary"
                leftIcon={<UserPlus className="w-5 h-5" />}
              >
                Create Account
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="xl"
                variant="outline"
                leftIcon={<LogIn className="w-5 h-5" />}
              >
                Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link href="/game/packs">
              <Button
                size="xl"
                variant="primary"
                leftIcon={<Package className="w-6 h-6" />}
                className="min-w-48"
              >
                Open Packs
              </Button>
            </Link>
            <Link href="/game/collection">
              <Button
                size="xl"
                variant="secondary"
                leftIcon={<BookOpen className="w-6 h-6" />}
                className="min-w-48"
              >
                View Collection
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
