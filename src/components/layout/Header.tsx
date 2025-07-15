'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { HamburgerMenu } from '@/components/navigation/HamburgerMenu';
import { 
  Home, 
  Package, 
  User, 
  Swords, 
  Clock, 
  Shield, 
  LogOut, 
  Settings,
  Trophy,
  BookOpen
} from 'lucide-react';
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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'border-b backdrop-blur-sm' 
          : 'backdrop-blur-sm'
      }`}
      style={{
        backgroundColor: 'var(--mantine-color-dark-7)',
        boxShadow: isScrolled ? 'var(--shadow-card)' : 'none',
        borderColor: isScrolled ? 'rgb(var(--mantine-border))' : 'transparent'
      }}
    >
      <div className="container-mantine">
        <div className="flex items-center justify-between nav-height">
          {/* Logo / Brand - Mantine style */}
          <Link 
            href="/"
            className="flex items-center space-x-2 text-xl font-bold transition-colors"
            style={{ color: '#ffffff' }}
          >
            <div 
              className="w-8 h-8 rounded-md flex items-center justify-center"
              style={{ 
                backgroundColor: 'rgb(var(--mantine-yellow))',
                color: 'rgb(var(--mantine-black))'
              }}
            >
              <Shield className="w-5 h-5" />
            </div>
            <span className="hidden sm:inline">A boring TCG</span>
          </Link>

          {/* Desktop Navigation - Mantine style */}
          <nav className="hidden md:flex items-center space-x-1">
            {user && navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`mantine-focus-auto mantine-active mantine-Button-root mantine-UnstyledButton-root text-sm font-medium transition-all duration-200 ${
                  item.isActive
                    ? 'mantine-button-primary'
                    : 'mantine-button-ghost'
                }`}
                style={{ padding: '0.5rem 0.75rem' }}
              >
                <span className="mantine-Button-inner">
                  <span className="mantine-Button-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {item.icon}
                    <span>{item.label}</span>
                  </span>
                </span>
              </Link>
            ))}
          </nav>

          {/* Right side actions - Mantine style */}
          <div className="flex items-center space-x-2">
            {isLoading ? (
              <div 
                className="w-6 h-6 animate-spin rounded-full border-2 border-t-transparent"
                style={{ borderColor: 'rgb(var(--mantine-yellow))' }}
              />
            ) : user ? (
              <>


                {/* User menu */}
                <div className="hidden sm:flex items-center space-x-2">
                  <button
                    onClick={handleLogout}
                    className="mantine-focus-auto mantine-active mantine-Button-root mantine-UnstyledButton-root mantine-button-ghost"
                  >
                    <span className="mantine-Button-inner">
                      <span className="mantine-Button-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </span>
                    </span>
                  </button>
                </div>

                {/* Mobile menu */}
                <div className="md:hidden">
                  <HamburgerMenu />
                </div>
              </>
            ) : (
              /* Auth buttons for non-authenticated users - Mantine style */
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="mantine-focus-auto mantine-active mantine-Button-root mantine-UnstyledButton-root mantine-button-default"
                >
                  <span className="mantine-Button-inner">
                    <span className="mantine-Button-label">Sign In</span>
                  </span>
                </Link>
                <Link
                  href="/signup"
                  className="mantine-focus-auto mantine-active mantine-Button-root mantine-UnstyledButton-root mantine-button-primary"
                >
                  <span className="mantine-Button-inner">
                    <span className="mantine-Button-label">Sign Up</span>
                  </span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>


    </header>
  );
}
