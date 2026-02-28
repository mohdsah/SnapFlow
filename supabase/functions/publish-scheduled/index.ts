// ============================================================
//  SNAPFLOW — Edge Function: Auto-Publish Video Berjadual
//  Deploy: npx supabase functions deploy publish-scheduled
//  Cron:   */5 * * * *  (setiap 5 minit)
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async () => {
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const now = new Date().toISOString()

    // Cari video yang perlu diterbitkan
    const { data: toPublish, error } = await supabase
        .from('videos')
        .update({ is_published: true })
        .eq('is_published', false)
        .lte('scheduled_at', now)
        .not('scheduled_at', 'is', null)
        .select('id, user_id, caption, username')

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }

    // Hantar notifikasi kepada pemilik setiap video
    if (toPublish && toPublish.length > 0) {
        for (const vid of toPublish) {
            await supabase.from('notifications').insert([{
                user_id:  vid.user_id,
                type:     'system',
                message:  `Video "${(vid.caption || 'Video anda').slice(0, 40)}" kini diterbitkan! 📅`
            }])
        }

        console.log(`[publish-scheduled] ${toPublish.length} video diterbitkan pada ${now}`)
    }

    return new Response(JSON.stringify({
        published:  toPublish?.length ?? 0,
        timestamp:  now
    }), {
        headers: { 'Content-Type': 'application/json' }
    })
})
