-- Asegurar que players_rankings permite actualizaciones
-- En un entorno de producción real, esto debería hacerse a través de una función SECURITY DEFINER
-- o verificando que ambos usuarios están en la misma sala.
-- Por ahora, para que el prototipo funcione, permitiremos actualizaciones autenticadas.

ALTER TABLE public.players_rankings ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 100;

ALTER TABLE public.players_rankings ENABLE ROW LEVEL SECURITY;

-- Permitir lectura a todos los autenticados
CREATE POLICY "Users can read all rankings" 
    ON public.players_rankings FOR SELECT 
    USING (auth.role() = 'authenticated');

-- Permitir inserción propia
CREATE POLICY "Users can insert their own ranking" 
    ON public.players_rankings FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Permitir actualización a usuarios autenticados (necesario para que un jugador actualice el MMR del otro al reportar)
-- Nota: En producción, esto debe restringirse a una función del servidor o verificar la tabla match_results
DROP POLICY IF EXISTS "Users can update their own ranking" ON public.players_rankings;
DROP POLICY IF EXISTS "Users can update rankings" ON public.players_rankings;

CREATE POLICY "Users can update rankings" 
    ON public.players_rankings FOR UPDATE 
    USING (auth.role() = 'authenticated');
