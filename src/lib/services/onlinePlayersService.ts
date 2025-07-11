import { supabase } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';
import { toast } from 'sonner';

export interface OnlinePlayer {
  id: string;
  username: string;
  last_seen: string;
  status: 'online' | 'in_battle' | 'away';
}

/**
 * Service to handle online player tracking
 */
export const onlinePlayersService = {
  /**
   * Register the current user as online
   */
  async registerOnline(user: User, username: string): Promise<void> {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('online_players')
        .upsert({
          id: user.id,
          username,
          last_seen: new Date().toISOString(),
          status: 'online'
        }, {
          onConflict: 'id'
        });
        
      if (error) {
        console.error('Error registering online status:', error);
        
        // Check if the error is due to missing tables
        if (error.code === '42P01') { // PostgreSQL code for undefined_table
          toast.error('Database tables not found. Please run the schema.sql file in your Supabase SQL editor.');
          return;
        }
      }
      
      // Set up a heartbeat to update last_seen
      this.startHeartbeat(user.id);
    } catch (err) {
      console.error('Failed to register online status:', err);
    }
  },
  
  /**
   * Update user status
   */
  async updateStatus(userId: string, status: 'online' | 'in_battle' | 'away'): Promise<void> {
    try {
      const { error } = await supabase
        .from('online_players')
        .update({ 
          status,
          last_seen: new Date().toISOString() 
        })
        .eq('id', userId);
        
      if (error) {
        console.error('Error updating status:', error);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  },
  
  /**
   * Unregister user when they go offline
   */
  async unregisterOnline(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('online_players')
        .delete()
        .eq('id', userId);
        
      if (error) {
        console.error('Error unregistering online status:', error);
      }
      
      this.stopHeartbeat();
    } catch (err) {
      console.error('Failed to unregister online status:', err);
    }
  },
  
  /**
   * Get all currently online players
   */
  async getOnlinePlayers(): Promise<OnlinePlayer[]> {
    try {
      // Get players who were seen in the last 5 minutes
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
      
      const { data, error } = await supabase
        .from('online_players')
        .select('*')
        .gt('last_seen', fiveMinutesAgo.toISOString());
      
      if (error) {
        console.error('Error fetching online players:', error);
        
        // Check if the error is due to missing tables
        if (error.code === '42P01') { // PostgreSQL code for undefined_table
          toast.error('Database tables not found. Please run the schema.sql file in your Supabase SQL editor.');
        }
        
        return [];
      }
      
      return data as OnlinePlayer[];
    } catch (err) {
      console.error('Failed to fetch online players:', err);
      return [];
    }
  },
  
  // Heartbeat to keep the user's online status updated
  heartbeatInterval: null as NodeJS.Timeout | null,
  
  startHeartbeat(userId: string): void {
    // Clear any existing heartbeat
    this.stopHeartbeat();
    
    // Update last_seen every 30 seconds
    this.heartbeatInterval = setInterval(async () => {
      try {
        const { error } = await supabase
          .from('online_players')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', userId);
          
        if (error) {
          console.error('Error updating heartbeat:', error);
        }
      } catch (err) {
        console.error('Failed to update heartbeat:', err);
      }
    }, 30000); // 30 seconds
  },
  
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  },
  
  /**
   * Subscribe to online player changes
   */
  subscribeToOnlinePlayers(callback: (players: OnlinePlayer[]) => void): () => void {
    const channel = supabase.channel('online-players')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'online_players' }, 
          async () => {
            // When any change happens to online_players, fetch the latest list
            const players = await this.getOnlinePlayers();
            callback(players);
          }
      )
      .subscribe();
      
    // Return unsubscribe function
    return () => {
      channel.unsubscribe();
    };
  }
};
