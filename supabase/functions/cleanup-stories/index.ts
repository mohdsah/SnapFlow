// ============================================================
//  SNAPFLOW — Edge Function: Auto-Hapus Stories Expired
//  Deploy: npx supabase functions deploy cleanup-stories
//  Jadual: Supabase Dashboard → Edge Functions → Cron
//          Masa: 0 * * * * (setiap jam)
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
    // Semak authorization (optional security)
    const authHeader = req.headers.get('Authorization')
    const cronSecret = Deno.env.get('CRON_SECRET')
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return new Response('Unauthorized', { status: 401 })
    }

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Stories yang dah melebihi 24 jam
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: expired, error } = await supabase
        .from('stories')
        .select('id, media_url, user_id')
        .lt('created_at', cutoff)

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }

    if (!expired || expired.length === 0) {
        return new Response(JSON.stringify({ deleted: 0, message: 'Tiada stories expired' }), {
            headers: { 'Content-Type': 'application/json' }
        })
    }

    // Padam rekod dari database
    const ids = expired.map((s: any) => s.id)
    await supabase.from('stories').delete().in('id', ids)

    // Padam fail media dari Storage
    const toDeleteImages: string[] = []
    const toDeleteVideos: string[] = []

    for (const story of expired) {
        try {
            const url  = new URL(story.media_url)
            const path = url.pathname.split('/object/public/')[1]
            if (!path) continue
            const [bucket, ...parts] = path.split('/')
            const filePath = parts.join('/')
            if (bucket === 'images') toDeleteImages.push(filePath)
            if (bucket === 'videos') toDeleteVideos.push(filePath)
        } catch { /* abaikan */ }
    }

    if (toDeleteImages.length > 0)
        await supabase.storage.from('images').remove(toDeleteImages)
    if (toDeleteVideos.length > 0)
        await supabase.storage.from('videos').remove(toDeleteVideos)

    console.log(`[cleanup-stories] Dipadam: ${ids.length} stories, ${toDeleteImages.length + toDeleteVideos.length} fail`)

    return new Response(JSON.stringify({
        deleted: ids.length,
        filesRemoved: toDeleteImages.length + toDeleteVideos.length,
        timestamp: new Date().toISOString()
    }), {
        headers: { 'Content-Type': 'application/json' }
    })
})
