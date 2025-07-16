'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, Home, LogOut, Package, User, Swords, Clock, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface HamburgerMenuProps {
  className?: string;
}

export function HamburgerMenu({ className = '' }: HamburgerMenuProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className={className}
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
          <span className="sr-only">Menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-48 bg-[var(--bg-secondary)] border border-[var(--border-primary)] shadow-[var(--shadow-md)]"
      >
        <DropdownMenuItem 
          onClick={() => handleNavigation('/')} 
          className="text-[var(--text-primary)] hover:bg-[var(--color-primary-500)] hover:text-[var(--color-secondary-900)]"
        >
          <Home className="mr-2 h-4 w-4" />
          <span>Home</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleNavigation('/game/packs')} 
          className="text-[var(--text-primary)] hover:bg-[var(--color-primary-500)] hover:text-[var(--color-secondary-900)]"
        >
          <Package className="mr-2 h-4 w-4" />
          <span>Packs</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleNavigation('/game/collection')} 
          className="text-[var(--text-primary)] hover:bg-[var(--color-primary-500)] hover:text-[var(--color-secondary-900)]"
        >
          <BookOpen className="mr-2 h-4 w-4" />
          <span>Collection</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleNavigation('/game/arena/lobby')} 
          className="text-[var(--text-primary)] hover:bg-[var(--color-primary-500)] hover:text-[var(--color-secondary-900)]"
        >
          <Swords className="mr-2 h-4 w-4" />
          <span>Arena</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleNavigation('/game/timers')} 
          className="text-[var(--text-primary)] hover:bg-[var(--color-primary-500)] hover:text-[var(--color-secondary-900)]"
        >
          <Clock className="mr-2 h-4 w-4" />
          <span>Timers</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleNavigation('/game/profile')} 
          className="text-[var(--text-primary)] hover:bg-[var(--color-primary-500)] hover:text-[var(--color-secondary-900)]"
        >
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[var(--border-primary)]" />
        <DropdownMenuItem 
          onClick={handleLogout} 
          className="text-[var(--text-primary)] hover:bg-[var(--color-error)] hover:text-white"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
