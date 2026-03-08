import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook to measure the width of a container element
 * Uses ResizeObserver for real-time updates
 */
export const useContainerWidth = () => {
    const [width, setWidth] = useState(0);
    const [mounted, setMounted] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleResize = useCallback((entries: ResizeObserverEntry[]) => {
        for (const entry of entries) {
            if (entry.contentRect) {
                setWidth(entry.contentRect.width);
            }
        }
    }, []);

    useEffect(() => {
        setMounted(true);
        const observer = new ResizeObserver(handleResize);

        if (containerRef.current) {
            observer.observe(containerRef.current);
            // Initial measure
            setWidth(containerRef.current.offsetWidth);
        }

        return () => observer.disconnect();
    }, [handleResize]);

    return { width, containerRef, mounted };
};
