
-- Single-row table to track global download count
CREATE TABLE public.download_counter (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  total_downloads bigint NOT NULL DEFAULT 0
);

-- Seed with initial row
INSERT INTO public.download_counter (id, total_downloads) VALUES (1, 0);

-- Allow anyone to read the counter
ALTER TABLE public.download_counter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read download counter"
  ON public.download_counter FOR SELECT
  TO anon, authenticated
  USING (true);

-- Function to atomically increment the counter
CREATE OR REPLACE FUNCTION public.increment_downloads()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.download_counter
  SET total_downloads = total_downloads + 1
  WHERE id = 1
  RETURNING total_downloads;
$$;
