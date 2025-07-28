import type { Database } from '@/types/database';

import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export const createServerClient = () => createServerComponentClient<Database>({ cookies });
