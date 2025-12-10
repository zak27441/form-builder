import React from 'react';
import { cn } from '../utils/cn'; 

const TreeNavigation = ({ fields = [], onNavigate, activeId, isVisible }) => {
  const collectHeadings = (list, depth = 0) => {
      let result = [];
      list.forEach(f => {
          if (isVisible && !isVisible(f)) return;

          if (f.type.toLowerCase() === 'heading') {
              result.push({ ...f, depth });
          }
          if (f.children && f.children.length > 0) {
              result = result.concat(collectHeadings(f.children, depth + 1));
          }
      });
      return result;
  };

  const headings = collectHeadings(fields);

  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar py-2 flex flex-col gap-0.5">
      {headings.length === 0 && (
        <div className="pl-4 text-gray-400 text-xs italic pt-2">No headings</div>
      )}
      
      {headings.map((field) => (
        <div 
            key={field.id}
            onClick={() => onNavigate(field.id)}
            className={cn(
                "cursor-pointer truncate transition-all py-0.5 pr-3 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-r-md mr-2",
                activeId === field.id 
                    ? "font-extrabold text-sm text-slate-900" 
                    : "font-medium text-xs"
            )}
            style={{ paddingLeft: `${16 + (field.depth * 12)}px` }}
        >
            <span className="truncate">{field.label || "Untitled Section"}</span>
        </div>
      ))}
    </div>
  );
};

export default TreeNavigation;

