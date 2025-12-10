import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import { Menu, Settings, ChevronDown, Calendar, MapPin, X, AlertTriangle, Info, Trash2, AlertCircle, Plus, Check, Filter } from 'lucide-react'; // Added Filter
import { useAutoAnimate } from '@formkit/auto-animate/react';
import ContextMenu from './ContextMenu';
import AdminContextMenu from './AdminContextMenu'; // NEW IMPORT
import TreeNavigation from './TreeNavigation';
import { cn } from '../utils/cn';
import { db } from '../firebase'; // Added db
import { collection, onSnapshot } from 'firebase/firestore'; // Added imports

const FIELD_TYPES = [
  "Text field", "Currency", "Text area", 
  "Dropdown", "Radio buttons", "Checkbox", "Heading", 
  "Fixed text", "Calendar", "Address group", "Repeater", 
  "Sort code", "Account number", "Phone number"
];

// Helper to determine if a field can be a trigger
const isValidTrigger = (field) => {
    const type = field.type.toLowerCase();
    if (['currency', 'dropdown', 'radio buttons', 'checkbox', 'calendar'].includes(type)) return true;
    if (type === 'text field' && field.numbersOnly) return true;
    return false;
};

const ConditionalLogicModal = ({ triggerField, currentCondition, onClose, onSave }) => {
    const [logicType, setLogicType] = useState('');
    const [value1, setValue1] = useState('');
    const [value2, setValue2] = useState('');
    const [selectedOptions, setSelectedOptions] = useState([]);
    const [showOverrideConfirm, setShowOverrideConfirm] = useState(false);

    const type = triggerField.type.toLowerCase();
    const isNumber = type === 'currency' || (type === 'text field' && triggerField.numbersOnly);
    const isChoice = ['dropdown', 'radio buttons', 'checkbox'].includes(type);
    const isCalendar = type === 'calendar';

    useEffect(() => {
        // Populate if editing existing condition for SAME trigger
        if (currentCondition && currentCondition.triggerId === triggerField.id) {
            setLogicType(currentCondition.logicType || '');
            setValue1(currentCondition.value1 || '');
            setValue2(currentCondition.value2 || '');
            setSelectedOptions(currentCondition.selectedOptions || []);
        } else {
            // Defaults
            if (isNumber) setLogicType('greater_than');
            if (isCalendar) setLogicType('x_years_ago');
        }
    }, [triggerField, currentCondition, isNumber, isCalendar]);

    const handleSaveClick = () => {
        if (currentCondition) {
            setShowOverrideConfirm(true);
        } else {
            confirmSave();
        }
    };

    const confirmSave = () => {
        const condition = {
            triggerId: triggerField.id,
            type: type,
            logicType,
            value1,
            value2,
            selectedOptions
        };
        onSave(condition);
    };

    const handleOptionToggle = (opt) => {
        if (selectedOptions.includes(opt)) {
            setSelectedOptions(selectedOptions.filter(o => o !== opt));
        } else {
            setSelectedOptions([...selectedOptions, opt]);
        }
    };

    if (showOverrideConfirm) {
        return createPortal(
            <div className="fixed inset-0 z-[10001] flex items-center justify-center">
                <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowOverrideConfirm(false)} />
                <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-80 p-6 animate-in zoom-in-95 duration-200 relative z-10">
                    <h3 className="font-bold text-gray-900 mb-2">Override existing condition?</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        This field already has a condition set. Saving this will replace the existing logic.
                    </p>
                    <div className="flex justify-end gap-2">
                        <button 
                            onClick={() => setShowOverrideConfirm(false)}
                            className="px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmSave}
                            className="px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm"
                        >
                            Confirm & Save
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    return createPortal(
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-[400px] overflow-hidden animate-in zoom-in-95 duration-200 relative z-10 flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
                    <div className="flex flex-col gap-0.5">
                        <h3 className="font-bold text-base text-gray-900">Configure Logic</h3>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <span>Trigger:</span>
                            <span className="font-medium text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 max-w-[200px] truncate">
                                {triggerField.label}
                            </span>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={18}/>
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 overflow-y-auto custom-scrollbar">
                    {currentCondition && currentCondition.triggerId !== triggerField.id && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2 text-xs text-amber-800">
                            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                            <span>Warning: This will replace the existing condition.</span>
                        </div>
                    )}

                    {/* Number Logic */}
                    {isNumber && (
                        <div className="flex flex-col gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-700">Condition Rule</label>
                                <div className="relative">
                                    <select 
                                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
                                        value={logicType}
                                        onChange={(e) => setLogicType(e.target.value)}
                                    >
                                        <option value="greater_than">Greater than</option>
                                        <option value="less_than">Less than</option>
                                        <option value="between">Between</option>
                                        <option value="outside_range">Outside of range</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                                </div>
                            </div>
                            
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-700">Value</label>
                                <input 
                                    type="number" 
                                    placeholder="Enter value..."
                                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
                                    value={value1}
                                    onChange={(e) => setValue1(e.target.value)}
                                />
                            </div>

                            {(logicType === 'between' || logicType === 'outside_range') && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-700">Second Value</label>
                                    <input 
                                        type="number" 
                                        placeholder="Enter second value..."
                                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
                                        value={value2}
                                        onChange={(e) => setValue2(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Choice Logic */}
                    {isChoice && (
                        <div className="flex flex-col gap-3">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-semibold text-gray-700">Select Trigger Option(s)</label>
                                <span className="text-[10px] text-gray-400">Select multiple if needed</span>
                            </div>
                            
                            <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100 max-h-[240px] overflow-y-auto custom-scrollbar bg-white">
                                {(triggerField.options || []).map((opt, idx) => {
                                    const isChecked = selectedOptions.includes(opt);
                                    return (
                                        <label 
                                            key={idx} 
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors text-sm group select-none",
                                                isChecked ? "bg-blue-50/50" : "hover:bg-gray-50"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-4 h-4 rounded border flex items-center justify-center transition-all flex-shrink-0",
                                                isChecked ? "bg-blue-600 border-blue-600" : "border-gray-300 bg-white group-hover:border-blue-400"
                                            )}>
                                                <input 
                                                    type="checkbox" 
                                                    className="hidden"
                                                    checked={isChecked}
                                                    onChange={() => handleOptionToggle(opt)}
                                                />
                                                {isChecked && <Check size={10} className="text-white stroke-[3]" />}
                                            </div>
                                            <span className={cn("transition-colors break-words", isChecked ? "text-blue-900 font-medium" : "text-gray-600")}>
                                                {opt}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Calendar Logic */}
                    {isCalendar && (
                        <div className="flex flex-col gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-700">Date Condition</label>
                                <div className="relative">
                                    <select 
                                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
                                        value={logicType}
                                        onChange={(e) => setLogicType(e.target.value)}
                                    >
                                        <option value="x_years_ago">X years ago from today</option>
                                        <option value="before_date">Before date</option>
                                        <option value="between_years">Between X and Y years ago</option>
                                        <option value="after_date">After date</option>
                                        <option value="more_than_years">More than X years from today</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                                </div>
                            </div>
                            
                            {['x_years_ago', 'more_than_years'].includes(logicType) && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-700">Years</label>
                                    <input 
                                        type="number" 
                                        placeholder="Enter number of years..."
                                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-gray-400"
                                        value={value1}
                                        onChange={(e) => setValue1(e.target.value)}
                                    />
                                </div>
                            )}
                            
                            {['before_date', 'after_date'].includes(logicType) && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-700">Target Date</label>
                                    <input 
                                        type="date" 
                                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-600"
                                        value={value1}
                                        onChange={(e) => setValue1(e.target.value)}
                                    />
                                </div>
                            )}

                            {logicType === 'between_years' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-700">Min Years</label>
                                        <input 
                                            type="number" 
                                            placeholder="Min"
                                            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            value={value1}
                                            onChange={(e) => setValue1(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-gray-700">Max Years</label>
                                        <input 
                                            type="number" 
                                            placeholder="Max"
                                            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            value={value2}
                                            onChange={(e) => setValue2(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 shrink-0">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-200/50 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSaveClick}
                        className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-200 transition-all active:scale-95"
                    >
                        Save Condition
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// Helper to get logic string for tooltip
const getLogicString = (conditional) => {
    if (!conditional) return "";
    if (conditional.selectedOptions && conditional.selectedOptions.length > 0) {
        return `is ${conditional.selectedOptions.join(" or ")}`;
    }
    return `${conditional.logicType?.replace(/_/g, ' ')} ${conditional.value1}`;
};

// Helper to recursively update the field tree
const updateFieldTree = (fields, parentId, updateFn) => {
    if (parentId === null) {
        return updateFn(fields);
    }
    return fields.map(f => {
        if (f.id === parentId) {
            return { ...f, children: updateFn(f.children || []) };
        }
        if (f.children) {
            return { ...f, children: updateFieldTree(f.children, parentId, updateFn) };
        }
        return f;
    });
};

// Helper to check for matching descendants (Updated for Multi-select)
const hasMatchingDescendant = (children, filterIds) => {
    if (!children || children.length === 0) return false;
    if (!filterIds || filterIds.length === 0) return true;
    
    return children.some(child => 
        (child.integrations?.some(id => filterIds.includes(id))) || 
        hasMatchingDescendant(child.children, filterIds)
    );
};

const FormFieldItem = ({ 
    field, 
    index, 
    parentId = null, 
    onOpenMenu, 
    onDragStart, 
    isActive, 
    draggingId, 
    onUpdateLabel, 
    selectionMode, 
    onSelect, 
    allFields, 
    onOrphanEnter, 
    onOrphanLeave,
    onAddChild, 
    onOpenTypeMenu,
    isAdminJourney, 
    adminIntegrations,
    activeIntegrationFilters // Array
}) => {
  // Filter Visibility Logic
  const isVisible = !activeIntegrationFilters || activeIntegrationFilters.length === 0 || 
                    (field.integrations?.some(id => activeIntegrationFilters.includes(id))) || 
                    hasMatchingDescendant(field.children, activeIntegrationFilters);

  if (!isVisible) return null;

  const isDragging = draggingId === field.id;
  const isHeading = field.type.toLowerCase() === 'heading';
  const isRepeater = field.type.toLowerCase() === 'repeater';
  
  const validTrigger = isValidTrigger(field);
  const isSelf = selectionMode === field.id;
  
  // Determine if this field is unselectable in the current mode
  const isUnselectable = selectionMode && (!validTrigger || isSelf);
  
  // In selection mode, determine styling
  let selectionStyle = "";
  if (selectionMode) {
    if (!isUnselectable) {
        selectionStyle = "cursor-pointer hover:ring-2 hover:ring-blue-400 hover:bg-blue-50";
    } else {
        if (isRepeater) {
             // Special case for repeaters: Grey background but NO opacity/grayscale so children are visible
             selectionStyle = "bg-gray-200";
        } else {
             selectionStyle = "opacity-60 cursor-not-allowed grayscale bg-gray-200";
        }
    }
  }

  const inputBg = isUnselectable ? "bg-gray-200" : "bg-white";

  // Check for orphan status
  const triggerExists = field.conditional ? allFields.some(f => f.id === field.conditional.triggerId) : true;
  const isOrphan = field.conditional && !triggerExists;

  // Helper for clear logic string (Improved)
  const getReadableLogic = (c) => {
      if (c.selectedOptions && c.selectedOptions.length > 0) {
          return `is "${c.selectedOptions.join('" or "')}"`;
      }
      const logicMap = {
          'greater_than': '>',
          'less_than': '<',
          'between': 'is between',
          'outside_range': 'is outside',
          'x_years_ago': 'was X years ago',
          'before_date': 'is before',
          'after_date': 'is after',
          'more_than_years': 'is > X years'
      };
      const label = logicMap[c.logicType] || c.logicType?.replace(/_/g, ' ');
      return `${label} ${c.value1 || ''} ${c.value2 ? 'and ' + c.value2 : ''}`;
  };

  const [parentRef] = useAutoAnimate(); // Animation for repeater children

  const renderInput = () => {
    const type = field.type.toLowerCase();
    switch (type) {
        case 'repeater': 
            const buttonLabel = field.repeaterButtonLabel || "+ Add";
            return (
                <div className="flex flex-col gap-1 mt-1">
                    <div 
                        ref={parentRef}
                        className={cn(
                            "flex flex-col gap-1 p-2 border border-gray-600 rounded-lg min-h-[60px]",
                            inputBg // Use dynamic background
                        )}
                        onClick={(e) => {
                            if ((field.children || []).length === 0) {
                                e.stopPropagation();
                                if (onOpenTypeMenu) onOpenTypeMenu(field.id, e.clientX, e.clientY);
                            }
                        }}
                    >
                        {(field.children || []).length === 0 && (
                            <div className="text-center text-xs text-gray-400 italic py-2 cursor-pointer hover:text-gray-600 transition-colors">
                                Click to add first field
                            </div>
                        )}
                        
                        {(field.children || []).map((child, childIndex) => (
                            <FormFieldItem 
                                key={child.id}
                                field={child}
                                index={childIndex}
                                parentId={field.id} // Pass current field as parent
                                onOpenMenu={onOpenMenu}
                                onDragStart={onDragStart}
                                draggingId={draggingId}
                                isActive={isActive} 
                                onUpdateLabel={onUpdateLabel}
                                selectionMode={selectionMode}
                                onSelect={onSelect}
                                allFields={allFields} 
                                onOrphanEnter={onOrphanEnter}
                                onOrphanLeave={onOrphanLeave}
                                onAddChild={onAddChild}
                                onOpenTypeMenu={onOpenTypeMenu}
                                isAdminJourney={isAdminJourney} // Pass Prop
                                adminIntegrations={adminIntegrations} // Pass Prop
                                activeIntegrationFilters={activeIntegrationFilters} // Pass down
                            />
                        ))}
                    </div>
                    
                    <button 
                        disabled
                        className="self-start flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 text-white rounded-full text-xs font-medium shadow-sm opacity-90 cursor-default"
                    >
                        {buttonLabel}
                    </button>
                </div>
            );

        case 'text area': return <div className={cn("h-20 w-full border border-gray-600 rounded", inputBg)} />;
        case 'currency':
            return <div className="relative w-[48%]"><span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600 font-medium text-xs">£</span><div className={cn("h-7 w-full border border-gray-600 rounded pl-6", inputBg)} /></div>;
        
        case 'dropdown':
            return <div className={cn("h-7 w-[48%] border border-gray-600 rounded flex items-center justify-end px-2", inputBg)}><ChevronDown size={14} className="text-gray-600" /></div>;

        case 'radio buttons': 
            return (
                <div className="flex flex-col gap-2 mt-1">
                    {(field.options || ["Option 1", "Option 2"]).map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full border border-gray-600" />
                            <span className="text-xs text-gray-500">{opt}</span>
                        </div>
                    ))}
                </div>
            );
        case 'checkbox': 
            return (
                <div className="flex flex-col gap-2 mt-1">
                    {(field.options || ["Checkbox option"]).map((opt, i) => (
                        <div key={i} className="flex items-start gap-2">
                            <div className="w-4 h-4 rounded border border-gray-600 mt-0.5" />
                            <div className="text-xs text-gray-600 min-w-[50px] border-b border-transparent">
                                {opt}
                            </div>
                        </div>
                    ))}
                </div>
            );
        case 'heading': return null;
        case 'fixed text': return null;
        
        case 'calendar':
            return <div className={cn("h-7 w-[48%] border border-gray-600 rounded flex items-center justify-end px-2", inputBg)}><Calendar size={14} className="text-gray-600" /></div>;
        case 'address group': return <div className={cn("h-7 w-full border border-gray-600 rounded flex items-center justify-end px-2", inputBg)}><MapPin size={14} className="text-gray-600" /></div>;
        
        case 'sort code':
            return <div className="relative w-[48%]"><div className={cn("h-7 w-full border border-gray-600 rounded flex items-center px-2 text-xs text-gray-400 tracking-widest", inputBg)}>- _ _ - _ _ - _ _</div></div>;
            
        case 'account number':
            return <div className="relative w-[48%]"><div className={cn("h-7 w-full border border-gray-600 rounded flex items-center px-2 text-xs text-gray-400 tracking-widest", inputBg)}>- _ _ _ _ _ _ _ _</div></div>;
            
        case 'phone number':
            return (
                <div className="relative w-[48%]">
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
                     <div className={cn("h-7 w-full border border-gray-600 rounded pl-12", inputBg)} />
                </div>
            );

        case 'number': 
        case 'text field': 
        default:
            return <div className={cn("h-7 w-[48%] border border-gray-600 rounded", inputBg)} />;
    }
  };

  const handleTextChange = (e) => {
    const newText = e.target.innerText;
    onUpdateLabel(field.id, newText);
  };

  return (
    <div 
      id={`field-${field.id}`} 
      className={cn(
        "group flex items-center justify-between px-3 py-1 bg-white relative",
        "rounded-lg shadow-sm border border-gray-100 mb-1 select-none transition-all",
        isHeading && "pt-4",
        isActive && "z-50 relative ring-2 ring-white shadow-md",
        isDragging && "opacity-50 bg-blue-50 ring-1 ring-blue-200",
        selectionStyle
      )}
      onClick={(e) => {
          if (selectionMode) {
              e.stopPropagation();
              if (validTrigger) onSelect(field);
          }
      }}
    >
      <div className="flex items-center gap-3 flex-1">
        <div 
            onPointerDown={(e) => !selectionMode && onDragStart(e, index, field.id, parentId)} // Pass parentId
            className={cn(
                "p-0.5 rounded transition-colors touch-none",
                selectionMode ? "cursor-default text-gray-300" : "cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
            )}
        >
            <Menu size={16} />
        </div>
        
        {/* Orphan Warning Icon - Enhanced Tooltip */}
        {isOrphan && (
             <div 
                className="relative flex items-center z-10 cursor-help ml-1"
                onMouseEnter={(e) => onOrphanEnter(e, field)}
                onMouseLeave={onOrphanLeave}
             >
                 <AlertTriangle size={18} className="text-red-600 animate-pulse" />
            </div>
        )}
        
        <div className="flex flex-col gap-0.5 w-full">
            <div
                contentEditable={!selectionMode}
                suppressContentEditableWarning
                onBlur={handleTextChange}
                className={cn(
                    "focus:outline-none bg-transparent w-full placeholder-gray-400 leading-tight break-words whitespace-pre-wrap min-h-[1.2em]",
                    "text-[11px] font-medium text-gray-600",
                    (field.type === 'fixed text' && field.bold) && "text-[10px] font-bold text-black",
                    isHeading && "text-lg font-bold border-b-2 border-gray-300 pb-1 mb-1 text-gray-600",
                    field.mandatory && "after:content-['*'] after:ml-0.5 after:text-red-500",
                    selectionMode && "pointer-events-none"
                )}
            >
                {field.label}
            </div>
            <div className={cn(selectionMode && !isRepeater && "pointer-events-none")}>
                {renderInput()}
            </div>

            {/* NEW: Integration Chips */}
            {isAdminJourney && field.integrations && field.integrations.length > 0 && adminIntegrations && (
                <div className="flex flex-wrap gap-1 mt-1">
                    {field.integrations.map(id => {
                        const integration = adminIntegrations.find(i => i.id === id);
                        if (!integration) return null;
                        return (
                            <span 
                                key={id} 
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border shadow-sm select-none"
                                style={{ 
                                    backgroundColor: integration.bg, 
                                    color: integration.text, 
                                    borderColor: integration.border 
                                }}
                            >
                                {integration.label}
                            </span>
                        );
                    })}
                </div>
            )}

            {field.tiptext && (
                <div className="text-[10px] font-bold text-black w-full mt-1">
                    {field.tiptext}
                </div>
            )}
        </div>
      </div>
      
      <div 
        onClick={(e) => !selectionMode && onOpenMenu(e, field.id)}
        className={cn(
            "p-1 rounded-full transition-colors",
            selectionMode ? "opacity-0 pointer-events-none" : "hover:bg-gray-100 cursor-pointer text-gray-400 hover:text-gray-600"
        )}
      >
        <Settings size={16} />
      </div>
    </div>
  );
};

const FormCanvas = ({ fields, setFields, isAdminJourney }) => { // Accept Prop
  const [menuState, setMenuState] = useState({ isOpen: false, fieldId: null });
  const [draggingId, setDraggingId] = useState(null);
  const [activeHeadingId, setActiveHeadingId] = useState(null);
  
  const [typeMenu, setTypeMenu] = useState({ isOpen: false, parentId: null, x: 0, y: 0 }); // New State
  const [selectionMode, setSelectionMode] = useState(null);
  const [conditionalTriggerField, setConditionalTriggerField] = useState(null);
  const [showWarningOptions, setShowWarningOptions] = useState(false);
  const [showRemoveConditionConfirm, setShowRemoveConditionConfirm] = useState(false); // New state for remove confirmation
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, fieldId: null });
  const [hoveredOrphan, setHoveredOrphan] = useState(null); // New state
  const [adminIntegrations, setAdminIntegrations] = useState([]); // New State
  const [activeIntegrationFilters, setActiveIntegrationFilters] = useState([]); // New State
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false); 
  const filterMenuRef = useRef(null); 
  
  const [listRef, enableAnimations] = useAutoAnimate();
  
  const dragItemIndex = useRef(null);
  const dragParentId = useRef(null); // Track which parent we are dragging inside
  const dragStartY = useRef(0);
  const warningDropdownRef = useRef(null);

  // NEW: Load integrations for Admin Journey
  useEffect(() => {
      if (isAdminJourney) {
          const q = collection(db, "integrations");
          const unsubscribe = onSnapshot(q, (snapshot) => {
              const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              loaded.sort((a, b) => a.label.localeCompare(b.label));
              setAdminIntegrations(loaded);
          });
          return () => unsubscribe();
      }
  }, [isAdminJourney]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
        setIsFilterMenuOpen(false);
      }
      if (warningDropdownRef.current && !warningDropdownRef.current.contains(event.target)) {
        setShowWarningOptions(false);
      }
    };

    if (showWarningOptions || isFilterMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showWarningOptions, isFilterMenuOpen]);

  // --- SCROLL SPY ---
  const handleScroll = (e) => {
    const container = e.target;
    const containerRect = container.getBoundingClientRect();
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
    const isAtTop = container.scrollTop < 20; // NEW: Check for top
    
    const collectAllHeadings = (list) => {
        let res = [];
        list.forEach(f => {
            if (f.type.toLowerCase() === 'heading') res.push(f);
            if (f.children) res = res.concat(collectAllHeadings(f.children));
        });
        return res;
    };
    const headingFields = collectAllHeadings(fields);

    // NEW: Force first heading if scrolled to top
    if (isAtTop && headingFields.length > 0) {
        if (headingFields[0].id !== activeHeadingId) setActiveHeadingId(headingFields[0].id);
        return;
    }

    if (isAtBottom && headingFields.length > 0) {
        const lastHeading = headingFields[headingFields.length - 1];
        if (lastHeading.id !== activeHeadingId) setActiveHeadingId(lastHeading.id);
        return; 
    }
    let currentActive = null;
    for (const heading of headingFields) {
        const el = document.getElementById(`field-${heading.id}`);
        if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top < containerRect.top + 150) {
                currentActive = heading.id;
            } else {
                break; 
            }
        }
    }
    if (currentActive && currentActive !== activeHeadingId) setActiveHeadingId(currentActive);
  };

  const scrollToField = (fieldId) => {
    setActiveHeadingId(fieldId); // Immediately set active state
    const element = document.getElementById(`field-${fieldId}`);
    if (element) {
        // Fix: Manually scroll the container to prevent the whole page from moving
        const container = element.closest('.overflow-y-auto'); 
        if (container) {
            const elementRect = element.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const currentScroll = container.scrollTop;
            
            // Calculate relative position from the top of the container
            const relativeTop = elementRect.top - containerRect.top;
            
            container.scrollTo({
                top: currentScroll + relativeTop - 20, // 20px padding
                behavior: 'smooth'
            });
        }
    }
  };

  // Updated Pointer Down to track parent
  const handlePointerDown = (e, index, id, parentId = null) => {
    if (selectionMode || activeIntegrationFilters.length > 0) return; // Disable D&D when filtering
    e.preventDefault(); 
    e.stopPropagation(); // Stop propagation to avoid triggering parent drag
    
    dragItemIndex.current = index;
    dragParentId.current = parentId; // Set current drag scope
    setDraggingId(id);
    dragStartY.current = e.clientY;
    
    enableAnimations(false);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerMove = (e) => {
    if (dragItemIndex.current === null) return;
    const rowHeight = 60; // Approximate
    const deltaY = e.clientY - dragStartY.current;
    
    // Check boundaries based on the list length in the current parent
    // We need to access the specific list we are dragging in.
    let currentListLength = 0;
    if (dragParentId.current === null) {
        currentListLength = fields.length;
    } else {
        // Find the parent repeater to check its children length
        const findParent = (list) => {
            for (const f of list) {
                if (f.id === dragParentId.current) return f;
                if (f.children) {
                    const found = findParent(f.children);
                    if (found) return found;
                }
            }
            return null;
        };
        const parent = findParent(fields);
        currentListLength = parent ? (parent.children || []).length : 0;
    }

    if (deltaY < -rowHeight/2 && dragItemIndex.current > 0) {
        swapFields(dragItemIndex.current, dragItemIndex.current - 1, dragParentId.current);
        dragItemIndex.current -= 1; 
        dragStartY.current -= rowHeight;
    }
    if (deltaY > rowHeight/2 && dragItemIndex.current < currentListLength - 1) {
        swapFields(dragItemIndex.current, dragItemIndex.current + 1, dragParentId.current);
        dragItemIndex.current += 1;
        dragStartY.current += rowHeight;
    }
  };

  // Updated swapFields to handle recursion
  const swapFields = (fromIndex, toIndex, parentId) => {
    setFields(prev => updateFieldTree(prev, parentId, (list) => {
        const newList = [...list];
        const [movedItem] = newList.splice(fromIndex, 1);
        newList.splice(toIndex, 0, movedItem);
        return newList;
    }));
  };

  const handlePointerUp = () => {
    setDraggingId(null);
    dragItemIndex.current = null;
    enableAnimations(true); 
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  };

  const handleOpenMenu = (e, fieldId) => {
    setMenuState({ isOpen: true, fieldId });
  };

  const handleCloseMenu = () => setMenuState(prev => ({ ...prev, isOpen: false }));

  const handleEnterSelectionMode = () => {
      setSelectionMode(menuState.fieldId);
      handleCloseMenu();
  };

  const handleSelectTrigger = (triggerField) => {
      if (triggerField.id === selectionMode) return; 
      setConditionalTriggerField(triggerField);
  };

  // Recursive Save Function
  const handleSaveCondition = (condition) => {
      const updateDeep = (list) => list.map(f => {
          if (f.id === selectionMode) {
              return { ...f, conditional: condition };
          }
          if (f.children) {
              return { ...f, children: updateDeep(f.children) };
          }
          return f;
      });
      
      setFields(prev => updateDeep(prev));
      setSelectionMode(null);
      setConditionalTriggerField(null);
  };

  const generateId = (fieldsList) => {
      const allIds = [];
      const collectIds = (list) => list.forEach(f => { allIds.push(f.id); if(f.children) collectIds(f.children); });
      collectIds(fieldsList);
      return (allIds.length > 0 ? Math.max(...allIds) : 0) + 1;
  };

  const createNewField = (type, id) => ({
      id,
      label: type.toLowerCase() === 'repeater' ? "Repeater label" : (type.toLowerCase() === 'fixed text' ? "Edit text" : "Question label"), 
      type: type.toLowerCase(),
      fma: false,
      mandatory: false,
      maxEntries: 0,
      repeaterButtonLabel: type.toLowerCase() === 'repeater' ? "+ Add" : undefined,
      numbersOnly: false,
      multiselect: false,
      allowInternational: false,
      bold: false,
      options: type.toLowerCase() === 'checkbox' ? ["Checkbox option"] : ["Option 1", "Option 2", "Option 3"],
      children: []
  });

  const handleAddField = (type, position) => { 
    enableAnimations(true);
    
    const newId = generateId(fields);
    const newField = createNewField(type, newId);

    // If adding specifically to a repeater (via button)
    if (position === 'child_of_repeater') {
        const repeaterId = menuState.fieldId; 
        setFields(prev => updateFieldTree(prev, repeaterId, (list) => [...list, newField]));
        return;
    }

    // Existing "Change type" logic
    if (position === 'change') {
       setFields(prev => {
           const deepChange = (list) => list.map(f => {
               if (f.id === menuState.fieldId) {
                   // Preserve children if relevant, or existing props
                   const { children, ...rest } = f;
                   return { ...newField, id: f.id, children: children || [] }; 
               }
               if (f.children) return { ...f, children: deepChange(f.children) };
               return f;
           });
           return deepChange(prev);
       });
       return;
    }
    
    const addRelative = (list) => {
        const idx = list.findIndex(f => f.id === menuState.fieldId);
        if (idx !== -1) {
            const newList = [...list];
            if (position === 'above') newList.splice(idx, 0, newField);
            else newList.splice(idx + 1, 0, newField);
            return newList;
        }
        return list.map(f => {
            if (f.children) return { ...f, children: addRelative(f.children) };
            return f;
        });
    };

    setFields(prev => addRelative(prev));
  };

  const handleAddChildToRepeater = (repeaterId, type = "text field") => {
      enableAnimations(true);
      const newId = generateId(fields);
      const newField = createNewField(type, newId);
      setFields(prev => updateFieldTree(prev, repeaterId, (children) => [...children, newField]));
      setTypeMenu({ isOpen: false, parentId: null, x: 0, y: 0 });
  };

  const handleOpenTypeMenu = (parentId, x, y) => {
      setTypeMenu({ isOpen: true, parentId, x, y });
  };

  // Updated Delete Handler - Opens Modal
  const handleDeleteField = () => {
    // Close context menu first
    setMenuState({ isOpen: false, fieldId: null });
    setDeleteConfirmation({ isOpen: true, fieldId: menuState.fieldId });
  };

  // Actual Delete Execution
  const confirmDelete = () => {
      // Logic to find field anywhere in tree
      const findField = (list, id) => {
          for (const f of list) {
              if (f.id === id) return f;
              if (f.children) {
                  const found = findField(f.children, id);
                  if (found) return found;
              }
          }
          return null;
      };
      
      const fieldToDelete = findField(fields, deleteConfirmation.fieldId);
      
      if (!fieldToDelete) {
          setDeleteConfirmation({ isOpen: false, fieldId: null });
          return;
      }

      enableAnimations(true);
      
      const deleteDeep = (list) => {
          return list.filter(f => f.id !== deleteConfirmation.fieldId).map(f => {
               // Update dependents logic...
               let updatedF = f;
               if (f.conditional && f.conditional.triggerId === deleteConfirmation.fieldId) {
                   updatedF = {
                       ...f,
                       conditional: {
                           ...f.conditional,
                           orphanedTriggerLabel: fieldToDelete.label
                       }
                   };
               }
               if (updatedF.children) {
                   updatedF = { ...updatedF, children: deleteDeep(updatedF.children) };
               }
               return updatedF;
          });
      };

      setFields(prev => deleteDeep(prev));
      
      setDeleteConfirmation({ isOpen: false, fieldId: null });
  };

  // Update Label Helper (Deep)
  const handleUpdateLabel = (id, newLabel) => {
      const updateDeep = (list) => list.map(f => {
          if (f.id === id) return { ...f, label: newLabel };
          if (f.children) return { ...f, children: updateDeep(f.children) };
          return f;
      });
      setFields(prev => updateDeep(prev));
  };

  // Update Field Helper (Deep)
  const handleUpdateField = (key, value) => {
      const updateDeep = (list) => list.map(f => {
          if (f.id === menuState.fieldId) return { ...f, [key]: value };
          if (f.children) return { ...f, children: updateDeep(f.children) };
          return f;
      });
      setFields(prev => updateDeep(prev));
  };

  // Helper to get current logic string
  const findFieldById = (list, id) => {
      for (const f of list) {
          if (f.id === id) return f;
          if (f.children) {
              const res = findFieldById(f.children, id);
              if (res) return res;
          }
      }
      return null;
  };

  const targetField = selectionMode ? findFieldById(fields, selectionMode) : null;
  const existingConditionTrigger = targetField?.conditional ? findFieldById(fields, targetField.conditional.triggerId) : null;

  const handleRemoveCondition = () => {
      const removeDeep = (list) => list.map(f => {
          if (f.id === selectionMode) {
              const { conditional, ...rest } = f;
              // If it has children, recurse
              if (rest.children) rest.children = removeDeep(rest.children);
              return rest;
          }
          if (f.children) return { ...f, children: removeDeep(f.children) };
          return f;
      });
      setFields(prev => removeDeep(prev));
      setShowRemoveConditionConfirm(false);
  };

  const handleOrphanEnter = (e, field) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setHoveredOrphan({ rect, field });
  };

  const handleOrphanLeave = () => {
      setHoveredOrphan(null);
  };

  // Logic to reorder entire sections via the TreeNavigation
  const handleReorderSections = (sourceId, targetId) => {
      setFields(prevFields => {
          // Recursive function to find the list containing both headings and perform the move
          const updateList = (list) => {
              const sourceIndex = list.findIndex(f => f.id === sourceId);
              const targetIndex = list.findIndex(f => f.id === targetId);

              // Check if both headings exist at this level
              if (sourceIndex !== -1 && targetIndex !== -1) {
                  // 1. Identify all heading indices to define section boundaries
                  const headingIndices = list
                      .map((f, i) => f.type.toLowerCase() === 'heading' ? i : -1)
                      .filter(i => i !== -1);
                  
                  // 2. Determine the range of the Source Section
                  // Starts at sourceIndex. Ends at the next heading or end of list.
                  const sourceHeadingRank = headingIndices.indexOf(sourceIndex);
                  const sourceNextHeadingIndex = (sourceHeadingRank + 1 < headingIndices.length) 
                      ? headingIndices[sourceHeadingRank + 1] 
                      : list.length;
                  
                  // Extract the section items
                  const sectionToMove = list.slice(sourceIndex, sourceNextHeadingIndex);

                  // 3. Remove the Source Section from the list
                  const listWithoutSource = [
                      ...list.slice(0, sourceIndex),
                      ...list.slice(sourceNextHeadingIndex)
                  ];

                  // 4. Calculate Insertion Point in the new list
                  const newTargetIndex = listWithoutSource.findIndex(f => f.id === targetId);
                  
                  let insertIndex;
                  
                  if (sourceIndex < targetIndex) {
                      // Moving DOWN: Insert AFTER the target section
                      // Find the end of the target section in the trimmed list
                      const newHeadingIndices = listWithoutSource
                          .map((f, i) => f.type.toLowerCase() === 'heading' ? i : -1)
                          .filter(i => i !== -1);
                      
                      const targetHeadingRank = newHeadingIndices.indexOf(newTargetIndex);
                      const targetNextHeadingIndex = (targetHeadingRank + 1 < newHeadingIndices.length)
                          ? newHeadingIndices[targetHeadingRank + 1]
                          : listWithoutSource.length;
                      
                      insertIndex = targetNextHeadingIndex;
                  } else {
                      // Moving UP: Insert BEFORE the target section (at target's index)
                      insertIndex = newTargetIndex;
                  }

                  // 5. Construct the final list
                  const newList = [
                      ...listWithoutSource.slice(0, insertIndex),
                      ...sectionToMove,
                      ...listWithoutSource.slice(insertIndex)
                  ];
                  
                  return newList;
              }

              // If not found at this level, recurse into children
              return list.map(f => {
                  if (f.children) {
                      return { ...f, children: updateList(f.children) };
                  }
                  return f;
              });
          };

          return updateList(prevFields);
      });
  };

  // Dependents search
  const getAllFields = (list) => list.reduce((acc, f) => [...acc, f, ...(f.children ? getAllFields(f.children) : [])], []);
  const flatFields = getAllFields(fields);
  const dependents = deleteConfirmation.fieldId ? flatFields.filter(f => f.conditional?.triggerId === deleteConfirmation.fieldId) : [];

  const toggleFilter = (id) => {
      setActiveIntegrationFilters(prev => {
          if (prev.includes(id)) return prev.filter(f => f !== id);
          return [...prev, id];
      });
  };


  return (
    <div className={cn(
        "flex-1 shadow-2xl flex overflow-hidden relative rounded-xl h-[calc(100vh-140px)] transition-colors duration-200",
        selectionMode ? "bg-gray-200" : "bg-white"
    )}>
       <div className="w-[200px] border-r border-gray-100 bg-[#e6e6e6] flex-shrink-0">
          <TreeNavigation 
            fields={fields} 
            onNavigate={scrollToField} 
            activeId={activeHeadingId}
            allowDrag={true} // Enable dragging
            onReorder={handleReorderSections} // Pass the reorder handler
          />
       </div>

       <div 
            ref={listRef} 
            className="flex-1 p-4 overflow-y-auto custom-scrollbar relative scroll-smooth"
            onScroll={handleScroll}
       >
          {/* NEW: Dropdown Filter Banner */}
          {isAdminJourney && adminIntegrations.length > 0 && (
              <div className="sticky top-0 z-30 mb-4 bg-white/95 backdrop-blur-sm border-b border-gray-100 pb-2 pt-1 -mt-2">
                  <div className="relative inline-block" ref={filterMenuRef}>
                      <button 
                          onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                          className={cn(
                              "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all select-none",
                              isFilterMenuOpen || activeIntegrationFilters.length > 0
                                  ? "bg-blue-50 border-blue-200 text-blue-700" 
                                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                          )}
                      >
                          <Filter size={14} />
                          <span>Filter Integrations</span>
                          {activeIntegrationFilters.length > 0 && (
                              <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[1.2em] text-center">
                                  {activeIntegrationFilters.length}
                              </span>
                          )}
                          <ChevronDown size={14} className={cn("transition-transform ml-1", isFilterMenuOpen && "rotate-180")} />
                      </button>

                      {isFilterMenuOpen && (
                          <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1 mb-1">
                                  Select Integrations
                              </div>
                              <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                                  {adminIntegrations.map(int => {
                                      const isSelected = activeIntegrationFilters.includes(int.id);
                                      return (
                                          <div 
                                              key={int.id}
                                              onClick={() => toggleFilter(int.id)}
                                              className={cn(
                                                  "flex items-center justify-between px-2 py-2 rounded-lg cursor-pointer transition-colors text-xs select-none",
                                                  isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                                              )}
                                          >
                                              <div className="flex items-center gap-2">
                                                  <div className={cn(
                                                      "w-4 h-4 rounded border flex items-center justify-center transition-all",
                                                      isSelected ? "bg-blue-600 border-blue-600" : "border-gray-300 bg-white"
                                                  )}>
                                                      {isSelected && <Check size={10} className="text-white stroke-[3]" />}
                                                  </div>
                                                  <span 
                                                      className="px-1.5 py-0.5 rounded text-[10px] font-bold border"
                                                      style={{ 
                                                          backgroundColor: int.bg, 
                                                          color: int.text, 
                                                          borderColor: int.border 
                                                      }}
                                                  >
                                                      {int.label}
                                                  </span>
                                              </div>
                                          </div>
                                      );
                                  })}
                              </div>
                              
                              {activeIntegrationFilters.length > 0 && (
                                  <div className="border-t border-gray-100 mt-2 pt-2 px-1">
                                      <button 
                                          onClick={() => { setActiveIntegrationFilters([]); setIsFilterMenuOpen(false); }}
                                          className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                                      >
                                          Clear Filters
                                      </button>
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              </div>
          )}

          {/* Selection Mode Banner */}
          {selectionMode && (
              <div className="sticky top-0 z-20 mb-4 flex flex-col gap-2">
                  {/* Updated Banner Style */}
                  <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-md shadow-sm flex justify-between items-center">
                      <div className="flex items-center gap-2">
                          <Info size={16} className="text-blue-600 flex-shrink-0" />
                          <span className="text-xs font-medium">
                              Select a question to base the condition for <strong className="font-bold text-blue-900">"{targetField?.label || 'this question'}"</strong> on
                          </span>
                      </div>
                      <button 
                        onClick={() => setSelectionMode(null)} 
                        className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded transition-colors"
                      >
                          Cancel
                      </button>
                  </div>
                  
                  {/* Warning Snippet */}
                  {targetField?.conditional && (
                      <div className="bg-yellow-50 border border-yellow-200 px-4 py-2 rounded-md shadow-sm flex items-start gap-2 text-yellow-800 relative pr-8">
                          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                          <div className="text-xs flex flex-col gap-1 w-full">
                              <span className="line-clamp-3 break-words" title={existingConditionTrigger?.label}>
                                  This field is currently conditional on <strong>{existingConditionTrigger?.label || "Unknown Field"}</strong>
                              </span>
                              
                              <div className="flex items-center gap-1 flex-wrap">
                                  {targetField.conditional.selectedOptions && targetField.conditional.selectedOptions.length > 0 ? (
                                      targetField.conditional.selectedOptions.length === 1 ? (
                                          <span>is <strong>{targetField.conditional.selectedOptions[0]}</strong></span>
                                      ) : (
                                          <div ref={warningDropdownRef} className="relative inline-block ml-1">
                                              <button 
                                                onClick={() => setShowWarningOptions(!showWarningOptions)}
                                                className="flex items-center gap-1 text-xs font-semibold bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded border border-yellow-300 transition-colors"
                                              >
                                                  Show options <ChevronDown size={12} className={cn("transition-transform", showWarningOptions && "rotate-180")} />
                                              </button>
                                              
                                              {showWarningOptions && (
                                                  <div className="absolute top-full left-0 mt-1 w-48 bg-yellow-50 border border-yellow-200 rounded-md shadow-lg z-50 max-h-40 overflow-y-auto">
                                                      {targetField.conditional.selectedOptions.map((opt, i) => (
                                                          <div key={i} className="px-3 py-1.5 text-xs text-yellow-900 border-b border-yellow-100 last:border-0 hover:bg-yellow-100">
                                                              {opt}
                                                          </div>
                                                      ))}
                                                  </div>
                                              )}
                                          </div>
                                      )
                                  ) : (
                                      <span>
                                         {targetField.conditional.logicType?.replace(/_/g, ' ')} {targetField.conditional.value1}
                                      </span>
                                  )}
                              </div>
                          </div>

                          {/* Remove Button */}
                          <button 
                              onClick={(e) => {
                                  e.stopPropagation();
                                  setShowRemoveConditionConfirm(true);
                              }}
                              className="absolute right-2 top-2 text-yellow-600 hover:text-red-600 transition-colors p-1"
                              title="Remove condition"
                          >
                              <Trash2 size={14} />
                          </button>
                      </div>
                  )}
              </div>
          )}

          {fields.map((field, index) => (
             <FormFieldItem 
                key={field.id} 
                index={index}
                field={field} 
                parentId={null} // Root items have no parent
                onOpenMenu={handleOpenMenu}
                onDragStart={handlePointerDown}
                draggingId={draggingId}
                isActive={menuState.isOpen && menuState.fieldId === field.id}
                onUpdateLabel={handleUpdateLabel}
                selectionMode={selectionMode} 
                onSelect={handleSelectTrigger} 
                allFields={flatFields} // Pass flat list for lookup
                onOrphanEnter={handleOrphanEnter}
                onOrphanLeave={handleOrphanLeave}
                onAddChild={(id) => handleAddChildToRepeater(id, "text field")} // Default for button (disabled in edit mode anyway)
                onOpenTypeMenu={handleOpenTypeMenu}
                isAdminJourney={isAdminJourney} // Pass Prop
                adminIntegrations={adminIntegrations} // Pass Prop
                activeIntegrationFilters={activeIntegrationFilters} // Pass array
             />
          ))}
       </div>

       {/* Type Menu Portal */}
       {typeMenu.isOpen && createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={() => setTypeMenu({ ...typeMenu, isOpen: false })}>
                 <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
                 <div 
                    className="absolute bg-white rounded-lg shadow-xl border border-gray-200 w-48 py-2 z-[10000] max-h-[300px] overflow-y-auto animate-in fade-in zoom-in-95 duration-100"
                    style={{ top: Math.min(typeMenu.y, window.innerHeight - 300), left: Math.min(typeMenu.x, window.innerWidth - 200) }}
                 >
                    {FIELD_TYPES.map(type => (
                        <div 
                            key={type} 
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-700"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleAddChildToRepeater(typeMenu.parentId, type);
                            }}
                        >
                            {type}
                        </div>
                    ))}
                 </div>
            </div>,
            document.body
        )}

        {conditionalTriggerField && (
            <ConditionalLogicModal 
                triggerField={conditionalTriggerField}
                currentCondition={targetField?.conditional}
                onClose={() => setConditionalTriggerField(null)}
                onSave={handleSaveCondition}
            />
        )}

        {/* Remove Condition Confirmation Modal */}
        {showRemoveConditionConfirm && createPortal(
            <div className="fixed inset-0 z-[10002] flex items-center justify-center">
                <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowRemoveConditionConfirm(false)} />
                <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-80 p-6 animate-in zoom-in-95 duration-200 relative z-10">
                    <h3 className="font-bold text-gray-900 mb-2">Remove conditional logic?</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Removing the conditional will mean this question will always appear.
                    </p>
                    <div className="flex justify-end gap-2">
                        <button 
                            onClick={() => setShowRemoveConditionConfirm(false)}
                            className="px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleRemoveCondition}
                            className="px-3 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded shadow-sm"
                        >
                            Remove
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmation.isOpen && createPortal(
            <div className="fixed inset-0 z-[10002] flex items-center justify-center">
                <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setDeleteConfirmation({ isOpen: false, fieldId: null })} />
                <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-96 p-6 animate-in zoom-in-95 duration-200 relative z-10">
                    <div className="flex flex-col items-center mb-4">
                         <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
                             <AlertTriangle className="text-red-600" size={24} />
                         </div>
                         <h3 className="font-bold text-xl text-gray-900">Delete Field?</h3>
                         <p className="text-sm text-gray-500 text-center mt-1">This action cannot be undone.</p>
                    </div>
                    
                    {dependents.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 px-3 py-2 rounded-md shadow-sm flex items-start gap-2 text-yellow-800 text-xs mb-4">
                             <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                             <div>
                                 Other questions depend on this field for conditional logic. Removing this field will break those conditional questions.
                             </div>
                        </div>
                    )}

                    <div className="flex justify-center gap-3 w-full">
                        <button 
                            onClick={() => setDeleteConfirmation({ isOpen: false, fieldId: null })}
                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmDelete}
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md shadow-sm transition-colors"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        )}

        {menuState.isOpen && createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={handleCloseMenu}>
                 <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
                 
                 <div className="relative z-[10000]" onClick={e => e.stopPropagation()}>
                    {(() => {
                       const field = findFieldById(fields, menuState.fieldId);
                       
                       // CONDITIONAL RENDER
                       const MenuComponent = isAdminJourney ? AdminContextMenu : ContextMenu;

                       return (
                           <MenuComponent 
                               isOpen={true} 
                               position={{ x: 0, y: 0 }} 
                               onClose={handleCloseMenu}
                               onAdd={handleAddField}
                               onDelete={handleDeleteField}
                               selectedLabel={field?.label || "Field Options"}
                               selectedType={field?.type || ""}
                               fma={field?.fma || false}
                               mandatory={field?.mandatory || false}
                               tiptext={field?.tiptext || ""}
                               maxEntries={field?.maxEntries || 0}
                               repeaterButtonLabel={field?.repeaterButtonLabel || ""} 
                               numbersOnly={field?.numbersOnly || false}
                               multiselect={field?.multiselect || false}
                               allowInternational={field?.allowInternational || false}
                               bold={field?.bold || false}
                               options={field?.options || []}
                               onUpdateField={handleUpdateField}
                               onManageConditional={handleEnterSelectionMode}
                               integrations={field?.integrations || []} 
                               availableIntegrations={adminIntegrations} // ADD THIS
                           />
                       );
                    })()}
                 </div>
            </div>,
            document.body
        )}

        {/* Orphan Tooltip Portal */}
        {hoveredOrphan && (
            <OrphanTooltip 
                rect={hoveredOrphan.rect} 
                field={hoveredOrphan.field} 
            />
        )}
    </div>
  );
};

// Tooltip Component
const OrphanTooltip = ({ rect, field }) => {
    if (!rect || !field) return null;

    const getReadableLogic = (c) => {
      if (c.selectedOptions && c.selectedOptions.length > 0) {
          return `is "${c.selectedOptions.join('" or "')}"`;
      }
      const logicMap = {
          'greater_than': '>',
          'less_than': '<',
          'between': 'is between',
          'outside_range': 'is outside',
          'x_years_ago': 'was X years ago',
          'before_date': 'is before',
          'after_date': 'is after',
          'more_than_years': 'is > X years'
      };
      const label = logicMap[c.logicType] || c.logicType?.replace(/_/g, ' ');
      return `${label} ${c.value1 || ''} ${c.value2 ? 'and ' + c.value2 : ''}`;
    };

    const style = {
        top: rect.top + rect.height / 2,
        left: rect.right + 12,
    };

    return createPortal(
        <div 
            style={style}
            className="fixed w-80 bg-gray-900/95 backdrop-blur-md text-white text-xs rounded-xl shadow-2xl border border-white/10 z-[99999] transform -translate-y-1/2 animate-in fade-in zoom-in-95 duration-200 origin-left"
        >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-white/5 rounded-t-xl">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse"></div>
                    <span className="font-bold text-red-100 tracking-wide text-[11px] uppercase">Broken Link</span>
                </div>
            </div>
            
            {/* Body */}
            <div className="px-4 py-3 space-y-3">
                <p className="text-gray-300 leading-relaxed">
                    This field depends on <strong className="text-white">{field.conditional.orphanedTriggerLabel || "a deleted field"}</strong> which no longer exists.
                </p>
                
                {/* Original Rule Box */}
                <div className="bg-gray-800/50 border border-white/10 rounded-lg p-3">
                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Original Rule</div>
                    <div className="text-gray-200 font-mono text-[11px]">
                        IF answer {getReadableLogic(field.conditional)}
                    </div>
                </div>

                {/* Recommendation Box */}
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1">
                        <span className="text-red-200 font-bold">Action Required</span>
                        <span className="text-red-100/80 leading-tight">
                            This field can no longer appear in preview mode. Please <strong>delete this field</strong> or <strong>update the conditional logic</strong> to select a new trigger.
                        </span>
                    </div>
                </div>
            </div>
            
            {/* Arrow */}
            <div className="absolute top-1/2 -left-1.5 -mt-1.5 w-3 h-3 bg-gray-900/95 border-l border-b border-white/10 transform rotate-45"></div>
        </div>,
        document.body
    );
};

export default FormCanvas;


