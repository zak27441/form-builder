import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Plus, X, AlertTriangle, Trash2, Menu, Key, Settings, Shield } from 'lucide-react'; 
import TreeNavigation from './components/TreeNavigation';
import ControlPanel from './components/ControlPanel';
import FormCanvas from './components/FormCanvas';
import FormPreview from './components/FormPreview';
import JsonPreview from './components/JsonPreview';
import AddJourneyModal from './components/AddJourneyModal'; 
import SpreadsheetView from './components/SpreadsheetView';
import AccountSettings from './components/AccountSettings'; 
import AdminContextMenu from './components/AdminContextMenu'; 

const DEFAULT_FIELDS = [
  { id: 1, label: "New Section", type: "heading", fma: false, mandatory: false }
];

// No longer treating "Admin" as a special undeletable constant, but still useful for defaults
const ADMIN_JOURNEY_NAME = "Admin"; 

function App() {
  const [fields, setFields] = useState([]); 
  // Change: journeys is now array of objects { name, type }
  const [journeys, setJourneys] = useState([]); 
  const [selectedJourney, setSelectedJourney] = useState(null); 
  const [mode, setMode] = useState("Edit"); 
  const [subMode, setSubMode] = useState("DIP"); 
  
  // Dirty State Tracking
  const [isDirty, setIsDirty] = useState(false);
  const [pendingJourney, setPendingJourney] = useState(null); 
  
  // UI State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSavePromptOpen, setIsSavePromptOpen] = useState(false); 
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  const dropdownRef = useRef(null);
  const [activeHeadingId, setActiveHeadingId] = useState(null);

  // Helper to get journey type from local storage safely
  const getJourneyType = (name) => {
      try {
          const data = localStorage.getItem(`journey_data_${name}`);
          if (data) {
              const parsed = JSON.parse(data);
              return parsed.type || 'standard';
          }
      } catch (e) { return 'standard'; }
      return 'standard';
  };

  // Load journeys from local storage on mount
  useEffect(() => {
    // 1. Ensure original Admin exists if not
    if (!localStorage.getItem(`journey_data_${ADMIN_JOURNEY_NAME}`)) {
        const initialData = {
            journey: ADMIN_JOURNEY_NAME,
            fields: DEFAULT_FIELDS,
            timestamp: new Date().toISOString(),
            type: 'admin' // Explicitly set original Admin as admin type
        };
        localStorage.setItem(`journey_data_${ADMIN_JOURNEY_NAME}`, JSON.stringify(initialData));
    }

    // 2. Load all journeys
    const keys = Object.keys(localStorage).filter(key => key.startsWith('journey_data_'));
    const loadedJourneys = keys.map(key => {
        const name = key.replace('journey_data_', '');
        const type = getJourneyType(name);
        return { name, type };
    });
    
    // Sort: Admin first, then others
    loadedJourneys.sort((a, b) => {
        if (a.name === ADMIN_JOURNEY_NAME) return -1;
        if (b.name === ADMIN_JOURNEY_NAME) return 1;
        return a.name.localeCompare(b.name);
    });

    setJourneys(loadedJourneys);
  }, []);

  // Determine current journey type
  const currentJourney = journeys.find(j => j.name === selectedJourney);
  const isAdminMode = currentJourney?.type === 'admin';

  // Close dropdown logic
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Detect changes to fields to set dirty state
  useEffect(() => {
    if (selectedJourney && fields.length > 0) {
        // Simple dirty check
    }
  }, [fields]);

  // Wrapper for setFields to mark as dirty
  const handleFieldChange = (newFields) => {
      setFields(newFields);
      setIsDirty(true);
  };

  // Load journey data
  const loadJourney = (journeyName) => {
    const savedData = localStorage.getItem(`journey_data_${journeyName}`);
    if (savedData) {
        const parsed = JSON.parse(savedData);
        setFields(parsed.fields || []);
    } else {
        setFields(DEFAULT_FIELDS); 
    }
    setSelectedJourney(journeyName);
    setIsDirty(false); 
    setMode("Edit"); 
  };

  // Navigation Guard Logic
  const attemptSwitchJourney = (targetJourney) => {
    if (targetJourney === selectedJourney) return;

    if (isDirty) {
        setPendingJourney(targetJourney);
        setIsSavePromptOpen(true);
        setIsDropdownOpen(false);
    } else {
        loadJourney(targetJourney);
        setIsDropdownOpen(false);
    }
  };

  const saveCurrentAndSwitch = () => {
    if (selectedJourney) {
        saveJourneyData(); 
    }
    loadJourney(pendingJourney); 
    setIsSavePromptOpen(false);
    setPendingJourney(null);
  };

  const discardAndSwitch = () => {
    loadJourney(pendingJourney); 
    setIsSavePromptOpen(false);
    setPendingJourney(null);
  };

  const saveJourneyData = () => {
    if (!selectedJourney) return;
    
    // Preserve type
    const type = currentJourney?.type || 'standard';

    const dataToSave = {
        journey: selectedJourney,
        fields: fields,
        timestamp: new Date().toISOString(),
        type: type // Save type
    };
    localStorage.setItem(`journey_data_${selectedJourney}`, JSON.stringify(dataToSave));
    setIsDirty(false);
    console.log("Saved:", selectedJourney);
  };

  // Updated Handler
  const handleAddJourney = (name, initialFields, type = 'standard') => {
    // Check for duplicate name
    if (journeys.some(j => j.name === name)) {
        alert("A journey with this name already exists.");
        return;
    }

    const newJourneyObj = { name, type };
    setJourneys(prev => [...prev, newJourneyObj]);
    
    const initialData = {
        journey: name,
        fields: initialFields,
        timestamp: new Date().toISOString(),
        type: type
    };
    localStorage.setItem(`journey_data_${name}`, JSON.stringify(initialData));
    
    if (isDirty) {
        setPendingJourney(name);
        setIsSavePromptOpen(true);
    } else {
        loadJourney(name);
    }

    setIsAddModalOpen(false);
  };

  // Delete Journey Logic
  const handleDeleteJourney = () => {
    if (deleteConfirmationText === "DELETE" && selectedJourney) {
        // 1. Remove from Local Storage
        localStorage.removeItem(`journey_data_${selectedJourney}`);
        
        // 2. Remove from State
        setJourneys(prev => prev.filter(j => j.name !== selectedJourney));
        
        // 3. Reset Selection
        setSelectedJourney(null);
        setFields([]);
        setIsDirty(false);
        
        // 4. Close Modal & Reset
        setIsDeleteModalOpen(false);
        setDeleteConfirmationText("");
    }
  };

  // Helper to scroll to field
  const scrollToField = (fieldId) => {
    const element = document.getElementById(`field-${fieldId}`);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const standardJourneys = journeys.filter(j => j.type !== 'admin');
  const adminJourneys = journeys.filter(j => j.type === 'admin');

  return (
    <div className="min-h-screen bg-[#bdc5c9] p-6 flex flex-col font-sans relative">
      {/* Backdrop for Dropdown */}
      {isDropdownOpen && (
        <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity" 
            onClick={() => setIsDropdownOpen(false)}
        />
      )}

      {/* Header */}
      <header className="flex items-center justify-between mb-8 px-4 relative z-50">
        <div className="text-gray-500 text-3xl font-bold tracking-tight">Google</div>
        
        <div className="flex items-center gap-2">
          <span className="text-gray-800 text-lg mr-2">Journey:</span>
          
          <div className="relative" ref={dropdownRef}>
              <div 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`bg-white rounded-md shadow-sm px-4 py-2 min-w-[300px] flex items-center justify-between text-gray-600 cursor-pointer border transition-colors select-none relative
                    ${isDropdownOpen ? 'border-blue-500 ring-2 ring-blue-100 z-50' : 'border-gray-200 hover:border-gray-300'}
                `}
              >
                {selectedJourney || "Select Journey"}
                <ChevronDown 
                    size={16} 
                    className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
                />
              </div>
              
              {isDropdownOpen && (
                  <div className="absolute top-full left-0 w-[600px] bg-white mt-2 rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden flex animate-in fade-in zoom-in-95 duration-150 origin-top-left">
                      {/* Left Column: Standard */}
                      <div className="flex-1 flex flex-col border-r border-gray-100">
                          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                              Standard Journeys
                          </div>
                          <div className="max-h-[400px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
                              {standardJourneys.length === 0 ? (
                                  <div className="p-4 text-center text-gray-400 text-xs italic">No standard journeys</div>
                              ) : (
                                  standardJourneys.map(j => (
                                      <div 
                                        key={j.name}
                                        onClick={() => attemptSwitchJourney(j.name)}
                                        className={`px-3 py-2 rounded-lg cursor-pointer text-sm transition-all border border-transparent
                                            ${selectedJourney === j.name 
                                                ? 'bg-gray-100 text-gray-900 font-bold shadow-sm border-gray-200' 
                                                : 'hover:bg-gray-50 text-gray-600 hover:border-gray-100'}
                                        `}
                                      >
                                          {j.name}
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>

                      {/* Right Column: Admin */}
                      <div className="flex-1 flex flex-col bg-slate-50/50">
                          <div className="px-4 py-2.5 bg-slate-100/50 border-b border-slate-200/50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Shield size={10} />
                                Admin Journeys
                          </div>
                          <div className="max-h-[400px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
                              {adminJourneys.length === 0 ? (
                                  <div className="p-4 text-center text-slate-400 text-xs italic">No admin journeys</div>
                              ) : (
                                  adminJourneys.map(j => (
                                      <div 
                                        key={j.name}
                                        onClick={() => attemptSwitchJourney(j.name)}
                                        className={`px-3 py-2 rounded-lg cursor-pointer text-sm transition-all border border-transparent flex items-center justify-between group
                                            ${selectedJourney === j.name 
                                                ? 'bg-white text-slate-800 font-bold shadow-sm border-slate-200' 
                                                : 'hover:bg-white text-slate-600 hover:shadow-sm hover:border-slate-100'}
                                        `}
                                      >
                                          <span>{j.name}</span>
                                          {selectedJourney === j.name && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>
                  </div>
              )}
          </div>

          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-white p-2 rounded-md shadow-sm border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors"
            title="Add New Journey"
          >
            <Plus size={20} />
          </button>

          {/* Delete Button - Allowed for ALL journeys now */}
          {selectedJourney && (
            <button 
                onClick={() => setIsDeleteModalOpen(true)}
                className="bg-white p-2 rounded-md shadow-sm border border-gray-200 hover:bg-red-50 text-red-500 transition-colors ml-1"
                title="Delete Journey"
            >
                <Trash2 size={20} />
            </button>
          )}
        </div>
        
        <div className="w-[150px] flex justify-end">
             <AccountSettings />
        </div> 
      </header>

      {/* Save Confirmation Modal */}
      {isSavePromptOpen && (
        <div 
            className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center backdrop-blur-sm"
            onClick={() => setIsSavePromptOpen(false)} 
        >
            <div 
                className="bg-white rounded-lg shadow-xl p-6 w-[400px] animate-in fade-in zoom-in-95 duration-200 text-center"
                onClick={(e) => e.stopPropagation()} 
            >
                <div className="flex flex-col items-center gap-3 mb-4 text-amber-600">
                    <AlertTriangle size={32} />
                    <h3 className="text-lg font-semibold text-gray-800">Unsaved Changes</h3>
                </div>
                <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                    You have unsaved changes in <strong>{selectedJourney}</strong>. Do you want to save them before switching?
                </p>
                <div className="flex justify-center gap-3">
                    <button 
                        onClick={discardAndSwitch}
                        className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium transition-colors"
                    >
                        Don't Save
                    </button>
                    <button 
                        onClick={saveCurrentAndSwitch}
                        className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm font-medium transition-colors"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Add Journey Modal - Pass simplified existingJourneys (names only) */}
      <AddJourneyModal 
          isOpen={isAddModalOpen} 
          onClose={() => setIsAddModalOpen(false)} 
          onAdd={handleAddJourney}
          existingJourneys={journeys.map(j => j.name)} 
      />

      {/* Delete Journey Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[120] flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl p-6 w-[400px] animate-in fade-in zoom-in-95 duration-200 text-center">
                <div className="flex flex-col items-center gap-3 mb-4 text-red-600">
                    <AlertTriangle size={32} />
                    <h3 className="text-lg font-semibold text-gray-800">Delete Journey</h3>
                </div>
                <p className="text-gray-600 mb-4 text-sm">
                    Are you sure you want to delete <strong>{selectedJourney}</strong>? This action cannot be undone.
                </p>
                
                <div className="mb-6">
                    <label className="block text-xs text-gray-500 mb-1 text-left">Type "DELETE" to confirm:</label>
                    <input 
                        type="text" 
                        value={deleteConfirmationText}
                        onChange={(e) => setDeleteConfirmationText(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        placeholder="DELETE"
                    />
                </div>

                <div className="flex justify-end gap-3">
                    <button 
                        onClick={() => {
                            setIsDeleteModalOpen(false);
                            setDeleteConfirmationText("");
                        }}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md text-sm font-medium transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleDeleteJourney}
                        disabled={deleteConfirmationText !== "DELETE"}
                        className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Delete Permanently
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Main Grid */}
      <main className="flex flex-1 gap-6 max-w-[1150px] mx-auto translate-x-[50px] w-full items-start h-[calc(100vh-140px)]">
        
        {selectedJourney ? (
            mode === 'Edit' ? (
                <FormCanvas 
                    fields={fields} 
                    setFields={handleFieldChange} 
                    isAdminJourney={isAdminMode} // Use dynamic check
                />
            ) : mode === 'JSON' ? (
                <JsonPreview data={fields} />
            ) : mode === 'Spreadsheet' ? (
                <SpreadsheetView fields={fields} />
            ) : (
                <FormPreview 
                    fields={fields} 
                    subMode={subMode} 
                />
            )
        ) : (
            <div className="flex-1 bg-white shadow-2xl flex flex-col items-center justify-center rounded-xl h-full text-gray-400">
                <p className="text-lg font-medium">Select or create a journey to start editing</p>
            </div>
        )}
        
        {selectedJourney && (
            <ControlPanel 
                onSave={saveJourneyData} 
                mode={mode} 
                setMode={setMode} 
                subMode={subMode} 
                setSubMode={setSubMode}
                selectedJourney={selectedJourney}
                isDirty={isDirty}
                fields={fields}
            />
        )}
      </main>
    </div>
  );
}

export default App;
