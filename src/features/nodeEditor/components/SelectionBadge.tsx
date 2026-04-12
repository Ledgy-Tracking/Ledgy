import React from 'react';

/**
 * Selection Badge Component
 * Shows the count of selected nodes
 * Story 4.9: Sub-Graph Container Grouping
 */
interface SelectionBadgeProps {
    count: number;
}

export const SelectionBadge: React.FC<SelectionBadgeProps> = ({ count }) => {
    if (count < 2) return null;
    
    return (
        <div className="selection-badge fixed bottom-4 left-4 z-50">
            {count} {count === 1 ? 'node' : 'nodes'} selected
        </div>
    );
};

export default SelectionBadge;
