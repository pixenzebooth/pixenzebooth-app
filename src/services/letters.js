import { supabase } from '../lib/supabase';

export const getMyLetters = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email?.toLowerCase();


    const { data, error } = await supabase
        .from('letters')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    if (error) {
        return [];
    }

    if (!data) return [];

    const relevantLetters = data.filter(letter => {
        const hasTargets = letter.allowed_emails && letter.allowed_emails.length > 0;

        if (!hasTargets) return true;

        if (userEmail && letter.allowed_emails.includes(userEmail)) return true;

        return false;
    });

    return relevantLetters;
};
