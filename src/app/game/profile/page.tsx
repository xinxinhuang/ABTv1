import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { redirect } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { LogoutButton } from '@/components/auth/LogoutButton';

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  return (
    <div className="content-height flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-semibold">Welcome</p>
            <p>{profile?.username || 'User'}</p>
          </div>
          <div>
            <p className="font-semibold">Email</p>
            <p>{user.email}</p>
          </div>
          <LogoutButton />
        </CardContent>
      </Card>
    </div>
  );
}