CREATE TABLE IF NOT EXISTS public.match_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES public.netplay_rooms(id) ON DELETE CASCADE,
    game_id TEXT NOT NULL,
    reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    opponent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('win', 'loss', 'draw', 'disputed')),
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    processed BOOLEAN DEFAULT FALSE
);

-- Index for quick lookups by room
CREATE INDEX IF NOT EXISTS idx_match_results_room ON public.match_results(room_id);

-- RLS Policies
ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own results"
    ON public.match_results FOR INSERT
    WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view results for their rooms"
    ON public.match_results FOR SELECT
    USING (auth.uid() = reporter_id OR auth.uid() = opponent_id);

CREATE POLICY "Users can update results for their rooms"
    ON public.match_results FOR UPDATE
    USING (auth.uid() = reporter_id OR auth.uid() = opponent_id);
