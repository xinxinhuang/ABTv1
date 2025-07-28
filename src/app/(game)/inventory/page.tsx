import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { redirect } from 'next/navigation';

import { InventoryDisplay } from '@/components/game/InventoryDisplay';
import { PlayerInventory } from '@/types/game';

export default async function InventoryPage() {
  const supabase = createServerComponentClient({ cookies });

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const { data: inventory } = await supabase
    .from('player_inventory')
    .select('*')
    .eq('player_id', user.id)
    .single();

  return (
    <div className="content-height">
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4">Inventory</h1>
        <InventoryDisplay inventory={inventory as PlayerInventory | null} />
      </div>
    </div>
  );
}
