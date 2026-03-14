import { useRef } from 'react';

/**
 * Hook to enable mouse-based dragging for scrollable elements.
 * Useful for horizontal filter lists and galleries.
 */
export const useDraggableScroll = () => {
    const scrollRef = useRef(null);
    const isDragging = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);

    const onMouseDown = (e) => {
        if (!scrollRef.current) return;
        isDragging.current = true;
        startX.current = e.pageX - scrollRef.current.offsetLeft;
        scrollLeft.current = scrollRef.current.scrollLeft;
    };

    const onMouseLeave = () => {
        isDragging.current = false;
    };

    const onMouseUp = () => {
        isDragging.current = false;
    };

    const onMouseMove = (e) => {
        if (!isDragging.current || !scrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX.current) * 2;
        scrollRef.current.scrollLeft = scrollLeft.current - walk;
    };

    return {
        scrollRef,
        onMouseDown,
        onMouseLeave,
        onMouseUp,
        onMouseMove
    };
};
