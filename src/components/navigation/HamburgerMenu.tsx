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
import { Menu, Home, LogOut, Package, User } from 'lucide-react';
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
          size="sm"
          className={`p-2 ${className}`}
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
      <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
        <DropdownMenuItem onClick={() => handleNavigation('/game')} className="hover:bg-gray-100 dark:hover:bg-gray-700">
          <Home className="mr-2 h-4 w-4" />
          <span>Main Menu</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleNavigation('/game/packs')} className="hover:bg-gray-100 dark:hover:bg-gray-700">
          <Package className="mr-2 h-4 w-4" />
          <span>Booster Packs</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleNavigation('/game/collection')} className="hover:bg-gray-100 dark:hover:bg-gray-700">
          <User className="mr-2 h-4 w-4" />
          <span>Collection</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="hover:bg-gray-100 dark:hover:bg-gray-700">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
