-- Tabla para gestionar la cola de emparejamiento basada en MMR
CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    game_id TEXT NOT NULL,
    mmr INTEGER NOT NULL DEFAULT 1000,
    room_id UUID REFERENCES public.netplay_rooms(id) ON DELETE SET NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para optimizar la búsqueda por juego y rango de MMR
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_game_mmr ON public.matchmaking_queue(game_id, mmr);
CREATE INDEX IF NOT EXISTS idx_matchmaking_queue_joined_at ON public.matchmaking_queue(joined_at);

-- RLS (Row Level Security)
ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
-- Los usuarios pueden verse a sí mismos y a otros en la cola para poder hacer match
CREATE POLICY "Users can read matchmaking queue" 
    ON public.matchmaking_queue FOR SELECT 
    USING (auth.role() = 'authenticated');

-- Los usuarios solo pueden insertarse/actualizarse a sí mismos
CREATE POLICY "Users can insert themselves into queue" 
    ON public.matchmaking_queue FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden actualizarse a sí mismos, o pueden actualizar a un oponente para asignarle un room_id si está null
CREATE POLICY "Users can update queue entries" 
    ON public.matchmaking_queue FOR UPDATE 
    USING (auth.uid() = user_id OR room_id IS NULL);

-- Los usuarios solo pueden eliminarse a sí mismos
CREATE POLICY "Users can delete themselves from queue" 
    ON public.matchmaking_queue FOR DELETE 
    USING (auth.uid() = user_id);
