import { supabase } from '../lib/supabase';

/**
 * Checks if the Lucky Giveway Campaign is ACTIVE and HAS SLOTS.
 * Returns { active: boolean, remaining: number }
 */
export const checkCampaignStatus = async () => {
    if (!supabase) return { active: false, remaining: 0 };

    try {
        const { data, error } = await supabase
            .from('campaign_settings')
            .select('*')
            .eq('id', 1)
            .single();

        if (error) throw error;

        if (!data.is_active) {
            return { active: false, remaining: 0 };
        }

        const remaining = data.max_winners - data.current_winners;
        if (remaining <= 0) {
            return { active: false, remaining: 0 };
        }

        return { active: true, remaining };
    } catch (err) {
        return { active: false, remaining: 0 };
    }
};

/**
 * Submits a winner to the database using atomic RPC call.
 * Uses stored procedure with transaction and row locking to prevent race conditions.
 * 
 * Replaced check-then-act pattern with atomic database transaction.
 * The stored procedure `claim_winner_slot` handles:
 * - Row locking (FOR UPDATE) to prevent concurrent access
 * - Atomic insert + counter increment
 * - Automatic rollback on failure
 */
export const submitWinner = async (winnerData) => {
    if (!supabase) return { success: false, message: "DB Error" };

    try {
        // Use RPC to call stored procedure with atomic transaction
        const { data, error } = await supabase.rpc('claim_winner_slot', {
            p_name: winnerData.name,
            p_whatsapp: winnerData.whatsapp,
            p_address: winnerData.address,
            p_user_id: winnerData.user_id || null,
            p_photo_url: winnerData.photo_url || null
        });

        if (error) {
            // RPC call failed
            return { success: false, message: "Gagal menghubungi server. Coba lagi." };
        }

        // Parse response from stored procedure
        if (data && data.success) {
            return {
                success: true,
                message: data.message,
                remaining: data.remaining
            };
        } else {
            return {
                success: false,
                message: data?.message || "Maaf, kuota sudah penuh!"
            };
        }

    } catch (err) {
        return { success: false, message: "Gagal menyimpan data. Coba lagi." };
    }
};

/**
 * ADMIN: Toggle Campaign Status On/Off
 */
export const toggleCampaign = async (isActive) => {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    return await supabase
        .from('campaign_settings')
        .update({ is_active: isActive })
        .eq('id', 1);
};

/**
 * ADMIN: Reset Counter (New Round)
 */
export const resetCampaign = async () => {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    return await supabase
        .from('campaign_settings')
        .update({ current_winners: 0, is_active: false }) // Reset and pause
        .eq('id', 1);
};

/**
 * ADMIN: Get List of Winners
 */
export const getWinners = async () => {
    if (!supabase) return [];
    const { data } = await supabase
        .from('campaign_winners')
        .select('*')
        .order('created_at', { ascending: false });
    return data || [];
};
