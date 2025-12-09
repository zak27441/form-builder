import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, ArrowDown, Trash2, Plus, Minus, Settings, Check } from 'lucide-react';
import { cn } from '../utils/cn';

const FIELD_TYPES = [
  "Text field", "Currency", "Text area", 
  "Dropdown", "Radio buttons", "Checkbox", "Heading", 
  "Fixed text", "Calendar", "Address group", "Repeater", 
  "Sort code", "Account number", "Phone number"
];

const AdminContextMenu = ({ 
    isOpen, position, onClose, onAdd, onDelete, 
    selectedLabel, selectedType, 
    fma, mandatory, tiptext, 
    maxEntries, numbersOnly, multiselect, allowInternational,
    bold, options, repeaterButtonLabel, 
    onUpdateField,
    onManageConditional,
    integrations: selectedIntegrations 
}) => {
  const [expandedItem, setExpandedItem] = useState(null);
  const [showTipTextModal, setShowTipTextModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false); 
  const [showRepeaterButtonTextModal, setShowRepeaterButtonTextModal] = useState(false); 
  const [showIntegrationsModal, setShowIntegrationsModal] = useState(false);
  const [availableIntegrations, setAvailableIntegrations] = useState([]);

  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };
    
    // CHANGED: Load from localStorage + Listener
    const loadIntegrations = () => {
        try {
            const saved = localStorage.getItem('admin_integrations');
            if (saved) {
                setAvailableIntegrations(JSON.parse(saved));
            } else {
                setAvailableIntegrations([]);
            }
        } catch (e) {
            console.error("Failed to load integrations", e);
        }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      loadIntegrations();
      window.addEventListener('integrations-updated', loadIntegrations);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('integrations-updated', loadIntegrations);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isCentered = position.x === 0 && position.y === 0;

  const style = isCentered ? {} : {
    top: position.y + 10, 
    left: position.x - 128, 
    zIndex: 50,
  };

  const MenuItem = ({ icon: Icon, label, hasSubmenu, action, className, onClick }) => (
    <div 
      className={cn(
        "relative px-4 py-2 cursor-pointer flex items-center justify-between text-sm text-gray-700 hover:bg-gray-100 transition-colors",
        expandedItem === label && "bg-gray-100",
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) {
            onClick();
            return;
        }
        if (hasSubmenu) {
          setExpandedItem(expandedItem === label ? null : label);
        } else if (action) {
          action();
        }
      }}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon size={16} />}
        <span>{label}</span>
      </div>
      {hasSubmenu && expandedItem === label && (
        <div className="absolute left-full top-0 ml-2 bg-white rounded-lg shadow-xl border border-gray-200 w-48 py-2 z-50 max-h-[300px] overflow-y-auto">
           {FIELD_TYPES.map(type => (
             <div 
                key={type} 
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-700"
                onClick={(e) => {
                   e.stopPropagation();
                   let context = 'below';
                   if (label === "Add field above") context = 'above';
                   if (label === "Change field type") context = 'change';

                   onAdd(type, context);
                   onClose();
                }}
             >
               {type}
             </div>
           ))}
        </div>
      )}
    </div>
  );

  const ToggleItem = ({ label, checked, onChange, colorClass }) => (
     <div 
        className="px-4 py-2 flex items-center justify-between text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
        onClick={(e) => {
            e.stopPropagation();
            onChange(!checked);
        }}
     >
        <span>{label}</span>
        <div className={cn("w-8 h-4 rounded-full relative transition-colors duration-200", checked ? colorClass : "bg-gray-300")}>
           <div className={cn("absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform duration-200", checked ? "translate-x-4" : "translate-x-0")} />
        </div>
     </div>
  );

  const NumberControl = ({ label, value, onChange }) => (
    <div 
        className="px-4 py-2 flex items-center justify-between text-sm text-gray-700 hover:bg-gray-100 cursor-default"
        onClick={(e) => e.stopPropagation()}
    >
        <span>{label}</span>
        <div className="flex items-center gap-2 bg-gray-100 rounded-md px-1 py-0.5 border border-gray-200">
            <button 
                onClick={() => onChange(Math.max(0, (value || 0) - 1))}
                className="p-1 hover:bg-gray-200 rounded transition-colors text-gray-600"
            >
                <Minus size={12} />
            </button>
            <span className="text-xs font-medium w-4 text-center">{value || 0}</span>
            <button 
                onClick={() => onChange((value || 0) + 1)}
                className="p-1 hover:bg-gray-200 rounded transition-colors text-gray-600"
            >
                <Plus size={12} />
            </button>
        </div>
    </div>
  );

  const type = selectedType?.toLowerCase();

  return (
    <div 
        ref={menuRef} 
        style={style} 
        className={cn(
            "bg-white rounded-lg shadow-xl border border-gray-100 w-64 py-2 animate-in fade-in zoom-in-95 duration-100",
            !isCentered && "absolute"
        )}
    >
      {!isCentered && (
        <div className="absolute -top-2 left-1/2 -ml-2 w-4 h-4 bg-white border-l border-t border-gray-100 transform rotate-45" />
      )}

      <div className="relative bg-white rounded-lg overflow-visible"> 
        
        <div className="px-4 py-3 border-b border-gray-100 mb-2 bg-gray-50/50 rounded-t-lg">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Editing (Admin):</h3>
            <div className="text-sm font-medium text-gray-900 line-clamp-3 leading-tight">
                {selectedLabel}
            </div>
        </div>

        <div className="mx-2 mb-1 bg-gray-100 rounded-md overflow-visible relative"> 
            <MenuItem icon={ArrowUp} label="Add field above" hasSubmenu className="hover:bg-gray-200 rounded-t-md" />
            <div className="h-px bg-gray-200 w-full" />
            <MenuItem icon={ArrowDown} label="Add field below" hasSubmenu className="hover:bg-gray-200 rounded-b-md" />
        </div>
        
        <MenuItem label="Change field type" hasSubmenu />
        <MenuItem 
            label="Manage conditional" 
            onClick={() => {
                onManageConditional();
                onClose();
            }}
        />
        
        {['dropdown', 'radio buttons', 'checkbox'].includes(selectedType?.toLowerCase()) && (
            <MenuItem 
                label="Manage options" 
                onClick={() => setShowOptionsModal(!showOptionsModal)}
                className={cn(showOptionsModal && "bg-gray-100")}
            />
        )}
        {showOptionsModal && (
            <div className="absolute left-full top-20 ml-2 bg-white rounded-lg shadow-xl border border-gray-100 w-64 p-4 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-[400px] overflow-y-auto">
                 <h3 className="text-xs font-bold text-gray-700 mb-2">Edit Options</h3>
                 <div className="flex flex-col gap-2">
                    {(options || []).map((opt, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                            <input 
                                type="text" 
                                value={opt}
                                onChange={(e) => {
                                    const newOptions = [...(options || [])];
                                    newOptions[idx] = e.target.value;
                                    onUpdateField('options', newOptions);
                                }}
                                className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
                            />
                            <button 
                                onClick={() => {
                                    const newOptions = [...(options || [])];
                                    if (idx > 0) {
                                        [newOptions[idx], newOptions[idx-1]] = [newOptions[idx-1], newOptions[idx]];
                                        onUpdateField('options', newOptions);
                                    }
                                }}
                                disabled={idx === 0}
                                className="p-1 hover:bg-gray-100 text-gray-500 disabled:opacity-30"
                            >
                                <ArrowUp size={12} />
                            </button>
                            <button 
                                onClick={() => {
                                    const newOptions = [...(options || [])];
                                    if (idx < newOptions.length - 1) {
                                        [newOptions[idx], newOptions[idx+1]] = [newOptions[idx+1], newOptions[idx]];
                                        onUpdateField('options', newOptions);
                                    }
                                }}
                                disabled={idx === (options || []).length - 1}
                                className="p-1 hover:bg-gray-100 text-gray-500 disabled:opacity-30"
                            >
                                <ArrowDown size={12} />
                            </button>
                            <button 
                                onClick={() => {
                                    const newOptions = (options || []).filter((_, i) => i !== idx);
                                    onUpdateField('options', newOptions);
                                }}
                                className="p-1 hover:bg-red-50 text-red-500"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                    <button 
                        onClick={() => {
                            const newOptions = [...(options || []), `Option ${(options || []).length + 1}`];
                            onUpdateField('options', newOptions);
                        }}
                        className="mt-2 flex items-center justify-center gap-1 w-full py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                    >
                        <Plus size={12} /> Add Option
                    </button>
                 </div>
            </div>
        )}
        
        <ToggleItem 
            label="FMA only?" 
            checked={fma} 
            onChange={(val) => onUpdateField('fma', val)} 
            colorClass="bg-green-400" 
        />
        <ToggleItem 
            label="Mandatory?" 
            checked={mandatory} 
            onChange={(val) => onUpdateField('mandatory', val)} 
            colorClass="bg-green-400" 
        />
        
        <MenuItem 
            label="Manage tiptext" 
            onClick={() => setShowTipTextModal(!showTipTextModal)}
            className={cn(showTipTextModal && "bg-gray-100")}
        />
        {showTipTextModal && (
            <div className="absolute left-full top-60 ml-2 bg-white rounded-lg shadow-xl border border-gray-100 w-64 p-4 z-50 animate-in fade-in zoom-in-95 duration-100">
                 <h3 className="text-xs font-bold text-gray-700 mb-2">Edit Tip Text</h3>
                 <textarea 
                    className="w-full h-24 p-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-500 resize-none mb-2"
                    placeholder="Enter tip text here..."
                    value={tiptext || ""}
                    onChange={(e) => onUpdateField('tiptext', e.target.value)}
                 />
                 <div className="text-[10px] text-gray-400 text-center">
                    Text will appear bold below the field
                 </div>
            </div>
        )}

        {type === 'repeater' && (
            <>
                <NumberControl 
                    label="Max entries" 
                    value={maxEntries} 
                    onChange={(val) => onUpdateField('maxEntries', val)} 
                />
                
                <MenuItem 
                    label="Edit button text" 
                    onClick={() => setShowRepeaterButtonTextModal(!showRepeaterButtonTextModal)}
                    className={cn(showRepeaterButtonTextModal && "bg-gray-100")}
                />
                {showRepeaterButtonTextModal && (
                    <div className="absolute left-full top-40 ml-2 bg-white rounded-lg shadow-xl border border-gray-100 w-64 p-4 z-50 animate-in fade-in zoom-in-95 duration-100">
                        <h3 className="text-xs font-bold text-gray-700 mb-2">Edit Button Text</h3>
                        <input 
                            type="text"
                            className="w-full p-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-blue-500 mb-2"
                            placeholder="+ Add"
                            value={repeaterButtonLabel || ""}
                            onChange={(e) => onUpdateField('repeaterButtonLabel', e.target.value)}
                        />
                        <div className="text-[10px] text-gray-400 text-center">
                            Text for the add button
                        </div>
                    </div>
                )}
            </>
        )}

        {type === 'text field' && (
            <ToggleItem 
                label="Numbers only?" 
                checked={numbersOnly} 
                onChange={(val) => onUpdateField('numbersOnly', val)} 
                colorClass="bg-green-400" 
            />
        )}

        {['dropdown', 'radio buttons', 'checkbox'].includes(type) && (
            <ToggleItem 
                label="Multiselect?" 
                checked={multiselect} 
                onChange={(val) => onUpdateField('multiselect', val)} 
                colorClass="bg-green-400" 
            />
        )}
        
        {type === 'phone number' && (
            <ToggleItem 
                label="Allow international?" 
                checked={allowInternational} 
                onChange={(val) => onUpdateField('allowInternational', val)} 
                colorClass="bg-green-400" 
            />
        )}

        {type === 'fixed text' && (
            <ToggleItem 
                label="Make bold?" 
                checked={bold} 
                onChange={(val) => onUpdateField('bold', val)} 
                colorClass="bg-green-400" 
            />
        )}

        {/* INTEGRATIONS - ADMIN ONLY */}
        <div className="relative">
            <MenuItem 
                icon={Settings} 
                label="Integrations" 
                onClick={() => setShowIntegrationsModal(!showIntegrationsModal)}
                className={cn("text-amber-600 hover:bg-amber-50", showIntegrationsModal && "bg-amber-50")}
            />
            
            {showIntegrationsModal && (
                <div className="absolute left-full bottom-0 ml-2 bg-white rounded-lg shadow-xl border border-gray-200 w-56 p-2 z-50 animate-in fade-in zoom-in-95 duration-100 max-h-[300px] overflow-y-auto">
                    <div className="px-2 py-1 mb-2 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Select Integrations
                    </div>
                    
                    {availableIntegrations.length === 0 ? (
                        <div className="px-2 py-2 text-xs text-gray-400 italic text-center">
                            No integrations configured in Admin World.
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1">
                            {availableIntegrations.map(int => {
                                const isSelected = (selectedIntegrations || []).includes(int.id);
                                return (
                                    <div 
                                        key={int.id}
                                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const current = selectedIntegrations || [];
                                            const newVal = isSelected 
                                                ? current.filter(id => id !== int.id)
                                                : [...current, int.id];
                                            onUpdateField('integrations', newVal);
                                        }}
                                    >
                                        <div className={cn(
                                            "w-4 h-4 rounded border flex items-center justify-center transition-all flex-shrink-0",
                                            isSelected ? "bg-blue-500 border-blue-500" : "border-gray-300 bg-white"
                                        )}>
                                            {isSelected && <Check size={10} className="text-white" />}
                                        </div>
                                        <span 
                                            className="text-xs font-medium px-1.5 py-0.5 rounded border truncate max-w-[140px]"
                                            style={{ 
                                                backgroundColor: int.bg, 
                                                color: int.text, 
                                                borderColor: int.border 
                                            }}
                                        >
                                            {int.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>

        <div className="h-px bg-gray-100 my-1" />
        
        <MenuItem 
            icon={Trash2} 
            label="Delete field" 
            className="text-red-600 hover:bg-red-50" 
            onClick={() => {
                onDelete(); 
                onClose();
            }}
        />
      </div>
    </div>
  );
};

export default AdminContextMenu;
