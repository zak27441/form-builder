import React, { useState, useEffect } from 'react';
import TreeNavigation from './TreeNavigation';
import { cn } from '../utils/cn';
import { ChevronDown, MapPin, Plus, Trash2 } from 'lucide-react';

const checkVisibility = (field, formValues, subMode) => {
        if (subMode === 'DIP' && field.fma) return false;
        if (!field.conditional) return true;
        
        const triggerId = field.conditional.triggerId;
        let valuesToCheck = [];

        if (formValues[triggerId] !== undefined) {
            valuesToCheck.push(formValues[triggerId]);
        } else {
            const pattern = new RegExp(`^${triggerId}_\\d+$`);
            const instanceValues = Object.keys(formValues)
                 .filter(k => pattern.test(k))
                 .map(k => formValues[k]);
            if (instanceValues.length > 0) valuesToCheck = instanceValues;
        }

        if (valuesToCheck.length === 0 || valuesToCheck.every(v => v === "" || v === undefined || (Array.isArray(v) && v.length === 0))) return false;

        const { logicType, value1, value2, selectedOptions } = field.conditional;
        
        return valuesToCheck.some(triggerVal => {
            if (triggerVal === undefined || triggerVal === "") return false;

            if (['greater_than', 'less_than', 'between', 'outside_range'].includes(logicType)) {
                const num = parseFloat(triggerVal);
                if (isNaN(num)) return false;
                const v1 = parseFloat(value1);
                const v2 = parseFloat(value2);
                if (logicType === 'greater_than') return num > v1;
                if (logicType === 'less_than') return num < v1;
                if (logicType === 'between') return num >= v1 && num <= v2;
                if (logicType === 'outside_range') return num < v1 || num > v2;
            }

            if (selectedOptions && selectedOptions.length > 0) {
                if (Array.isArray(triggerVal)) return triggerVal.some(v => selectedOptions.includes(v));
                return selectedOptions.includes(triggerVal);
            }
            return true;
        });
};

