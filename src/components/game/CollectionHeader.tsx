'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/AlertDialog';
import { Trash2 } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'sonner';

interface CollectionHeaderProps {
  title: string;
}

export function CollectionHeader({ title }: CollectionHeaderProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const supabase = createClientComponentClient();

  const emptyCollection = async () => {
    setIsDeleting(true);
    try {
      // First get the current user's ID
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to empty your collection');
        return;
      }
      
      // Delete all cards for the current user
      const { error } = await supabase
        .from('player_cards')
        .delete()
        .eq('player_id', user.id);
      
      if (error) {
        console.error('Error emptying collection:', error);
        toast.error('Failed to empty collection');
      } else {
        toast.success('Collection emptied successfully');
        // Reload the page to reflect the changes
        window.location.reload();
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-3xl font-bold">{title}</h1>
      <div className="flex items-center gap-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="flex items-center gap-1">
              <Trash2 size={16} />
              Empty Collection
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action will permanently delete all cards in your collection. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={emptyCollection} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Yes, empty collection'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
