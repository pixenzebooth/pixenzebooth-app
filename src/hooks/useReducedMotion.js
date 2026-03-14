import { useState, useEffect } from 'react';

/**
 * Returns true if the user prefers reduced motion OR if the device is mobile.
 * Used to disable expensive infinite animations on low-end devices.
 */
export const useReducedMotion = () => {
    const [shouldReduce, setShouldReduce] = useState(false);

    useEffect(() => {
        // Check prefers-reduced-motion media query
        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        // Check if mobile (viewport width < 768px)
        const mobileQuery = window.matchMedia('(max-width: 767px)');

        const update = () => {
            setShouldReduce(motionQuery.matches || mobileQuery.matches);
        };

        update();
        motionQuery.addEventListener('change', update);
        mobileQuery.addEventListener('change', update);

        return () => {
            motionQuery.removeEventListener('change', update);
            mobileQuery.removeEventListener('change', update);
        };
    }, []);

    return shouldReduce;
};
