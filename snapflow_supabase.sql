
-- ============================================================
-- KEMASKINI: TABLE REPORTS (untuk Laporan Video)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reports (
    id          BIGSERIAL PRIMARY KEY,
    video_id    BIGINT  REFERENCES public.videos(id) ON DELETE CASCADE,
    reporter_id UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
    reason      TEXT    NOT NULL,
    status      TEXT    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_video_id ON public.reports(video_id);
CREATE INDEX IF NOT EXISTS idx_reports_status   ON public.reports(status);

-- RLS untuk reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- User boleh hantar laporan
CREATE POLICY "User boleh hantar laporan"
    ON public.reports FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Hanya admin boleh lihat semua laporan (guna service_role key)
-- User biasa tidak boleh baca laporan
