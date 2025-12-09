import React, { useState, useEffect } from 'react';
import { X, Upload, FileJson, Image, Copy, FileText, Plus, Filter, Check, ChevronDown, Shield, Layout } from 'lucide-react'; // Added Shield, Layout
import { cn } from '../utils/cn';

const DEFAULT_FIELDS = [
  { id: 1, label: "New Section", type: "heading", fma: false, mandatory: false }
];

const AddJourneyModal = ({ isOpen, onClose, onAdd, existingJourneys }) => {
    const [name, setName] = useState("");
    const [template, setTemplate] = useState("blank"); // blank, json, image, existing
    const [jsonFile, setJsonFile] = useState(null);
    const [imageFiles, setImageFiles] = useState([]);
    const [sourceJourney, setSourceJourney] = useState("");
    const [error, setError] = useState("");
    const [isDragOver, setIsDragOver] = useState(false);
    
    // Integration Filtering State
    const [adminIntegrations, setAdminIntegrations] = useState([]);
    const [selectedIntegrationFilters, setSelectedIntegrationFilters] = useState([]);

    // NEW State
    const [journeyType, setJourneyType] = useState("standard"); // NEW State

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setName("");
            setTemplate("blank");
            setJsonFile(null);
            setImageFiles([]);
            setSourceJourney("");
            setError("");
            setAdminIntegrations([]);
            setSelectedIntegrationFilters([]);
            setJourneyType("standard"); // Reset type
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

    const handleSubmit = async () => {
        setError("");
        const journeyName = name.trim();
        
        if (!journeyName) return setError("Journey name is required.");
        if (existingJourneys.includes(journeyName)) return setError("Journey name must be unique.");

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
                const data = localStorage.getItem(
                    sourceJourney === 'Admin' ? 'journey_data_Admin' : `journey_data_${sourceJourney}`
                );
                
                if (data) {
                    const parsed = JSON.parse(data);
                    let sourceFields = parsed.fields || DEFAULT_FIELDS;

                    // Filter logic for Admin
                    if (sourceJourney === 'Admin' && selectedIntegrationFilters.length > 0) {
                        initialFields = filterFieldsByIntegration(sourceFields, selectedIntegrationFilters);
                        if (initialFields.length === 0) throw new Error("No fields matched the selected integration filters.");
                    } else {
                        initialFields = sourceFields;
                    }
                } else if (sourceJourney === 'Admin') {
                    initialFields = DEFAULT_FIELDS; // Fallback
                }
            } else if (template === 'image') {
                if (imageFiles.length === 0) throw new Error("Please upload at least one image or PDF.");
            }

            // 1. Create Journey
            onAdd(journeyName, initialFields, journeyType);
            // 2. Close Modal (The parent should likely update state, but we can ensure closing logic here if needed via prop)
            // Note: App.jsx usually sets setIsAddModalOpen(false) inside onAdd, so this might be redundant but safe if onClose handles state properly.
            
        } catch (err) {
            setError(err.message || "Failed to process template.");
        }
    };

    const toggleIntegrationFilter = (id) => {
        setSelectedIntegrationFilters(prev => 
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
        );
    };

    const TemplateOption = ({ id, icon: Icon, label }) => (
        <div 
            onClick={() => { setTemplate(id); setError(""); }}
            className={cn(
                "flex flex-col items-center justify-center p-2 rounded-lg border cursor-pointer transition-all h-16 text-center",
                template === id 
                    ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm" 
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600"
            )}
        >
            <Icon size={16} className="mb-1 opacity-80" />
            <span className="text-[10px] font-bold">{label}</span>
        </div>
    );

    const allSourceOptions = ['Admin', ...existingJourneys.filter(j => j !== 'Admin')];

    return (
        <div 
            className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm"
            onClick={(e) => {
                // Close if clicking backdrop
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div 
                className="bg-white rounded-lg shadow-2xl p-0 w-[480px] animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()} // Prevent click from bubbling to backdrop
            >
                <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-sm font-bold text-gray-800">Create New Journey</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors"><X size={14} className="text-gray-500" /></button>
                </div>

                <div className="p-4 space-y-4 overflow-y-auto">
                    {/* Name Input */}
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Journey Name</label>
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Mortgage Application v2" 
                            className="w-full border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all"
                            autoFocus
                        />
                    </div>

                    {/* NEW: Journey Type Selection */}
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Journey Type</label>
                        <div className="grid grid-cols-2 gap-2">
                            <div 
                                onClick={() => setJourneyType("standard")}
                                className={cn(
                                    "flex items-center gap-2 p-2 rounded border cursor-pointer transition-all",
                                    journeyType === "standard" 
                                        ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm" 
                                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600"
                                )}
                            >
                                <div className={cn("w-3 h-3 rounded-full border flex items-center justify-center", journeyType === "standard" ? "border-blue-600 bg-blue-600" : "border-gray-400 bg-white")}>
                                    {journeyType === "standard" && <div className="w-1 h-1 bg-white rounded-full" />}
                                </div>
                                <Layout size={14} className="opacity-80" />
                                <span className="text-[10px] font-bold">Standard Journey</span>
                            </div>

                            <div 
                                onClick={() => setJourneyType("admin")}
                                className={cn(
                                    "flex items-center gap-2 p-2 rounded border cursor-pointer transition-all",
                                    journeyType === "admin" 
                                        ? "border-purple-500 bg-purple-50 text-purple-700 shadow-sm" 
                                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600"
                                )}
                            >
                                <div className={cn("w-3 h-3 rounded-full border flex items-center justify-center", journeyType === "admin" ? "border-purple-600 bg-purple-600" : "border-gray-400 bg-white")}>
                                    {journeyType === "admin" && <div className="w-1 h-1 bg-white rounded-full" />}
                                </div>
                                <Shield size={14} className="opacity-80" />
                                <span className="text-[10px] font-bold">Admin Journey</span>
                            </div>
                        </div>
                    </div>

                    {/* Template Selection */}
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Start From</label>
                        <div className="grid grid-cols-4 gap-2">
                            <TemplateOption id="blank" icon={FileText} label="Blank" />
                            <TemplateOption id="json" icon={FileJson} label="JSON" />
                            <TemplateOption id="image" icon={Image} label="Image/PDF" />
                            <TemplateOption id="existing" icon={Copy} label="Existing" />
                        </div>
                    </div>

                    {/* Dynamic Content Area */}
                    <div className="min-h-[80px]">
                        {template === 'json' && (
                            <div 
                                className={cn(
                                    "border-2 border-dashed rounded-lg p-3 flex flex-col items-center justify-center text-xs transition-colors h-20",
                                    isDragOver ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                                    jsonFile ? "bg-green-50 border-green-200" : ""
                                )}
                                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                                onDragLeave={() => setIsDragOver(false)}
                                onDrop={handleDrop}
                            >
                                {jsonFile ? (
                                    <div className="flex items-center gap-2 text-green-700">
                                        <FileJson size={16} />
                                        <span className="font-medium truncate max-w-[200px]">{jsonFile.name}</span>
                                        <button onClick={() => setJsonFile(null)} className="ml-2 hover:text-red-600"><X size={12}/></button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-500">Drop JSON or</span>
                                        <label htmlFor="json-upload" className="px-2 py-0.5 bg-white border border-gray-300 rounded text-[10px] font-bold text-gray-600 cursor-pointer hover:bg-gray-50 shadow-sm">Select File</label>
                                        <input type="file" accept=".json" className="hidden" id="json-upload" onChange={handleFileSelect} />
                                    </div>
                                )}
                            </div>
                        )}

                        {template === 'image' && (
                            <div 
                                className={cn(
                                    "border-2 border-dashed rounded-lg p-2 flex flex-col items-center justify-center text-xs transition-colors min-h-[80px]",
                                    isDragOver ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                )}
                                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                                onDragLeave={() => setIsDragOver(false)}
                                onDrop={handleDrop}
                            >
                                {imageFiles.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5 justify-center w-full max-h-[60px] overflow-y-auto custom-scrollbar">
                                        {imageFiles.map((f, i) => (
                                            <div key={i} className="bg-white px-1.5 py-0.5 rounded border border-gray-200 flex items-center gap-1 shadow-sm">
                                                <span className="truncate max-w-[60px] text-[9px]">{f.name}</span>
                                                <button onClick={() => setImageFiles(files => files.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500"><X size={10}/></button>
                                            </div>
                                        ))}
                                        <label htmlFor="img-upload" className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[9px] font-bold text-gray-600 cursor-pointer hover:bg-gray-200 flex items-center gap-1">
                                            <Plus size={8} />
                                        </label>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-500">Drop Images/PDFs or</span>
                                        <label htmlFor="img-upload" className="px-2 py-0.5 bg-white border border-gray-300 rounded text-[10px] font-bold text-gray-600 cursor-pointer hover:bg-gray-50 shadow-sm">Browse</label>
                                    </div>
                                )}
                                <input type="file" accept="image/*,.pdf" multiple className="hidden" id="img-upload" onChange={handleFileSelect} />
                            </div>
                        )}

                        {template === 'existing' && (
                            <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 flex flex-col justify-center gap-2 min-h-[80px]">
                                <div>
                                    <div className="relative">
                                        <select 
                                            className="w-full p-1.5 border border-gray-300 rounded text-xs appearance-none bg-white focus:outline-none focus:border-blue-500 pr-8"
                                            value={sourceJourney}
                                            onChange={(e) => setSourceJourney(e.target.value)}
                                        >
                                            <option value="">Select journey to copy...</option>
                                            {allSourceOptions.map(j => (
                                                <option key={j} value={j}>{j}</option>
                                            ))}
                                        </select>
                                        <Copy size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Integration Filter for Admin */}
                                {sourceJourney === 'Admin' && adminIntegrations.length > 0 && (
                                    <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                        <div className="flex items-center gap-1 mb-1.5">
                                            <Filter size={10} className="text-gray-400" />
                                            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Filter by Integration</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 max-h-[60px] overflow-y-auto custom-scrollbar">
                                            {adminIntegrations.map(int => {
                                                const isSelected = selectedIntegrationFilters.includes(int.id);
                                                return (
                                                    <button
                                                        key={int.id}
                                                        onClick={() => toggleIntegrationFilter(int.id)}
                                                        className={cn(
                                                            "flex items-center gap-1 px-2 py-0.5 rounded border text-[9px] font-bold transition-all select-none",
                                                            isSelected ? "ring-1 ring-offset-1 shadow-sm" : "opacity-60 hover:opacity-100 bg-white"
                                                        )}
                                                        style={{
                                                            backgroundColor: isSelected ? int.bg : 'white',
                                                            color: isSelected ? int.text : 'gray',
                                                            borderColor: isSelected ? int.border : '#e5e7eb',
                                                            '--tw-ring-color': int.border
                                                        }}
                                                    >
                                                        {int.label}
                                                        {isSelected && <Check size={8} strokeWidth={3} />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <div className="text-[9px] text-gray-400 mt-1 italic">
                                            {selectedIntegrationFilters.length === 0 
                                                ? "Copying entire Admin form" 
                                                : "Copying only fields matching selected integrations"}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {template === 'blank' && (
                            <div className="h-20 flex items-center justify-center text-gray-300 text-xs italic border border-transparent">
                                Start blank
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 px-3 py-1.5 rounded text-[10px] border border-red-100 flex items-center gap-1.5">
                            <X size={10} /> {error}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50/50 rounded-b-lg">
                    <button 
                        onClick={onClose}
                        className="px-3 py-1.5 text-gray-500 hover:bg-gray-200 rounded text-xs font-bold transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSubmit}
                        className="px-4 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-bold transition-colors shadow-sm"
                    >
                        Create
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddJourneyModal;
