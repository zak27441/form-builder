import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Plus, X, AlertTriangle, Trash2 } from 'lucide-react'; 
import TreeNavigation from './components/TreeNavigation';
import ControlPanel from './components/ControlPanel';
import FormCanvas from './components/FormCanvas';
import FormPreview from './components/FormPreview';
import JsonPreview from './components/JsonPreview';
import AddJourneyModal from './components/AddJourneyModal'; // Imported
import SpreadsheetView from './components/SpreadsheetView';

// Initial default field for new journeys
const DEFAULT_FIELDS = [
  { id: 1, label: "New Section", type: "heading", fma: false, mandatory: false }
];

function App() {
  const [fields, setFields] = useState([]); // Start empty until journey selected
  const [journeys, setJourneys] = useState([]); 
  const [selectedJourney, setSelectedJourney] = useState(null); // Start null
  const [mode, setMode] = useState("Edit"); 
  const [subMode, setSubMode] = useState("DIP"); 
  
  // Dirty State Tracking
  const [isDirty, setIsDirty] = useState(false);
  const [pendingJourney, setPendingJourney] = useState(null); // For navigation guard
  
  // UI State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSavePromptOpen, setIsSavePromptOpen] = useState(false); // Navigation guard modal
  // Removed newJourneyName state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // New State for Deletion
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  const dropdownRef = useRef(null);
  const [activeHeadingId, setActiveHeadingId] = useState(null);

  // Load journeys from local storage on mount
  useEffect(() => {
    const savedJourneys = Object.keys(localStorage)
        .filter(key => key.startsWith('journey_data_'))
        .map(key => key.replace('journey_data_', ''));
    
    if (savedJourneys.length > 0) {
        setJourneys(savedJourneys);
    }
  }, []);

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
        // Fallback or fresh start if data missing but name exists
        setFields(DEFAULT_FIELDS); 
    }
    setSelectedJourney(journeyName);
    setIsDirty(false); // Reset dirty state after load
    setMode("Edit"); // Always switch to Edit mode
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
        saveJourneyData(); // Save current
    }
    loadJourney(pendingJourney); // Switch
    setIsSavePromptOpen(false);
    setPendingJourney(null);
  };

  const discardAndSwitch = () => {
    loadJourney(pendingJourney); // Switch without saving
    setIsSavePromptOpen(false);
    setPendingJourney(null);
  };

  const saveJourneyData = () => {
    if (!selectedJourney) return;
    
    const dataToSave = {
        journey: selectedJourney,
        fields: fields,
        timestamp: new Date().toISOString()
    };
    localStorage.setItem(`journey_data_${selectedJourney}`, JSON.stringify(dataToSave));
    setIsDirty(false);
    console.log("Saved:", selectedJourney);
  };

  // Updated Handler
  const handleAddJourney = (name, initialFields) => {
    const updatedJourneys = [...journeys, name];
    setJourneys(updatedJourneys);
    
    const initialData = {
        journey: name,
        fields: initialFields,
        timestamp: new Date().toISOString()
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
        const updatedJourneys = journeys.filter(j => j !== selectedJourney);
        setJourneys(updatedJourneys);
        
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

  return (
    <div className="min-h-screen bg-[#bdc5c9] p-6 flex flex-col font-sans relative">
      {/* Header */}
      <header className="flex items-center justify-between mb-8 px-4">
        <div className="text-gray-500 text-3xl font-bold tracking-tight">Google</div>
        
        <div className="flex items-center gap-2">
          <span className="text-gray-800 text-lg mr-2">Journey:</span>
          
          <div className="relative" ref={dropdownRef}>
              <div 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="bg-white rounded-md shadow-sm px-4 py-2 min-w-[300px] flex items-center justify-between text-gray-600 cursor-pointer border border-gray-200 hover:border-gray-300 transition-colors select-none"
              >
                {selectedJourney || "Select Journey"}
                <ChevronDown 
                    size={16} 
                    className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
                />
              </div>
              
              {isDropdownOpen && (
                  <div className="absolute top-full left-0 w-full bg-white mt-1 rounded-md shadow-lg border border-gray-100 z-50 max-h-60 overflow-auto animate-in fade-in zoom-in-95 duration-100">
                      {journeys.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-400 text-center italic">
                              No journeys yet. Add one +
                          </div>
                      ) : (
                          journeys.map(j => (
                              <div 
                                key={j} 
                                className={`px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm ${selectedJourney === j ? 'font-semibold text-blue-600 bg-blue-50' : 'text-gray-700'}`}
                                onClick={() => attemptSwitchJourney(j)}
                              >
                                  {j}
                              </div>
                          ))
                      )}
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

          {/* NEW: Delete Button (Only show if a journey is selected) */}
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
        
        <div className="w-[100px]"></div> 
      </header>

      {/* Save Confirmation Modal (Navigation Guard) */}
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

      {/* REPLACED ADD JOURNEY MODAL */}
      <AddJourneyModal 
          isOpen={isAddModalOpen} 
          onClose={() => setIsAddModalOpen(false)} 
          onAdd={handleAddJourney}
          existingJourneys={journeys}
      />

      {/* NEW: Delete Journey Modal */}
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
      {/* Added translate-x-[50px] to move everything RIGHT */}
      <main className="flex flex-1 gap-6 max-w-[1150px] mx-auto translate-x-[50px] w-full items-start h-[calc(100vh-140px)]">
        
        {selectedJourney ? (
            mode === 'Edit' ? (
                <FormCanvas 
                    fields={fields} 
                    setFields={handleFieldChange} 
                />
            ) : mode === 'JSON' ? (
                <JsonPreview data={fields} journeyName={selectedJourney} />
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
                // Add missing props
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
