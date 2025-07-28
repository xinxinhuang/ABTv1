'use client';

import { Bell, Check, Trash } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

import { BattleNotification } from '@/types/game';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase/client';

interface NotificationsPanelProps {
  onNotificationClick?: (battleId: string) => void;
}

export function NotificationsPanel({ onNotificationClick }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<BattleNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  useEffect(() => {
    const setupSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) return;
      
      const channel = supabase
        .channel('battle-notifications')
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'battle_notifications', filter: `user_id=eq.${session.user.id}` },
            (payload) => {
              setNotifications(prev => [payload.new as BattleNotification, ...prev]);
              toast.info('New battle notification received!');
            })
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    };
    
    setupSubscription();
  }, []);

  const fetchNotifications = async () => {
    setIsLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) return;
      
      const { data, error } = await supabase
        .from('battle_notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) {
        console.error('Error fetching notifications:', error);
      } else {
        setNotifications(data || []);
      }
    } catch (error) {
      console.error('Error in fetchNotifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('battle_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      
      if (error) {
        console.error('Error marking notification as read:', error);
      } else {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
        );
      }
    } catch (error) {
      console.error('Error in markAsRead:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('battle_notifications')
        .delete()
        .eq('id', notificationId);
      
      if (error) {
        console.error('Error deleting notification:', error);
      } else {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      }
    } catch (error) {
      console.error('Error in deleteNotification:', error);
    }
  };

  const handleNotificationClick = (notification: BattleNotification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    if (onNotificationClick) {
      onNotificationClick(notification.battle_id);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="relative">
      <Button 
        variant="outline" 
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
            {unreadCount}
          </span>
        )}
      </Button>
      
      {isOpen && (
        <Card className="absolute right-0 mt-2 w-80 z-50 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex justify-between items-center">
              <span>Notifications</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsOpen(false)}
              >
                ×
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center items-center h-20">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-4 text-sm text-gray-500">
                No notifications
              </div>
            ) : (
              <ul className="space-y-2">
                {notifications.map(notification => (
                  <li 
                    key={notification.id} 
                    className={`p-2 rounded-md text-sm ${notification.is_read ? 'bg-gray-50' : 'bg-blue-50'}`}
                  >
                    <div 
                      className="cursor-pointer"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <p>{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex justify-end mt-2 space-x-1">
                      {!notification.is_read && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => deleteNotification(notification.id)}
                      >
                        <Trash className="h-3 w-3" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
