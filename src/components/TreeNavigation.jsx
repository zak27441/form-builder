import React from 'react';
import { cn } from '../utils/cn'; // Import cn helper

const TreeNavigation = ({ fields = [], onNavigate, activeId }) => {
  const headings = fields.filter(f => f.type.toLowerCase() === 'heading');

  return (
    // Reduced padding (py-4 -> py-2), reduced gap (gap-2 -> gap-0.5)
    <div className="w-full h-full overflow-y-auto custom-scrollbar py-2 flex flex-col gap-0.5">
      {headings.length === 0 && (
        <div className="pl-4 text-gray-400 text-xs italic pt-2">No headings</div>
      )}
      
      {headings.map((field) => (
        <div 
            key={field.id}
            onClick={() => onNavigate(field.id)}
            className={cn(
                "pl-4 cursor-pointer truncate transition-all py-1 text-gray-500 hover:text-gray-900",
                activeId === field.id 
                    ? "font-bold text-sm text-gray-900 bg-gray-100 border-r-2 border-gray-400" // Highlight style
                    : "font-medium text-xs"
            )}
        >
            <span className="truncate">{field.label || "Untitled Section"}</span>
        </div>
      ))}
    </div>
  );
};

export default TreeNavigation;