const PreviewInput = ({ field, value, onChange, onCheckboxChange, subMode, formValues }) => {
    const type = field.type.toLowerCase();
    
    const [rowIds, setRowIds] = useState([0]);

    if (type === 'repeater') {
        const handleAddRow = () => {
            const nextId = rowIds.length > 0 ? Math.max(...rowIds) + 1 : 0;
            setRowIds([...rowIds, nextId]);
        };
        const handleRemoveRow = (id) => {
            setRowIds(rowIds.filter(i => i !== id));
        };

        return (
            <div className="flex flex-col gap-2 mt-1">
                {rowIds.map((rowId) => (
                    <div key={rowId} className="flex flex-col gap-1 p-2 border border-gray-600 rounded-lg bg-white relative group/repeater">
                         {rowIds.length > 1 && (
                            <button 
                                onClick={() => handleRemoveRow(rowId)}
                                className="absolute right-2 top-2 text-gray-400 hover:text-red-500 opacity-0 group-hover/repeater:opacity-100 transition-opacity z-10"
                            >
                                <Trash2 size={14} />
                            </button>
                         )}
                         {(field.children || []).map(child => {
                             const instanceId = `${child.id}_${rowId}`;
                             let updatedConditional = child.conditional;
                             if (child.conditional) {
                                 const isSibling = field.children.some(c => c.id == child.conditional.triggerId);
                                 if (isSibling) {
                                     updatedConditional = { ...child.conditional, triggerId: `${child.conditional.triggerId}_${rowId}` };
                                 }
                             }
                             const instanceField = { ...child, id: instanceId, conditional: updatedConditional };
                             
                             return (
                                 <PreviewFieldItem 
                                    key={instanceId}
                                    field={instanceField}
                                    formValues={formValues}
                                    onChange={onChange}
                                    onCheckboxChange={onCheckboxChange}
                                    subMode={subMode}
                                 />
                             );
                         })}
                    </div>
                ))}
                <button 
                    onClick={handleAddRow}
                    className="self-start flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 text-white rounded-full text-xs font-medium shadow-sm hover:bg-gray-700 transition-colors"
                >
                    <Plus size={12} />
                    {field.repeaterButtonLabel || "+ Add"}
                </button>
            </div>
        );
    }

    // Standard Inputs
    switch (type) {
        case 'text field':
        case 'currency':
        case 'sort code':
        case 'account number':
        case 'phone number':
            return (
                <div className="relative w-full">
                    {type === 'currency' && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600 font-medium text-xs">£</span>}
                    {type === 'phone number' && (
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <div className="w-4 h-3 bg-blue-900 relative overflow-hidden border border-gray-200 flex items-center justify-center">
                                <div className="absolute w-full h-[1px] bg-white transform rotate-12" />
                                <div className="absolute w-full h-[1px] bg-white transform -rotate-12" />
                                <div className="absolute w-full h-1 bg-white" />
                                <div className="absolute h-full w-1 bg-white" />
                                <div className="absolute w-full h-0.5 bg-red-600" />
                                <div className="absolute h-full w-0.5 bg-red-600" />
                            </div>
                            <span className="text-[10px] text-gray-600 font-medium">+44</span>
                        </div>
                    )}
                    <input
                        type="text"
                        value={value || ""}
                        onChange={(e) => {
                            if (field.numbersOnly && !/^\d*$/.test(e.target.value)) return;
                            onChange(field.id, e.target.value);
                        }}
                        placeholder={type === 'sort code' ? "-_ _ -_ _ -_ _" : type === 'account number' ? "-_ _ _ _ _ _ _ _" : ""}
                        className={cn(
                            "w-full border border-gray-600 rounded px-2 py-1 text-xs h-7 focus:outline-none focus:border-black",
                            type === 'currency' ? "pl-6 w-[48%]" : 
                            (type === 'dropdown' || type === 'calendar' || type === 'sort code' || type.includes('number') ? "w-[48%]" : "w-[48%]"),
                            type === 'phone number' && "pl-12"
                        )}
                        style={{ width: ['text field', 'address group'].includes(type) ? (type === 'address group' ? '100%' : '48%') : '48%' }}
                    />
                </div>
            );
        case 'text area':
            return <textarea value={value || ""} onChange={(e) => onChange(field.id, e.target.value)} className="w-full border border-gray-600 rounded px-2 py-1 text-xs h-20 focus:outline-none focus:border-black resize-none" />;
        case 'dropdown':
            return (
                <div className="relative w-[48%]">
                    <select value={value || ""} onChange={(e) => onChange(field.id, e.target.value)} multiple={field.multiselect} className={cn("w-full border border-gray-600 rounded px-2 py-1 text-xs h-7 focus:outline-none focus:border-black appearance-none bg-white", field.multiselect && "h-24")}>
                        <option value="" disabled>Select...</option>
                        {(field.options || []).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                    </select>
                    {!field.multiselect && <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />}
                </div>
            );
        case 'radio buttons':
        case 'checkbox':
            return (
                <div className="flex flex-col gap-2 mt-1">
                    {(field.options || ["Option 1"]).map((opt, i) => {
                        const isChecked = Array.isArray(value) ? value.includes(opt) : value === opt;
                        const isRadio = type === 'radio buttons';
                        return (
                            <label key={i} className="flex items-center gap-2 cursor-pointer select-none group">
                                <input type="checkbox" className="hidden" checked={isChecked} onChange={() => { if (type === 'radio buttons' && !field.multiselect) onChange(field.id, opt); else onCheckboxChange(field.id, opt, field.multiselect); }} />
                                <div className={cn("w-3.5 h-3.5 flex items-center justify-center border transition-all", isRadio ? "rounded-full" : "rounded-[2px]", isChecked ? (isRadio ? "bg-white border-[#3d3d3d]" : "bg-[#3d3d3d] border-[#3d3d3d]") : "border-[#808080] bg-white group-hover:bg-gray-50")}>
                                    {isChecked && (isRadio ? <div className="w-2 h-2 bg-[#3d3d3d] rounded-full" /> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-2 h-2 text-white"><polyline points="20 6 9 17 4 12" /></svg>)}
                                </div>
                                <span className="text-xs text-gray-600">{opt}</span>
                            </label>
                        );
                    })}
                </div>
            );
        case 'calendar': return <div className="relative w-[48%]"><input type="date" value={value || ""} onChange={(e) => onChange(field.id, e.target.value)} className="w-full border border-gray-600 rounded px-2 py-1 text-xs h-7 focus:outline-none focus:border-black" /></div>;
        case 'address group': return <div className="relative w-full"><input type="text" value={value || ""} onChange={(e) => onChange(field.id, e.target.value)} className="w-full border border-gray-600 rounded px-2 py-1 text-xs h-7 focus:outline-none focus:border-black pr-8" /><MapPin size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" /></div>;
        case 'heading': return null;
        case 'fixed text': return null;
        default: return <div className="text-red-500 text-xs">Unknown type</div>;
    }
};

const PreviewFieldItem = ({ field, formValues, onChange, onCheckboxChange, subMode }) => {
    const isHeading = field.type.toLowerCase() === 'heading';
    const visible = checkVisibility(field, formValues, subMode);
    const hasCondition = !!field.conditional;
    if (!hasCondition && !visible) return null;

    return (
        <div 
            id={`preview-field-${field.id}`}
            className={cn(
                "bg-white mb-1 px-3 py-1", 
                isHeading && "pt-4",
                hasCondition && cn("transition-all duration-500 ease-in-out overflow-hidden", visible ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0 mb-0")
            )}
        >
             <div className="flex flex-col gap-0.5 w-full">
                 <div className={cn(
                    "text-[11px] font-medium text-gray-600 min-h-[1.2em]",
                    (field.type === 'fixed text' && field.bold) && "text-[10px] font-bold text-black",
                    isHeading && "text-lg font-bold border-b-2 border-gray-300 pb-1 mb-1 text-gray-600",
                    field.mandatory && "after:content-['*'] after:ml-0.5 after:text-red-500"
                 )}>
                     {field.label}
                 </div>
                 
                 <PreviewInput 
                    field={field} 
                    value={formValues[field.id]} 
                    onChange={onChange} 
                    onCheckboxChange={onCheckboxChange}
                    subMode={subMode}
                    formValues={formValues} 
                 />
                 
                 {field.tiptext && (
                    <div className="text-[10px] font-bold text-black w-full mt-1">
                        {field.tiptext}
                    </div>
                )}
            </div>
        </div>
    );
};

const FormPreview = ({ fields, subMode }) => {
  const [formValues, setFormValues] = useState({});
  const [activeHeadingId, setActiveHeadingId] = useState(null);

  useEffect(() => {
      const initial = {};
      const traverse = (list) => {
          list.forEach(f => {
              if (f.type === 'checkbox' || f.multiselect) initial[f.id] = [];
              else initial[f.id] = "";
              if (f.children) traverse(f.children); 
          });
      };
      traverse(fields);
      setFormValues(initial);
  }, [fields]);

  const handleValueChange = (id, val) => setFormValues(prev => ({ ...prev, [id]: val }));
  
  const handleCheckboxChange = (id, opt, isMulti) => {
      setFormValues(prev => {
          const current = prev[id] || [];
          const safeCurrent = Array.isArray(current) ? current : [];
          if (isMulti) {
              return { ...prev, [id]: safeCurrent.includes(opt) ? safeCurrent.filter(o => o !== opt) : [...safeCurrent, opt] };
          } else {
              return { ...prev, [id]: safeCurrent.includes(opt) ? [] : [opt] };
          }
      });
  };

  const handleScroll = (e) => {
      const container = e.target;
      const containerRect = container.getBoundingClientRect();
      const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
      
      const collectVisibleHeadings = (list) => {
          let res = [];
          list.forEach(f => {
              if (!checkVisibility(f, formValues, subMode)) return;
              if (f.type.toLowerCase() === 'heading') res.push(f);
              if (f.children) res = res.concat(collectVisibleHeadings(f.children));
          });
          return res;
      };
      const headingFields = collectVisibleHeadings(fields);

      if (isAtBottom && headingFields.length > 0) {
          const lastHeading = headingFields[headingFields.length - 1];
          if (lastHeading.id !== activeHeadingId) setActiveHeadingId(lastHeading.id);
          return; 
      }
      
      let currentActive = null;
      for (const heading of headingFields) {
          const el = document.getElementById(`preview-field-${heading.id}`);
          if (el) {
              const rect = el.getBoundingClientRect();
              if (rect.top < containerRect.top + 150) {
                  currentActive = heading.id;
              } else {
                  break; 
              }
          } else {
             // Try finding first instance for repeater children
             const firstInstance = document.querySelector(`[id^="preview-field-${heading.id}_"]`);
             if (firstInstance) {
                  const rect = firstInstance.getBoundingClientRect();
                  if (rect.top < containerRect.top + 150) {
                      currentActive = heading.id;
                  } else {
                      break;
                  }
             }
          }
      }
      if (currentActive && currentActive !== activeHeadingId) setActiveHeadingId(currentActive);
  };

  return (
    <div className="flex-1 shadow-2xl flex overflow-hidden relative rounded-xl h-[calc(100vh-140px)] bg-white">
       <div className="w-[200px] border-r border-gray-100 bg-[#e6e6e6] flex-shrink-0">
          <TreeNavigation 
            fields={fields} 
            onNavigate={(id) => {
                const el = document.getElementById(`preview-field-${id}`) || document.querySelector(`[id^="preview-field-${id}_"]`);
                if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
            }} 
            activeId={activeHeadingId} 
            isVisible={(f) => checkVisibility(f, formValues, subMode)}
          />
       </div>

       <div 
          className="flex-1 p-4 overflow-y-auto custom-scrollbar relative scroll-smooth"
          onScroll={handleScroll}
       >
          {fields.map(field => (
              <PreviewFieldItem 
                key={field.id}
                field={field}
                formValues={formValues}
                onChange={handleValueChange}
                onCheckboxChange={handleCheckboxChange}
                subMode={subMode}
              />
          ))}
       </div>
    </div>
  );
};

export default FormPreview;
