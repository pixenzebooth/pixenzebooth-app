import React, { useState, useEffect } from 'react';
import { getFilterCss } from '../utils/imageUtils';
import { applyLutToImage } from '../utils/lutUtils';

const FilteredImage = ({ src, filter, className = "" }) => {
    const [filteredSrc, setFilteredSrc] = useState(src);
    const [isProcessing, setIsProcessing] = useState(false);

    // Extract filter info at the top level so it's available in the render phase
    const isLut = filter?.is_lut || false;
    const lutUrl = filter?.storage_path || filter?.lutUrl || null;
    
    let filterId = 'none';
    if (typeof filter === 'string') filterId = filter;
    else if (filter?.filter) filterId = filter.filter;
    else if (filter?.id) filterId = filter.id;

    useEffect(() => {
        if (!filter) return;

        if (isLut && lutUrl) {
            const applyFilter = async () => {
                setIsProcessing(true);
                try {
                    const result = await applyLutToImage(src, lutUrl);
                    setFilteredSrc(result);
                } catch (e) {
                    console.error("Failed to apply LUT in image:", e);
                    setFilteredSrc(src);
                } finally {
                    setIsProcessing(false);
                }
            };
            applyFilter();
        } else {
            setFilteredSrc(src);
            setIsProcessing(false);
        }
    }, [src, filter, isLut, lutUrl]);

    return (
        <div className={`relative ${className}`}>
            <img 
                src={filteredSrc} 
                className={`w-full h-full object-cover transition-all duration-500 ${isProcessing ? 'opacity-50 blur-sm' : ''}`}
                style={{ 
                    filter: (!filter || (isLut)) ? 'none' : getFilterCss(filterId) 
                }}
            />
            {isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-game-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
        </div>
    );
};

export default FilteredImage;
