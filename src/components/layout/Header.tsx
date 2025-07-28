'use client';

import Link from 'next/link';
import { 
  Home, 
  Package, 
  User, 
  Swords, 
  Clock, 
  Shield, 
  LogOut,
  BookOpen
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

import { Button } from '@/components/ui/Button';
import { HamburgerMenu } from '@/components/navigation/HamburgerMenu';
import { supabase } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';

interface NavigationItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  isActive?: boolean;
}

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useUser();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Navigation items for authenticated users
  const navigationItems: NavigationItem[] = [
    {
      href: '/',
      label: 'Home',
      icon: <Home className="w-4 h-4" />,
      isActive: pathname === '/'
    },
    {
      href: '/game/packs',
      label: 'Packs',
      icon: <Package className="w-4 h-4" />,
      isActive: pathname.startsWith('/game/packs')
    },
    {
      href: '/game/collection',
      label: 'Collection',
      icon: <BookOpen className="w-4 h-4" />,
      isActive: pathname.startsWith('/game/collection')
    },
    {
      href: '/game/arena/lobby',
      label: 'Arena',
      icon: <Swords className="w-4 h-4" />,
      isActive: pathname.startsWith('/game/arena')
    },
    {
      href: '/game/timers',
      label: 'Timers',
      icon: <Clock className="w-4 h-4" />,
      isActive: pathname.startsWith('/game/timers')
    },
    {
      href: '/game/profile',
      label: 'Profile',
      icon: <User className="w-4 h-4" />,
      isActive: pathname.startsWith('/game/profile')
    }
  ];



  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Don't render header on auth pages
  if (pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/register')) {
    return null;
  }

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-[var(--bg-primary)] backdrop-blur-sm ${
        isScrolled 
          ? 'border-b border-[var(--border-primary)] shadow-[var(--shadow-sm)]' 
          : ''
      }`}
    >
      <div className="container-game">
        <div className="flex items-center justify-between nav-height">
          {/* Logo / Brand */}
          <Link 
            href="/"
            className="flex items-center space-x-2 text-xl font-bold text-[var(--text-primary)] hover:text-[var(--color-primary-500)] transition-colors"
          >
            <div className="w-8 h-8 bg-[var(--color-primary-500)] text-[var(--color-secondary-900)] rounded-[var(--radius-md)] flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <span className="hidden sm:inline">A boring TCG</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {user && navigationItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={item.isActive ? 'primary' : 'ghost'}
                  size="sm"
                  leftIcon={item.icon}
                >
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center space-x-2">
            {isLoading ? (
              <div className="w-6 h-6 animate-spin rounded-full border-2 border-[var(--color-primary-500)] border-t-transparent" />
            ) : user ? (
              <>
                {/* Desktop logout */}
                <div className="hidden sm:flex">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    leftIcon={<LogOut className="w-4 h-4" />}
                  >
                    Logout
                  </Button>
                </div>

                {/* Mobile menu */}
                <div className="md:hidden">
                  <HamburgerMenu />
                </div>
              </>
            ) : (
              /* Auth buttons for non-authenticated users */
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <Button variant="outline" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button variant="primary" size="sm">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
