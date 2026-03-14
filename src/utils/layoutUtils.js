/**
 * Resolves layout_config (any format) to a flat array of slots for the given layout key.
 * Handles 3 possible DB formats:
 *   1. Flat array: [{id, x, y, width, height}, ...]
 *   2. Object: {a: [...], b: [...]}
 *   3. Object with images: {a: [...], b: [...], images: {b: "url"}}
 *
 * @param {Array|Object|null} layoutConfig - The raw layout_config from DB
 * @param {'a'|'b'} layout - Which layout to resolve (default: 'a')
 * @returns {Array} Flat array of slot objects
 */
export const resolveLayoutSlots = (layoutConfig, layout = 'a') => {
    if (!layoutConfig) return [];
    if (Array.isArray(layoutConfig)) return layoutConfig;
    // Object format: { a: [...], b: [...], images: {...} }
    const slots = layoutConfig[layout];
    if (Array.isArray(slots) && slots.length > 0) return slots;
    // Fallback to layout A if requested layout has no slots
    return Array.isArray(layoutConfig.a) ? layoutConfig.a : [];
};

/**
 * Checks if a layout_config represents a frame with multiple distinct layouts.
 * A frame has multiple layouts if:
 *   - layout_config is an object (not array), AND
 *   - Layout B has its own slots OR a separate image
 *
 * @param {Array|Object|null} layoutConfig - The raw layout_config from DB
 * @returns {boolean}
 */
export const hasMultipleLayouts = (layoutConfig) => {
    if (!layoutConfig || Array.isArray(layoutConfig)) return false;
    const hasBSlots = Array.isArray(layoutConfig.b) && layoutConfig.b.length > 0;
    const hasBImage = !!layoutConfig.images?.b;
    return hasBSlots || hasBImage;
};

/**
 * Gets the override image URL for a specific layout, if any.
 * Layout A always uses the main image_url. Layout B may have an override in images.b.
 *
 * @param {Array|Object|null} layoutConfig - The raw layout_config from DB
 * @param {'a'|'b'} layout - Which layout
 * @returns {string|null} Override URL or null (use main image_url)
 */
export const getLayoutImage = (layoutConfig, layout = 'a') => {
    if (layout === 'b' && layoutConfig && !Array.isArray(layoutConfig)) {
        return layoutConfig.images?.b || null;
    }
    return null;
};
