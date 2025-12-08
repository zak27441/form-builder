import React, { useState } from 'react';
import { X, Upload, FileJson, Image, Copy, FileText } from 'lucide-react';
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

    if (!isOpen) return null;

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

                // Support multiple formats
                let fields = [];
                // Format 1: Root array (Legacy)
                if (Array.isArray(data)) {
                    fields = data;
                } 
                // Format 2: Object with 'fields' (Standard)
                else if (data.fields && Array.isArray(data.fields)) {
                    fields = data.fields;
                } 
                // Format 3: Object with 'schema' (New Metadata Format)
                else if (data.schema && Array.isArray(data.schema)) {
                    fields = data.schema;
                } 
                else {
                    throw new Error("Invalid JSON structure. Expected 'fields' array or 'schema' array.");
                }
                
                // Validate field items
                if (fields.length > 0) {
                    const invalidField = fields.find(f => !f.id || !f.type || !f.label);
                    if (invalidField) {
                        throw new Error("Invalid field data found (missing id, type, or label).");
                    }
                }
                initialFields = fields;

            } else if (template === 'existing' && sourceJourney) {
                const data = localStorage.getItem(`journey_data_${sourceJourney}`);
                if (data) {
                    const parsed = JSON.parse(data);
                    initialFields = parsed.fields || DEFAULT_FIELDS;
                }
            } else if (template === 'image') {
                // Just pass empty/default for now, maybe log file info
                if (imageFiles.length === 0) throw new Error("Please upload at least one image or PDF.");
                console.log("Template images:", imageFiles);
            }

            onAdd(journeyName, initialFields);
            
            // Reset form
            setName("");
            setTemplate("blank");
            setJsonFile(null);
            setImageFiles([]);
            setSourceJourney("");
        } catch (err) {
            setError(err.message || "Failed to process template.");
        }
    };

    const TemplateOption = ({ id, icon: Icon, label, subtext }) => (
        <div 
            onClick={() => { setTemplate(id); setError(""); }}
            className={cn(
                "flex flex-col items-center justify-center p-4 rounded-lg border-2 cursor-pointer transition-all h-24 text-center",
                template === id 
                    ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm scale-[1.02]" 
                    : "border-gray-100 hover:border-gray-200 hover:bg-gray-50 text-gray-600"
            )}
        >
            <Icon size={20} className="mb-2 opacity-80" />
            <span className="text-xs font-bold">{label}</span>
            {subtext && <span className="text-[10px] opacity-60 mt-0.5">{subtext}</span>}
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl p-0 w-[600px] animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-lg font-bold text-gray-800">Create New Journey</h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors"><X size={18} className="text-gray-500" /></button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">
                    {/* Name Input */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Journey Name</label>
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Mortgage Application v2" 
                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                            autoFocus
                        />
                    </div>

                    {/* Template Selection */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Start From</label>
                        <div className="grid grid-cols-4 gap-3">
                            <TemplateOption id="blank" icon={FileText} label="Blank" />
                            <TemplateOption id="json" icon={FileJson} label="JSON" subtext="Import Schema" />
                            <TemplateOption id="image" icon={Image} label="Image/PDF" subtext="Upload Assets" />
                            <TemplateOption id="existing" icon={Copy} label="Existing" subtext="Clone Journey" />
                        </div>
                    </div>

                    {/* Dynamic Content Area */}
                    <div className="min-h-[140px]">
                        {template === 'json' && (
                            <div 
                                className={cn(
                                    "border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-sm transition-colors h-32",
                                    isDragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400 hover:bg-gray-50",
                                    jsonFile ? "bg-green-50 border-green-200" : ""
                                )}
                                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                                onDragLeave={() => setIsDragOver(false)}
                                onDrop={handleDrop}
                            >
                                {jsonFile ? (
                                    <div className="flex flex-col items-center gap-2 text-green-700">
                                        <FileJson size={32} />
                                        <span className="font-medium">{jsonFile.name}</span>
                                        <button onClick={() => setJsonFile(null)} className="text-xs underline hover:text-green-800">Remove</button>
                                    </div>
                                ) : (
                                    <>
                                        <Upload size={24} className="text-gray-400 mb-2" />
                                        <p className="text-gray-600 font-medium">Drop JSON file here</p>
                                        <input type="file" accept=".json" className="hidden" id="json-upload" onChange={handleFileSelect} />
                                        <label htmlFor="json-upload" className="mt-2 px-4 py-1.5 bg-white border border-gray-300 rounded-md text-xs font-bold text-gray-600 cursor-pointer hover:bg-gray-50 shadow-sm">Select File</label>
                                    </>
                                )}
                            </div>
                        )}

                        {template === 'image' && (
                            <div 
                                className={cn(
                                    "border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-sm transition-colors min-h-[128px]",
                                    isDragOver ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                                )}
                                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                                onDragLeave={() => setIsDragOver(false)}
                                onDrop={handleDrop}
                            >
                                {imageFiles.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 justify-center w-full">
                                        {imageFiles.map((f, i) => (
                                            <div key={i} className="bg-white px-3 py-1.5 rounded-md text-xs flex items-center gap-2 border border-gray-200 shadow-sm">
                                                <span className="truncate max-w-[100px]">{f.name}</span>
                                                <button onClick={() => setImageFiles(files => files.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500"><X size={12}/></button>
                                            </div>
                                        ))}
                                        <label htmlFor="img-upload" className="px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-md text-xs font-bold text-gray-600 cursor-pointer hover:bg-gray-200 flex items-center gap-1">
                                            <Upload size={12} /> Add More
                                        </label>
                                    </div>
                                ) : (
                                    <>
                                        <Image size={24} className="text-gray-400 mb-2" />
                                        <p className="text-gray-600 font-medium">Drop Images or PDFs here</p>
                                        <label htmlFor="img-upload" className="mt-2 px-4 py-1.5 bg-white border border-gray-300 rounded-md text-xs font-bold text-gray-600 cursor-pointer hover:bg-gray-50 shadow-sm">Browse Files</label>
                                    </>
                                )}
                                <input type="file" accept="image/*,.pdf" multiple className="hidden" id="img-upload" onChange={handleFileSelect} />
                            </div>
                        )}

                        {template === 'existing' && (
                            <div className="p-6 border border-gray-200 rounded-xl bg-gray-50 h-32 flex flex-col justify-center">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Source Journey</label>
                                <div className="relative">
                                    <select 
                                        className="w-full p-2.5 border border-gray-300 rounded-lg text-sm appearance-none bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                        value={sourceJourney}
                                        onChange={(e) => setSourceJourney(e.target.value)}
                                    >
                                        <option value="">Select a journey to copy...</option>
                                        {existingJourneys.map(j => (
                                            <option key={j} value={j}>{j}</option>
                                        ))}
                                    </select>
                                    <Copy size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        )}
                        
                        {template === 'blank' && (
                            <div className="h-32 flex items-center justify-center text-gray-400 text-sm italic border border-transparent">
                                Start with a clean slate
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm border border-red-100 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                            <div className="bg-red-100 p-1 rounded-full"><X size={12} className="text-red-600"/></div>
                            {error}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm font-bold transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSubmit}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold transition-colors shadow-md hover:shadow-lg transform active:scale-95"
                    >
                        Create Journey
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddJourneyModal;
