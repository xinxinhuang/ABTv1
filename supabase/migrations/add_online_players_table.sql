-- Add online_players table for tracking currently online players
CREATE TABLE IF NOT EXISTS public.online_players (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'online' CHECK (status IN ('online', 'in_battle', 'away'))
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS online_players_last_seen_idx ON public.online_players (last_seen);
CREATE INDEX IF NOT EXISTS online_players_status_idx ON public.online_players (status);

-- Enable Row Level Security
ALTER TABLE public.online_players ENABLE ROW LEVEL SECURITY;

-- Grant basic permissions first
GRANT ALL ON public.online_players TO postgres;
GRANT ALL ON public.online_players TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.online_players TO authenticated;
GRANT SELECT ON public.online_players TO anon;

-- RLS policies for online_players
CREATE POLICY "Anyone can view online players" 
  ON public.online_players FOR SELECT 
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can register themselves online" 
  ON public.online_players FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own online status" 
  ON public.online_players FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can unregister themselves" 
  ON public.online_players FOR DELETE 
  TO authenticated 
  USING (auth.uid() = id);

CREATE POLICY "Service role has full access" 
  ON public.online_players FOR ALL 
  TO service_role 
  USING (true) 
  WITH CHECK (true); 