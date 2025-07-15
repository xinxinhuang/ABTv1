'use client';

import Link from 'next/link';
import { SparklesText } from '@/components/ui/sparkles-text';
import { useUser } from '@/hooks/useUser';

export default function Home() {
  const { user } = useUser();

  return (
    <div className="content-height flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--mantine-color-dark-7)' }}>
      <div className="text-center space-y-8">
        {/* SparklesText Title */}
        <SparklesText 
          text="A Boring TCG"
          colors={{ first: '#ffd43b', second: '#fab005' }}
          className="text-4xl md:text-6xl lg:text-8xl font-bold mb-8"
          sparklesCount={15}
        />
        
        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-white max-w-2xl mx-auto mb-12">
          Collect, trade, and battle with unique digital cards
        </p>
        
        {/* Action Buttons */}
        {!user && (
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="mantine-focus-auto mantine-active mantine-Button-root mantine-UnstyledButton-root mantine-button-default text-lg"
              style={{ minWidth: '160px', padding: '0.75rem 2rem' }}
            >
              <span className="mantine-Button-inner">
                <span className="mantine-Button-label">Sign In</span>
              </span>
            </Link>
            <Link
              href="/signup"
              className="mantine-focus-auto mantine-active mantine-Button-root mantine-UnstyledButton-root mantine-button-primary text-lg"
              style={{ minWidth: '160px', padding: '0.75rem 2rem' }}
            >
              <span className="mantine-Button-inner">
                <span className="mantine-Button-label">Create Account</span>
              </span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
