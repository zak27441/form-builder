import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import { X, Upload, FileJson, Image, Copy, FileText, Plus, Filter, Check, ChevronDown, Shield, Layout, Sparkles, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react';
import { cn } from '../utils/cn';

const DEFAULT_FIELDS = [
  { id: 1, label: "New Section", type: "heading", fma: false, mandatory: false }
];

const AddJourneyModal = ({ isOpen, onClose, onAdd, existingJourneys }) => {
    // FORM STATE
    const [name, setName] = useState("");
    const [journeyType, setJourneyType] = useState("standard");
    const [template, setTemplate] = useState("blank"); 
    
    // TEMPLATE SPECIFIC STATE
    const [jsonFile, setJsonFile] = useState(null);
    const [imageFiles, setImageFiles] = useState([]);
    const [sourceJourney, setSourceJourney] = useState("");
    
    // UI STATE
    const [step, setStep] = useState(1);
    const [error, setError] = useState("");
    const [isDragOver, setIsDragOver] = useState(false);
    
    // Integration Filtering State
    const [adminIntegrations, setAdminIntegrations] = useState([]);
    const [selectedIntegrationFilters, setSelectedIntegrationFilters] = useState([]);
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    
    const filterMenuRef = useRef(null); // Ref for click outside

    // Click outside handler for filter menu
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
                setIsFilterMenuOpen(false);
            }
        };

        if (isFilterMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isFilterMenuOpen]);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            // Reset to defaults
            setName("");
            setTemplate("blank");
            setJsonFile(null);
            setImageFiles([]);
            setSourceJourney("");
            setError("");
            setAdminIntegrations([]);
            setSelectedIntegrationFilters([]);
            setIsFilterMenuOpen(false);
            setJourneyType("standard");
            setStep(1); // Reset to step 1
        }
    }, [isOpen]);

    // Load Admin Integrations when source is Admin
    useEffect(() => {
        if (sourceJourney === 'Admin') {
            try {
                const saved = localStorage.getItem('admin_integrations');
                if (saved) setAdminIntegrations(JSON.parse(saved));
            } catch (e) { console.error(e); }
        } else {
            setAdminIntegrations([]);
            setSelectedIntegrationFilters([]);
        }
    }, [sourceJourney]);

    if (!isOpen) return null;

    // Filter Helper (Recursive)
    const filterFieldsByIntegration = (fields, filters) => {
        if (!filters || filters.length === 0) return fields;

        return fields.reduce((acc, field) => {
            // Check if current field matches
            const matchesSelf = field.integrations?.some(id => filters.includes(id));
            
            // Recursively check/filter children
            let filteredChildren = [];
            if (field.children && field.children.length > 0) {
                filteredChildren = filterFieldsByIntegration(field.children, filters);
            }
            
            const matchesDescendant = filteredChildren.length > 0;

            // Keep field if it matches OR has matching children
            if (matchesSelf || matchesDescendant) {
                acc.push({
                    ...field,
                    children: filteredChildren // Use the filtered children
                });
            }
            return acc;
        }, []);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (template === 'json') {
            const file = e.dataTransfer.files[0];
            if (file && file.type === "application/json") setJsonFile(file);
            else setError("Please upload a valid JSON file.");
        } else if (template === 'image') {
            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/') || f.type === 'application/pdf');
            setImageFiles(prev => [...prev, ...files]);
        }
    };

    const handleFileSelect = (e) => {
        if (template === 'json') {
            const file = e.target.files[0];
            if (file) setJsonFile(file);
        } else if (template === 'image') {
            const files = Array.from(e.target.files);
            setImageFiles(prev => [...prev, ...files]);
        }
    };

    const handleNext = () => {
        setError("");
        if (step === 1) {
            const journeyName = name.trim();
            if (!journeyName) return setError("Journey name is required.");
            // Check if name exists in the array of journey objects
            if (existingJourneys.some(j => j.name === journeyName)) return setError("Journey name must be unique.");
            setStep(2);
        } else if (step === 2) {
            setStep(3);
        } else if (step === 3) {
            if (template === 'blank') {
                handleSubmit();
            } else {
                setStep(4);
            }
        }
    };

    const handleBack = () => {
        setError("");
        setStep(prev => prev - 1);
    };

    const handleSubmit = async () => {
        setError("");
        const journeyName = name.trim();
        
        let initialFields = DEFAULT_FIELDS;

        try {
            if (template === 'json' && jsonFile) {
                const text = await jsonFile.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch (e) {
                    throw new Error("File contains invalid JSON syntax.");
                }

                let fields = [];
                if (Array.isArray(data)) fields = data;
                else if (data.fields && Array.isArray(data.fields)) fields = data.fields;
                else if (data.schema && Array.isArray(data.schema)) fields = data.schema;
                else throw new Error("Invalid JSON structure.");
                
                // Basic validation
                const validateFields = (list) => {
                    for (const f of list) {
                        if (!f.id || !f.type || !f.label) return false;
                        if (f.children) if (!validateFields(f.children)) return false;
                    }
                    return true;
                };
                if (fields.length > 0 && !validateFields(fields)) {
                    throw new Error("Invalid field data found.");
                }
                initialFields = fields;

            } else if (template === 'existing' && sourceJourney) {
                // Find the source journey data from the passed existingJourneys prop
                const sourceData = existingJourneys.find(j => j.name === sourceJourney);
                
                if (sourceData) {
                    let sourceFields = sourceData.fields || DEFAULT_FIELDS;

                    // Filter logic for Admin
                    if (sourceJourney === 'Admin' && selectedIntegrationFilters.length > 0) {
                        initialFields = filterFieldsByIntegration(sourceFields, selectedIntegrationFilters);
                        if (initialFields.length === 0) throw new Error("No fields matched the selected integration filters.");
                    } else {
                        initialFields = sourceFields;
                    }
                } else if (sourceJourney === 'Admin') {
                    // Fallback if Admin journey not found in list (shouldn't happen if synced properly)
                    initialFields = DEFAULT_FIELDS; 
                }
            } else if (template === 'image') {
                if (imageFiles.length === 0) throw new Error("Please upload at least one image or PDF.");
            }

            // 1. Create Journey
            onAdd(journeyName, initialFields, journeyType);
            onClose();
            
        } catch (err) {
            setError(err.message || "Failed to process template.");
        }
    };

    const toggleIntegrationFilter = (id) => {
        setSelectedIntegrationFilters(prev => 
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
        );
    };

    // CONDENSED TEMPLATE OPTION (Smaller)
    const TemplateOption = ({ id, icon: Icon, label }) => (
        <div 
            onClick={() => { setTemplate(id); setError(""); }}
            className={`
                flex flex-col items-center justify-center p-2 rounded-xl border cursor-pointer transition-all h-[80px] relative group text-center gap-1.5
                ${template === id 
                    ? "border-blue-500 bg-blue-50/50 shadow-md ring-1 ring-blue-500" 
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white"}
            `}
        >
            <div className={`p-1.5 rounded-lg transition-colors ${template === id ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:shadow-sm'}`}>
                <Icon size={18} strokeWidth={2.5} />
            </div>
            <span className={`text-[10px] font-bold leading-tight ${template === id ? 'text-blue-700' : 'text-slate-600'}`}>{label}</span>
            
            {template === id && (
                <div className="absolute top-1.5 right-1.5 text-blue-500 animate-in fade-in zoom-in duration-200">
                    <Check size={12} strokeWidth={3} />
                </div>
            )}
        </div>
    );

    const allSourceOptions = ['Admin', ...existingJourneys.filter(j => j.name !== 'Admin').map(j => j.name)];

    // Determine total steps
    const totalSteps = template === 'blank' ? 3 : 4;

    // Handle Enter Key
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (step === 4 || (step === 3 && template === 'blank')) {
                handleSubmit();
            } else {
                handleNext();
            }
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            onKeyDown={handleKeyDown} // Listen for Enter key
        >
            <div 
                className="bg-white rounded-xl shadow-2xl w-[420px] animate-in fade-in zoom-in-95 duration-200 flex flex-col overflow-visible border border-white/50 transition-all ease-in-out" 
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white/50 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600">
                            <Sparkles size={16} fill="currentColor" className="opacity-20" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Create Journey</h3>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"><X size={16} /></button>
                </div>

                {/* Progress Bar - GREEN */}
                <div className="h-1 w-full bg-slate-100 flex relative shrink-0">
                    <div 
                        className="h-full bg-green-500 transition-all duration-300 ease-out absolute left-0"
                        style={{ width: `${(step / totalSteps) * 100}%` }}
                    />
                </div>

                {/* NEW: Previous Steps Summary */}
                {step > 1 && (
                    <div className="px-6 pt-4 pb-0 flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 shrink-0">
                        <div 
                            onClick={() => setStep(1)}
                            className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-[10px] text-slate-600 font-medium cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-colors group"
                        >
                            <span className="opacity-50 font-bold">Name:</span>
                            <span className="truncate max-w-[80px]">{name}</span>
                            <div className="w-3 h-3 rounded-full bg-green-100 flex items-center justify-center text-green-600 group-hover:bg-green-200 ml-1">
                                <Check size={8} strokeWidth={3} />
                            </div>
                        </div>

                        {step > 2 && (
                            <div 
                                onClick={() => setStep(2)}
                                className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-[10px] text-slate-600 font-medium cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-colors group"
                            >
                                <span className="opacity-50 font-bold">Type:</span>
                                <span>{journeyType === 'standard' ? 'Standard' : 'Admin'}</span>
                                <div className="w-3 h-3 rounded-full bg-green-100 flex items-center justify-center text-green-600 group-hover:bg-green-200 ml-1">
                                    <Check size={8} strokeWidth={3} />
                                </div>
                            </div>
                        )}

                        {step > 3 && (
                            <div 
                                onClick={() => setStep(3)}
                                className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-[10px] text-slate-600 font-medium cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-colors group"
                            >
                                <span className="opacity-50 font-bold">Template:</span>
                                <span className="capitalize">{template === 'existing' ? 'Clone' : template}</span>
                                <div className="w-3 h-3 rounded-full bg-green-100 flex items-center justify-center text-green-600 group-hover:bg-green-200 ml-1">
                                    <Check size={8} strokeWidth={3} />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Content - VISIBLE OVERFLOW for Dropdown */}
                <div className="p-6 space-y-6 bg-slate-50/30 custom-scrollbar h-auto max-h-[60vh] overflow-y-visible"> 
                    
                    {/* Step 1: Name */}
                    {step === 1 && (
                        <div className="space-y-2 animate-in slide-in-from-right-8 duration-300">
                            <div className="text-center mb-6">
                                <h4 className="text-lg font-bold text-slate-800">What's the name of this journey?</h4>
                                <p className="text-xs text-slate-500 mt-1">Give it a unique, descriptive name.</p>
                            </div>
                            <input 
                                type="text" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Mortgage Application v2" 
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all bg-white shadow-sm placeholder:text-slate-300 font-medium text-slate-700 text-center"
                                autoFocus
                            />
                        </div>
                    )}

                    {/* Step 2: Type */}
                    {step === 2 && (
                        <div className="space-y-4 animate-in slide-in-from-right-8 duration-300">
                            <div className="text-center mb-2">
                                <h4 className="text-lg font-bold text-slate-800">Select Journey Type</h4>
                                <p className="text-xs text-slate-500 mt-1">Is this a standard form or for admin use?</p>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                <div 
                                    onClick={() => setJourneyType("standard")}
                                    className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${journeyType === "standard" ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md ring-1 ring-blue-500" : "border-slate-200 hover:border-slate-300 hover:bg-white bg-white text-slate-600"}`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${journeyType === "standard" ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"}`}>
                                        <Layout size={20} />
                                    </div>
                                    <div className="flex flex-col text-left">
                                        <span className="text-sm font-bold">Standard Journey</span>
                                        <span className="text-[10px] opacity-80 mt-0.5">Regular user facing form workflow</span>
                                    </div>
                                    {journeyType === "standard" && <Check size={18} className="ml-auto text-blue-600" strokeWidth={3} />}
                                </div>

                                <div 
                                    onClick={() => setJourneyType("admin")}
                                    className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${journeyType === "admin" ? "border-purple-500 bg-purple-50 text-purple-700 shadow-md ring-1 ring-purple-500" : "border-slate-200 hover:border-slate-300 hover:bg-white bg-white text-slate-600"}`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${journeyType === "admin" ? "bg-purple-100 text-purple-600" : "bg-slate-100 text-slate-400"}`}>
                                        <Shield size={20} />
                                    </div>
                                    <div className="flex flex-col text-left">
                                        <span className="text-sm font-bold">Admin Journey</span>
                                        <span className="text-[10px] opacity-80 mt-0.5">Internal workflow with admin controls</span>
                                    </div>
                                    {journeyType === "admin" && <Check size={18} className="ml-auto text-purple-600" strokeWidth={3} />}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Start From */}
                    {step === 3 && (
                        <div className="space-y-4 animate-in slide-in-from-right-8 duration-300">
                            <div className="text-center mb-2">
                                <h4 className="text-lg font-bold text-slate-800">Start From...</h4>
                                <p className="text-xs text-slate-500 mt-1">Choose a template or start from scratch.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <TemplateOption id="blank" icon={FileText} label="Blank Canvas" />
                                <TemplateOption id="json" icon={FileJson} label="Upload JSON" />
                                <TemplateOption id="image" icon={Image} label="Image / PDF" />
                                <TemplateOption id="existing" icon={Copy} label="Clone Existing" />
                            </div>
                        </div>
                    )}

                    {/* Step 4: Configuration */}
                    {step === 4 && (
                        <div className="space-y-4 animate-in slide-in-from-right-8 duration-300">
                            <div className="text-center mb-4">
                                <h4 className="text-lg font-bold text-slate-800">
                                    {template === 'json' ? "Upload Configuration" : template === 'image' ? "Upload Assets" : "Select Source"}
                                </h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    {template === 'json' ? "Upload a valid JSON schema file." : template === 'image' ? "Upload reference images or PDFs." : "Choose a journey to clone."}
                                </p>
                            </div>
                            
                            {template === 'json' && (
                                <div 
                                    className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-sm transition-colors h-40 ${isDragOver ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300 bg-slate-50/50"} ${jsonFile ? "bg-green-50 border-green-200" : ""}`}
                                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                                    onDragLeave={() => setIsDragOver(false)}
                                    onDrop={handleDrop}
                                >
                                    {jsonFile ? (
                                        <div className="flex flex-col items-center gap-2 text-green-700 font-medium">
                                            <FileJson size={24} />
                                            <span className="truncate max-w-[200px] font-bold">{jsonFile.name}</span>
                                            <button onClick={() => setJsonFile(null)} className="text-xs hover:underline text-green-600">Remove</button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-slate-500 text-xs">Drag & drop JSON file here</span>
                                            <label htmlFor="json-upload" className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-50 shadow-sm">Browse Files</label>
                                            <input type="file" accept=".json" className="hidden" id="json-upload" onChange={handleFileSelect} />
                                        </div>
                                    )}
                                </div>
                            )}

                            {template === 'image' && (
                                <div 
                                    className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-sm transition-colors min-h-[160px] ${isDragOver ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300 bg-slate-50/50"}`}
                                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                                    onDragLeave={() => setIsDragOver(false)}
                                    onDrop={handleDrop}
                                >
                                    {imageFiles.length > 0 ? (
                                        <div className="flex flex-wrap gap-2 justify-center w-full max-h-[120px] overflow-y-auto custom-scrollbar p-2">
                                            {imageFiles.map((f, i) => (
                                                <div key={i} className="bg-white px-2 py-1 rounded-md border border-slate-200 flex items-center gap-2 shadow-sm text-xs">
                                                    <span className="truncate max-w-[100px] font-medium text-slate-600">{f.name}</span>
                                                    <button onClick={() => setImageFiles(files => files.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500"><X size={12}/></button>
                                                </div>
                                            ))}
                                            <label htmlFor="img-upload" className="px-2 py-1 bg-blue-50 border border-blue-100 rounded-md text-xs font-bold text-blue-600 cursor-pointer hover:bg-blue-100 flex items-center gap-1">
                                                <Plus size={12} /> Add
                                            </label>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="text-slate-500 text-xs">Drag images or PDFs here</span>
                                            <label htmlFor="img-upload" className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-50 shadow-sm">Browse Files</label>
                                        </div>
                                    )}
                                    <input type="file" accept="image/*,.pdf" multiple className="hidden" id="img-upload" onChange={handleFileSelect} />
                                </div>
                            )}

                            {template === 'existing' && (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <select 
                                            className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium appearance-none bg-white focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 pr-10 shadow-sm text-slate-700"
                                            value={sourceJourney}
                                            onChange={(e) => setSourceJourney(e.target.value)}
                                        >
                                            <option value="">Select source journey...</option>
                                            {allSourceOptions.map(j => (
                                                <option key={j} value={j}>{j}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>

                                    {/* Integration Filter for Admin */}
                                    {sourceJourney === 'Admin' && adminIntegrations.length > 0 && (
                                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="relative" ref={filterMenuRef}> 
                                                <button 
                                                    onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                                                    className="flex items-center justify-between w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white hover:bg-slate-50 transition-colors text-slate-600 font-medium shadow-sm"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Filter size={14} />
                                                        <span>
                                                            {selectedIntegrationFilters.length === 0 
                                                                ? "Filter by Integration (Optional)" 
                                                                : `${selectedIntegrationFilters.length} Integrations Selected`}
                                                        </span>
                                                    </div>
                                                    <ChevronDown size={14} className={cn("transition-transform", isFilterMenuOpen && "rotate-180")} />
                                                </button>

                                                {isFilterMenuOpen && (
                                                    <div className="absolute bottom-full left-0 w-full mb-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-[1000] max-h-48 overflow-y-auto custom-scrollbar p-1 animate-in fade-in zoom-in-95 duration-100 origin-bottom">
                                                        {adminIntegrations.map(int => {
                                                            const isSelected = selectedIntegrationFilters.includes(int.id);
                                                            return (
                                                                <div 
                                                                    key={int.id}
                                                                    onClick={() => toggleIntegrationFilter(int.id)}
                                                                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs mb-0.5 last:mb-0 select-none ${isSelected ? "bg-blue-50" : "hover:bg-slate-50"}`}
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? "bg-blue-600 border-blue-600" : "border-slate-300 bg-white"}`}>
                                                                            {isSelected && <Check size={10} className="text-white stroke-[3]" />}
                                                                        </div>
                                                                        <span 
                                                                            className="px-2 py-0.5 rounded text-[10px] font-bold border"
                                                                            style={{ backgroundColor: int.bg, color: int.text, borderColor: int.border }}
                                                                        >
                                                                                {int.label}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                        {selectedIntegrationFilters.length > 0 && (
                                                            <div className="border-t border-slate-100 mt-1 pt-1 p-1">
                                                                <button 
                                                                    onClick={() => { setSelectedIntegrationFilters([]); setIsFilterMenuOpen(false); }}
                                                                    className="w-full text-center py-1 text-[10px] text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
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
                                </div>
                            )}
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-xs border border-red-100 flex items-center gap-2 font-medium animate-in fade-in slide-in-from-top-2">
                            <AlertTriangle size={16} className="shrink-0" /> {error}
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 bg-white shrink-0 mt-auto relative z-10">
                    <button 
                        onClick={step === 1 ? onClose : handleBack}
                        className="px-4 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                        {step === 1 ? "Cancel" : <><ArrowLeft size={14} /> Back</>}
                    </button>
                    
                    <button 
                        onClick={step === 4 || (step === 3 && template === 'blank') ? handleSubmit : handleNext}
                        className={cn(
                            "px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-2",
                            "hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                        )}
                    >
                        {step === 4 || (step === 3 && template === 'blank') ? (
                            <>Create Journey <Plus size={14} /></>
                        ) : (
                            <>Next Step <ArrowRight size={14} /></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddJourneyModal;
