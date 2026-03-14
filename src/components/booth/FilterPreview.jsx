import React from 'react';

/**
 * Static preview card for a filter or LUT. 
 * Shows a gradient background with the filter's CSS applied.
 */
const FilterPreview = ({ filterCss, label, lutUrl }) => {
    // Lightweight static preview — no live video per filter to save resources
    const bgStyle = lutUrl
        ? 'bg-gradient-to-br from-purple-500 to-indigo-600'
        : filterCss && filterCss !== 'none'
            ? 'bg-gradient-to-br from-gray-700 to-gray-900'
            : 'bg-gradient-to-br from-gray-600 to-gray-800';

    return (
        <div className={`w-full h-full relative overflow-hidden rounded-xl ${bgStyle}`}
            style={{ filter: (!lutUrl && filterCss) ? filterCss : 'none' }}>
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-white/20 border border-white/30"></div>
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-black/60 text-[7px] md:text-[9px] text-white text-center font-bold font-mono py-0.5 pointer-events-none z-20 truncate px-0.5">
                {label}
            </div>
        </div>
    );
};

export default FilterPreview;
