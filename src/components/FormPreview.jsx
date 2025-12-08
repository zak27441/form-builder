import React, { useState, useEffect } from 'react';
import TreeNavigation from './TreeNavigation';
import { cn } from '../utils/cn';
import { ChevronDown, MapPin } from 'lucide-react'; // Removed Calendar icon import
// Removed useAutoAnimate import

const PreviewField = ({ field, value, onChange, onCheckboxChange }) => {
    const type = field.type.toLowerCase();
    const isHeading = type === 'heading';
    
    const renderInput = () => {
        switch (type) {
            case 'text field':
            case 'currency':
            case 'sort code':
            case 'account number':
            case 'phone number':
                return (
                    <div className="relative w-full">
                        {type === 'currency' && (
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600 font-medium text-xs">£</span>
                        )}
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
                                const val = e.target.value;
                                if (field.numbersOnly && !/^\d*$/.test(val)) return;
                                onChange(field.id, val);
                            }}
                            placeholder={
                                type === 'sort code' ? "-_ _ -_ _ -_ _" : 
                                type === 'account number' ? "-_ _ _ _ _ _ _ _" : ""
                            }
                            className={cn(
                                "w-full border border-gray-600 rounded px-2 py-1 text-xs h-7 focus:outline-none focus:border-black",
                                type === 'currency' ? "pl-6 w-[48%]" : 
                                (type === 'dropdown' || type === 'calendar' || type.includes('number') || type === 'sort code' ? "w-[48%]" : "w-[48%]"),
                                type === 'phone number' && "pl-12"
                            )}
                            style={{ width: ['text field', 'address group'].includes(type) ? (type === 'address group' ? '100%' : '48%') : '48%' }}
                        />
                    </div>
                );

            case 'text area':
                return (
                    <textarea
                        value={value || ""}
                        onChange={(e) => onChange(field.id, e.target.value)}
                        className="w-full border border-gray-600 rounded px-2 py-1 text-xs h-20 focus:outline-none focus:border-black resize-none"
                    />
                );

            case 'dropdown':
                return (
                    <div className="relative w-[48%]">
                         <select
                            value={value || ""}
                            onChange={(e) => onChange(field.id, e.target.value)}
                            multiple={field.multiselect}
                            className={cn(
                                "w-full border border-gray-600 rounded px-2 py-1 text-xs h-7 focus:outline-none focus:border-black appearance-none bg-white",
                                field.multiselect && "h-24"
                            )}
                         >
                            <option value="" disabled>Select...</option>
                            {(field.options || []).map((opt, i) => (
                                <option key={i} value={opt}>{opt}</option>
                            ))}
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
                            const isRadio = type === 'radio buttons'; // Always use radio style for radio type
                            
                            return (
                                <label key={i} className="flex items-center gap-2 cursor-pointer select-none group">
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={isChecked}
                                        onChange={() => {
                                            if (type === 'radio buttons' && !field.multiselect) {
                                                onChange(field.id, opt);
                                            } else {
                                                onCheckboxChange(field.id, opt, field.multiselect);
                                            }
                                        }}
                                    />
                                    <div className={cn(
                                        "w-3.5 h-3.5 flex items-center justify-center border transition-all",
                                        isRadio ? "rounded-full" : "rounded-[2px]",
                                        isChecked 
                                            ? (isRadio ? "bg-white border-[#3d3d3d]" : "bg-[#3d3d3d] border-[#3d3d3d]") 
                                            : "border-[#808080] bg-white group-hover:bg-gray-50"
                                    )}>
                                        {isChecked && (
                                            isRadio ? (
                                                <div className="w-2 h-2 bg-[#3d3d3d] rounded-full" /> // Dark dot, slightly bigger (2px -> 2x4 = 8px? No, w-2 is 0.5rem = 8px. Outer is w-3.5=14px. 8px is ok.)
                                            ) : (
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="w-2 h-2 text-white">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            )
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-600">{opt}</span>
                                </label>
                            );
                        })}
                    </div>
                );
            
            case 'calendar':
                 return (
                     <div className="relative w-[48%]">
                         <input 
                            type="date"
                            value={value || ""}
                            onChange={(e) => onChange(field.id, e.target.value)}
                            className="w-full border border-gray-600 rounded px-2 py-1 text-xs h-7 focus:outline-none focus:border-black"
                         />
                         {/* Removed custom Calendar icon to fix duplication */}
                     </div>
                 );
            
            case 'address group':
                return (
                     <div className="relative w-full">
                         <input 
                            type="text"
                            value={value || ""}
                            onChange={(e) => onChange(field.id, e.target.value)}
                            className="w-full border border-gray-600 rounded px-2 py-1 text-xs h-7 focus:outline-none focus:border-black pr-8"
                         />
                         <MapPin size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                     </div>
                );
                
            case 'heading': return null;
            case 'fixed text': return null;
            
            default: return <div className="text-red-500 text-xs">Unknown type</div>;
        }
    };

    return (
        <div className={cn(
            "px-3 py-1 bg-white mb-1",
            isHeading && "pt-4"
        )}>
            <div className="flex flex-col gap-0.5 w-full">
                 <div className={cn(
                    "text-[11px] font-medium text-gray-600 min-h-[1.2em]",
                    (type === 'fixed text' && field.bold) && "text-[10px] font-bold text-black",
                    isHeading && "text-lg font-bold border-b-2 border-gray-300 pb-1 mb-1 text-gray-600",
                    field.mandatory && "after:content-['*'] after:ml-0.5 after:text-red-500"
                 )}>
                     {field.label}
                 </div>
                 
                 {renderInput()}
                 
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
  // No useAutoAnimate
  
  useEffect(() => {
      const initial = {};
      fields.forEach(f => {
          const type = f.type.toLowerCase();
          if (type === 'checkbox' || (f.multiselect)) {
              initial[f.id] = [];
          } else {
              initial[f.id] = "";
          }
      });
      setFormValues(initial);
  }, [fields]);

  const handleValueChange = (id, val) => {
      setFormValues(prev => ({ ...prev, [id]: val }));
  };

  const handleCheckboxChange = (id, opt, isMulti) => {
      setFormValues(prev => {
          const current = prev[id] || [];
          const safeCurrent = Array.isArray(current) ? current : [];
          
          if (isMulti) {
              if (safeCurrent.includes(opt)) return { ...prev, [id]: safeCurrent.filter(o => o !== opt) };
              return { ...prev, [id]: [...safeCurrent, opt] };
          } else {
              if (safeCurrent.includes(opt)) return { ...prev, [id]: [] }; 
              return { ...prev, [id]: [opt] }; 
          }
      });
  };

  const isVisible = (field) => {
      // Check DIP/FMA logic
      if (subMode === 'DIP' && field.fma) return false;

      if (!field.conditional) return true;
      
      // Check if trigger exists (Orphan check)
      const triggerField = fields.find(f => f.id === field.conditional.triggerId);
      if (!triggerField) return false; // Hide if trigger is deleted

      const { triggerId, logicType, value1, value2, selectedOptions } = field.conditional;
      const triggerVal = formValues[triggerId];
      
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
          if (Array.isArray(triggerVal)) {
             return triggerVal.some(v => selectedOptions.includes(v));
          }
          return selectedOptions.includes(triggerVal);
      }
      
      return true;
  };

  return (
    <div className="flex-1 shadow-2xl flex overflow-hidden relative rounded-xl h-[calc(100vh-140px)] bg-white">
       <div className="w-[200px] border-r border-gray-100 bg-[#e6e6e6] flex-shrink-0">
          <TreeNavigation 
            fields={fields} 
            onNavigate={(id) => {
                const el = document.getElementById(`preview-field-${id}`);
                if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
            }} 
            activeId={null} 
          />
       </div>

       <div className="flex-1 p-4 overflow-y-auto custom-scrollbar relative scroll-smooth">
          {fields.map(field => {
              const visible = isVisible(field);
              const hasCondition = !!field.conditional;
              
              // If field has no condition, logic is simpler but we still need to respect visibility (DIP/FMA)
              // If DIP/FMA hides it, visible is false.
              // If hasCondition is false, visible is true (unless DIP hidden).
              
              // If hidden by DIP mode (visible=false) and NO condition, it should just disappear instantly/not render?
              // Or should it animate? "only show ... where FMA only option is NOT true".
              // Usually mode switches are instant or re-renders.
              // Conditional triggers are animated.
              
              // If visible is false (due to DIP or condition not met):
              // If !hasCondition, but visible is false (DIP hidden), return null (don't render).
              if (!hasCondition && !visible) return null; 

              if (!hasCondition && visible) {
                  return (
                      <div key={field.id} id={`preview-field-${field.id}`}>
                          <PreviewField 
                            field={field} 
                            value={formValues[field.id]}
                            onChange={handleValueChange}
                            onCheckboxChange={handleCheckboxChange}
                          />
                      </div>
                  );
              }
              
              // Conditional Logic Wrapper (triggered fields)
              return (
                  <div 
                    key={field.id} 
                    id={`preview-field-${field.id}`}
                    className={cn(
                        "transition-all duration-500 ease-in-out overflow-hidden",
                        visible ? "max-h-[500px] opacity-100 mb-4" : "max-h-0 opacity-0 mb-0"
                    )}
                  >
                      <PreviewField 
                        field={field} 
                        value={formValues[field.id]}
                        onChange={handleValueChange}
                        onCheckboxChange={handleCheckboxChange}
                      />
                  </div>
              );
          })}
       </div>
    </div>
  );
};

export default FormPreview;
