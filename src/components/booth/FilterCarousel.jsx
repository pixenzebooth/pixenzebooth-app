import React from 'react';
import { motion } from 'framer-motion';
import { useDraggableScroll } from '../../hooks/useDraggableScroll';
import FilterPreview from './FilterPreview';
import { getFilterCss } from '../../utils/imageUtils';

/**
 * Filter carousel that allows users to select built-in filters and custom LUTs.
 */
const FilterCarousel = ({ allFilters, activeFilter, onSelectFilter }) => {
    const {
        scrollRef,
        onMouseDown,
        onMouseLeave,
        onMouseUp,
        onMouseMove
    } = useDraggableScroll();

    return (
        <div className="w-full h-full flex items-center relative">
            <div
                ref={scrollRef}
                onMouseDown={onMouseDown}
                onMouseLeave={onMouseLeave}
                onMouseUp={onMouseUp}
                onMouseMove={onMouseMove}
                className="flex gap-4 md:gap-6 overflow-x-auto custom-scrollbar-hide py-2 md:py-4 select-none cursor-grab active:cursor-grabbing px-2 w-full"
            >
                {allFilters.map((f) => (
                    <motion.button
                        key={f.id}
                        whileHover={{ scale: 1.05, y: -4 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onSelectFilter(f.id)}
                        className={`flex-none w-20 h-20 md:w-24 md:h-24 rounded-2xl border-4 transition-all relative overflow-hidden group ${
                            activeFilter === f.id
                                ? 'border-game-primary shadow-game scale-105 z-10'
                                : 'border-black hover:border-game-primary/50'
                        }`}
                    >
                        <FilterPreview
                            filterCss={f.is_lut ? 'none' : getFilterCss(f.id)}
                            label={f.label}
                            lutUrl={f.is_lut ? f.storage_path : null}
                        />

                        {/* Selection Indicator */}
                        {activeFilter === f.id && (
                            <motion.div
                                layoutId="activeFilter"
                                className="absolute inset-x-0 bottom-0 h-1 bg-game-primary z-30"
                            />
                        )}
                    </motion.button>
                ))}
            </div>
        </div>
    );
};

export default FilterCarousel;
