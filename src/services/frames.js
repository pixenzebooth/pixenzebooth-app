import { supabase } from '../lib/supabase';

const normalizeLayoutConfig = (config) => {
    if (!config) return { a: [], b: [], images: {} };
    if (Array.isArray(config)) return { a: config, b: [], images: {} };
    return {
        a: Array.isArray(config.a) ? config.a : [],
        b: Array.isArray(config.b) ? config.b : [],
        images: config.images || {}
    };
};

export const getFrames = async (tenantId = null) => {
    let query = supabase
        .from('frames')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

    // Multi-tenant isolation:
    // - If tenantId exists (subdomain detected): load global + tenant-specific frames
    // - If NO tenantId (localhost / no subdomain): load ALL frames (no filter)
    if (tenantId) {
        query = query.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);
    }
    // else: no filter — load all frames for development/localhost

    const { data, error } = await query;

    if (error) {
        console.warn("Query failed, running fallback without tenant filter...", error);
        const { data: fallbackData, error: fallbackError } = await supabase
            .from('frames')
            .select('*')
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false });

        if (fallbackError) {
            console.error("Critical fallback failed:", fallbackError);
            throw fallbackError;
        }
        return fallbackData;
    }

    return data;
};

const uploadFile = async (file, bucket = 'frames') => {
    if (!file.type.match(/^image\/(jpeg|png|webp|gif|svg\+xml)$/) && file.type !== '') {
        // file.type might be empty on some systems, but usually browser sets it.
        // Stricter check:
        throw new Error(`Invalid file type: ${file.type}. Only images are allowed.`);
    }
    if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size too large (max 5MB).');
    }

    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
    const { data, error } = await supabase.storage.from(bucket).upload(fileName, file, { cacheControl: '31536000' });
    if (error) throw error;
    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return publicUrlData.publicUrl;
};

export const createFrame = async (frameData, tenantId = null) => {
    let imageUrl = frameData.image;

    if (frameData.externalImage) {
        imageUrl = frameData.externalImage;
    } else if (frameData.file) {
        imageUrl = await uploadFile(frameData.file);
    }

    let imageUrlB = null;
    if (frameData.externalImageB) {
        imageUrlB = frameData.externalImageB;
    } else if (frameData.imageFileB) {
        imageUrlB = await uploadFile(frameData.imageFileB);
    }

    let thumbnailUrl = null;
    if (frameData.thumbnailFile) {
        thumbnailUrl = await uploadFile(frameData.thumbnailFile);
    }

    const finalLayoutConfig = normalizeLayoutConfig(frameData.layout_config);
    if (imageUrlB) {
        finalLayoutConfig.images = {
            ...finalLayoutConfig.images,
            b: imageUrlB
        };
    }

    const insertData = {
        name: frameData.name,
        image_url: imageUrl,
        thumbnail_url: thumbnailUrl,
        status: frameData.status || 'active',
        layout_config: finalLayoutConfig,
        style: frameData.style || 'Custom',
        rarity: frameData.rarity || 'Common',
        artist: frameData.artist || 'Default',
        type: 'custom'
    };
    if (tenantId) insertData.tenant_id = tenantId;

    const { data, error } = await supabase
        .from('frames')
        .insert([insertData])
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateFrame = async (id, updates) => {
    const dbUpdates = { ...updates };

    delete dbUpdates.file;
    delete dbUpdates.imageFileB;
    delete dbUpdates.thumbnailFile;
    delete dbUpdates.externalImage; // Clean up payload
    delete dbUpdates.externalImageB;

    if (updates.externalImage) {
        dbUpdates.image_url = updates.externalImage;
    }
    else if (updates.file) {
        dbUpdates.image_url = await uploadFile(updates.file);
    }

    if (dbUpdates.layout_config) {
        dbUpdates.layout_config = normalizeLayoutConfig(dbUpdates.layout_config);
    }

    if (updates.externalImageB) {
        const normalized = normalizeLayoutConfig(dbUpdates.layout_config);
        normalized.images = { ...normalized.images, b: updates.externalImageB };
        dbUpdates.layout_config = normalized;
    } else if (updates.imageFileB) {
        const urlB = await uploadFile(updates.imageFileB);
        const normalized = normalizeLayoutConfig(dbUpdates.layout_config);
        normalized.images = { ...normalized.images, b: urlB };
        dbUpdates.layout_config = normalized;
    }

    if (updates.thumbnailFile) {
        dbUpdates.thumbnail_url = await uploadFile(updates.thumbnailFile);
    }

    const { data, error } = await supabase
        .from('frames')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteFrame = async (id, imageUrl) => {
    const { error } = await supabase
        .from('frames')
        .delete()
        .eq('id', id);

    if (error) throw error;

    if (imageUrl && imageUrl.includes('supabase.co')) {
        const urlParts = imageUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        if (fileName) {
            await supabase.storage.from('frames').remove([fileName]);
        }
    }

    return true;
};
