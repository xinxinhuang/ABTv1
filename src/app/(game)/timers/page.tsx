import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ActiveTimersDisplay } from '@/components/game/ActiveTimersDisplay';
import { StartTimerForm } from '@/components/game/StartTimerForm';
import { ActiveTimer } from '@/types/game';

export default async function TimersPage() {
  const supabase = createServerComponentClient({ cookies });

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const { data: timers } = await supabase
    .from('active_timers')
    .select('*')
    .eq('player_id', user.id)
    .order('start_time', { ascending: true });

  return (
    <div className="content-height">
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4">Timers</h1>
        <div className="grid md:grid-cols-2 gap-8">
          <StartTimerForm />
          <ActiveTimersDisplay timers={timers as ActiveTimer[] || []} />
        </div>
      </div>
    </div>
  );
}
