import { CardCollection } from '@/components/game/CardCollection';
import { CollectionHeader } from '@/components/game/CollectionHeader';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Database } from '@/types/database';
import { Card } from '@/types/game';

async function getCards(
  supabase: ReturnType<typeof createServerComponentClient<Database>>,
  userId: string
): Promise<Card[]> {
  const { data, error } = await supabase
    .from('player_cards')
    .select('*')
    .eq('player_id', userId)
    .order('obtained_at', { ascending: false });

  if (error) {
    console.error('Error fetching cards:', error);
    return [];
  }
  return data;
}

export default async function CollectionPage() {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const cards = await getCards(supabase, user.id);

  return (
    <div className="content-height">
      <div className="container mx-auto p-4">
        <CollectionHeader title="My Card Collection" />
        <CardCollection initialCards={cards} />
      </div>
    </div>
  );
}
