import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../utils/cn';

const SpreadsheetView = ({ fields }) => {
  // Added vertical borders via border-r on cells
  // Darker row separators via divide-gray-200
  const columns = [
    { key: 'label', label: 'Question Label', width: 'min-w-[250px]' },
    { key: 'id', label: 'Field ID', width: 'min-w-[80px]' },
    { key: 'type', label: 'Type', width: 'min-w-[150px]' },
    { key: 'mandatory', label: 'Mandatory', width: 'min-w-[100px] text-center' },
    { key: 'fma', label: 'FMA only', width: 'min-w-[80px] text-center' },
    { key: 'options', label: 'Options', width: 'min-w-[200px]' },
    { key: 'logic', label: 'Conditional Logic', width: 'min-w-[250px]' },
    { key: 'validation', label: 'Validation', width: 'min-w-[120px]' },
    { key: 'tiptext', label: 'Tip Text', width: 'min-w-[200px]' }, // Moved last
  ];

  const getTypeColor = (type) => {
      switch (type.toLowerCase()) {
          case 'text field': return "bg-blue-100 text-blue-800 border-blue-200";
          case 'currency': return "bg-green-100 text-green-800 border-green-200";
          case 'text area': return "bg-indigo-100 text-indigo-800 border-indigo-200";
          case 'dropdown': return "bg-purple-100 text-purple-800 border-purple-200";
          case 'radio buttons': return "bg-pink-100 text-pink-800 border-pink-200";
          case 'checkbox': return "bg-rose-100 text-rose-800 border-rose-200";
          case 'heading': return "bg-gray-200 text-gray-800 border-gray-300";
          case 'fixed text': return "bg-slate-100 text-slate-800 border-slate-200";
          case 'calendar': return "bg-orange-100 text-orange-800 border-orange-200";
          case 'address group': return "bg-teal-100 text-teal-800 border-teal-200";
          case 'repeater': return "bg-cyan-100 text-cyan-800 border-cyan-200";
          case 'sort code': return "bg-lime-100 text-lime-800 border-lime-200";
          case 'account number': return "bg-emerald-100 text-emerald-800 border-emerald-200";
          case 'phone number': return "bg-sky-100 text-sky-800 border-sky-200";
          default: return "bg-gray-100 text-gray-600 border-gray-200";
      }
  };

  const getStatusChip = (status) => (
      <span className={cn(
          "px-2 py-0.5 rounded-full text-[9px] font-bold border shadow-sm",
          status ? "bg-green-100 text-green-700 border-green-200" : "bg-red-50 text-red-600 border-red-100"
      )}>
          {status ? "YES" : "NO"}
      </span>
  );

  const getLogicString = (c) => {
      if (!c) return "-";
      const id = `ID:${c.triggerId}`;
      
      if (c.selectedOptions && c.selectedOptions.length > 0) {
          return `${id} = "${c.selectedOptions.join('" OR "')}"`;
      }
      
      const v1 = c.value1;
      const v2 = c.value2;

      switch (c.logicType) {
          case 'greater_than': return `${id} > ${v1}`;
          case 'less_than': return `${id} < ${v1}`;
          case 'between': return `${v1} < ${id} < ${v2}`;
          case 'outside_range': return `${id} < ${v1} OR ${id} > ${v2}`;
          case 'x_years_ago': return `${id} was ${v1} years ago`;
          case 'before_date': return `${id} < ${v1}`;
          case 'after_date': return `${id} > ${v1}`;
          default: return `${id} ${c.logicType?.replace(/_/g, ' ')} ${v1}`;
      }
  };

  return (
    <div className="flex-1 bg-white shadow-2xl flex flex-col overflow-hidden rounded-xl h-[calc(100vh-140px)] border border-gray-200 animate-in fade-in duration-300">
      {/* Top Bar */}
      <div className="bg-gray-50 px-6 py-2 border-b border-gray-200 flex justify-between items-center shrink-0">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Form Specs</h2>
          <div className="text-xs text-gray-400 font-mono">{fields.length} Fields</div>
      </div>
      
      <div className="overflow-auto flex-1 custom-scrollbar relative">
        <table className="min-w-full text-left border-collapse">
          <thead className="bg-white sticky top-0 z-20 shadow-sm">
            <tr>
              {columns.map((col, i) => (
                <th 
                    key={col.key} 
                    className={cn(
                        "px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-r border-gray-200 whitespace-nowrap bg-gray-50/95 backdrop-blur-sm last:border-r-0 h-[36px]", 
                        col.width,
                        i === 0 && "sticky left-0 z-30 border-r-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                    )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {fields.map((field, index) => {
                const hasOptions = ['dropdown', 'radio buttons', 'checkbox'].includes(field.type.toLowerCase());
                const triggerExists = field.conditional ? fields.some(f => f.id === field.conditional.triggerId) : true;
                const isBroken = field.conditional && !triggerExists;
                const isHeading = field.type.toLowerCase() === 'heading';

                const stickyClass = isHeading 
                    ? "sticky top-[36px] z-10 bg-gray-200 border-b border-gray-300 shadow-sm" 
                    : "";

                return (
                  <tr key={field.id} className={cn("transition-colors group", !isHeading && "hover:bg-blue-50/30")}>
                    <td className={cn(
                        "px-4 py-1 border-r border-gray-200",
                        stickyClass,
                        !isHeading && "sticky left-0 z-10 bg-white border-r-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]",
                        isHeading && "sticky left-0 z-30 border-r-2 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                    )}>
                        <div className={cn("text-xs font-medium line-clamp-2", isHeading ? "text-gray-900 font-bold tracking-wide" : "text-gray-800")} title={field.label}>
                            {field.label}
                        </div>
                    </td>
                    <td className={cn("px-4 py-1 text-[10px] text-gray-500 font-mono border-r border-gray-200", stickyClass)}>
                        {field.id}
                    </td>
                    <td className={cn("px-4 py-1 border-r border-gray-200", stickyClass)}>
                        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold border capitalize whitespace-nowrap shadow-sm", getTypeColor(field.type))}>
                            {field.type}
                        </span>
                    </td>
                    <td className={cn("px-4 py-1 text-center border-r border-gray-200", stickyClass)}>
                        {field.type === 'heading' || field.type === 'fixed text' ? <span className="text-gray-300">-</span> : getStatusChip(field.mandatory)}
                    </td>
                    <td className={cn("px-4 py-1 text-center border-r border-gray-200", stickyClass)}>
                        {field.type === 'heading' || field.type === 'fixed text' ? <span className="text-gray-300">-</span> : getStatusChip(field.fma)}
                    </td>
                    <td className={cn("px-4 py-1 text-xs text-gray-500 border-r border-gray-200", stickyClass)}>
                        {hasOptions && field.options ? (
                            <div className="flex flex-wrap gap-1">
                                {field.options.slice(0, 5).map((opt, i) => (
                                    <span key={i} className="bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded text-[9px] truncate max-w-[150px]">
                                        {opt}
                                    </span>
                                ))}
                                {field.options.length > 5 && (
                                    <span className="text-[9px] text-gray-400 self-center">+{field.options.length - 5}</span>
                                )}
                            </div>
                        ) : (
                            <span className="text-gray-300">-</span>
                        )}
                    </td>
                    <td className={cn("px-4 py-1 border-r border-gray-200", stickyClass)}>
                        {field.conditional ? (
                            isBroken ? (
                                <div className="flex items-start gap-1.5 text-red-700 font-medium bg-red-50 p-1.5 rounded border border-red-100 w-full max-w-[300px]">
                                    <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-bold uppercase">Broken Logic</span>
                                        <span className="text-[9px] leading-tight opacity-90">
                                            Depends on missing field (ID:{field.conditional.triggerId}). Update or delete logic.
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="font-mono text-[10px] text-gray-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 w-fit">
                                    {getLogicString(field.conditional)}
                                </div>
                            )
                        ) : (
                            <span className="text-gray-300 text-xs">-</span>
                        )}
                    </td>
                    <td className={cn("px-4 py-1 text-xs text-gray-500 border-r border-gray-200", stickyClass)}>
                        <div className="flex flex-wrap gap-1">
                            {field.numbersOnly && <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">Numbers Only</span>}
                            {field.multiselect && <span className="text-[9px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded border border-purple-100">Multi-select</span>}
                            {field.maxEntries > 0 && <span className="text-[9px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded border border-orange-100">Max Entries: {field.maxEntries}</span>}
                            {field.allowInternational && <span className="text-[9px] bg-teal-50 text-teal-600 px-1.5 py-0.5 rounded border border-teal-100">International Allowed</span>}
                            {field.bold && <span className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 font-bold">Bold Text</span>}
                            {!field.numbersOnly && !field.multiselect && !field.maxEntries && !field.allowInternational && !field.bold && <span className="text-gray-300">-</span>}
                        </div>
                    </td>
                    <td className={cn("px-4 py-1 text-xs text-gray-500", stickyClass)}>
                        {field.tiptext || <span className="text-gray-300">-</span>}
                    </td>
                  </tr>
                );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SpreadsheetView;
