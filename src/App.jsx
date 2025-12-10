import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Plus, Trash2, Shield, Loader2, LogOut, Layout, AlertTriangle } from 'lucide-react'; 
// FIREBASE IMPORTS
import { auth, db } from './firebase'; 
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore'; // Added setDoc, deleteDoc, onSnapshot
import Login from './components/Login';

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

const ADMIN_JOURNEY_NAME = "Admin"; 

function App() {
  // --- AUTH STATE ---
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false); 
  const [accessLoading, setAccessLoading] = useState(false); 
  const [isSuperAdmin, setIsSuperAdmin] = useState(false); 
  
  // User Role State
  const [userRole, setUserRole] = useState('editor'); 

  // --- APP STATE ---
  const [fields, setFields] = useState([]); 
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

  // --- 1. LISTEN FOR AUTH CHANGES ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
          setAccessLoading(true);
          try {
              // 1. Get Admin Team ID
              const teamsColl = collection(db, "teams");
              const adminTeamQuery = query(teamsColl, where("label", "==", "Admin"));
              const adminTeamSnap = await getDocs(adminTeamQuery);
              let adminTeamId = null;
              if (!adminTeamSnap.empty) {
                  adminTeamId = adminTeamSnap.docs[0].id;
              }

              // 2. Check User Memberships
              const teamsRef = collection(db, "team_members");
              const q = query(teamsRef, where("email", "==", currentUser.email));
              const snapshot = await getDocs(q);
              
              const isHardcodedAdmin = currentUser.email === "zak.parkin@gmail.com"; 

              if (!snapshot.empty || isHardcodedAdmin) {
                  setHasAccess(true);
              } else {
                  setHasAccess(false);
              }

              // 3. Super Admin Check
              if (isHardcodedAdmin) {
                  setIsSuperAdmin(true);
              } else if (adminTeamId && !snapshot.empty) {
                  const inAdminTeam = snapshot.docs.some(doc => doc.data().teamId === adminTeamId);
                  setIsSuperAdmin(inAdminTeam);
              } else {
                  setIsSuperAdmin(false);
              }

              // Fetch User Role
              try {
                  const userDocRef = doc(db, "users", currentUser.uid);
                  const userSnap = await getDoc(userDocRef);
                  if (userSnap.exists()) {
                      const r = userSnap.data().role || 'editor';
                      setUserRole(r);
                      if (r === 'reader') setMode('Preview');
                  }
              } catch (e) {
                  console.error("Error fetching user role:", e);
              }

          } catch (e) {
              console.error("Error checking access:", e);
              setHasAccess(false); 
          }
          setAccessLoading(false);
      }
      
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    signOut(auth).then(() => {
      setUser(null);
      setHasAccess(false); 
      // localStorage.clear(); // Don't clear local storage anymore as we depend on Firebase
      window.location.href = '/'; 
    }).catch(error => {
      console.error("Error signing out:", error);
    });
  };

  // --- FIREBASE: LOAD JOURNEYS ---
  useEffect(() => {
    if (!user) return;

    // Listen to 'journeys' collection
    const q = collection(db, "journeys");
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const loadedJourneys = snapshot.docs.map(doc => ({ 
            id: doc.id, // Firestore Doc ID
            ...doc.data() 
        }));
        
        // Ensure Admin Journey exists
        const adminExists = loadedJourneys.some(j => j.name === ADMIN_JOURNEY_NAME);
        if (!adminExists && isSuperAdmin) {
            // Create default admin journey if missing
             setDoc(doc(db, "journeys", ADMIN_JOURNEY_NAME), {
                name: ADMIN_JOURNEY_NAME,
                fields: DEFAULT_FIELDS,
                timestamp: new Date().toISOString(),
                type: 'admin',
                createdBy: 'system'
            });
        }

        // Sort: Admin first, then others
        loadedJourneys.sort((a, b) => {
            if (a.name === ADMIN_JOURNEY_NAME) return -1;
            if (b.name === ADMIN_JOURNEY_NAME) return 1;
            return a.name.localeCompare(b.name);
        });

        setJourneys(loadedJourneys);
        
        // If we are currently viewing a journey, update its fields from the live data
        // (Optional: this makes it real-time collaborative, but might interrupt editing. 
        // For now, let's only update the list, but if the selected journey is deleted, handle it)
        if (selectedJourney && !loadedJourneys.find(j => j.name === selectedJourney)) {
            setSelectedJourney(null);
            setFields([]);
        }
    });

    return () => unsubscribe();
  }, [user, isSuperAdmin, selectedJourney]);


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

  // Load journey data FROM STATE (sourced from Firebase)
  const loadJourney = (journeyName) => {
    const journeyData = journeys.find(j => j.name === journeyName);
    
    if (journeyData) {
        setFields(journeyData.fields || []);
    } else {
        setFields(DEFAULT_FIELDS); 
    }
    
    setSelectedJourney(journeyName);
    setIsDirty(false); 
    
    // Respect User Role when loading
    setMode(userRole === 'reader' ? "Preview" : "Edit"); 
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

  const saveCurrentAndSwitch = async () => {
    if (selectedJourney) {
        await saveJourneyData(); 
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

  // --- FIREBASE: SAVE JOURNEY ---
  const saveJourneyData = async () => {
    if (!selectedJourney) return;
    
    const journeyObj = journeys.find(j => j.name === selectedJourney);
    if (!journeyObj) return;

    try {
        // Sanitize fields to remove 'undefined' values which Firestore rejects
        const cleanFields = JSON.parse(JSON.stringify(fields));

        await setDoc(doc(db, "journeys", journeyObj.name), {
            name: selectedJourney,
            fields: cleanFields, // Use sanitized fields
            timestamp: new Date().toISOString(),
            type: journeyObj.type || 'standard',
            lastModifiedBy: user.email
        }, { merge: true });

        setIsDirty(false);
        console.log("Saved to Firebase:", selectedJourney);
    } catch (e) {
        console.error("Error saving journey:", e);
        alert("Failed to save changes to Firebase: " + e.message);
    }
  };

  // --- FIREBASE: ADD JOURNEY ---
  const handleAddJourney = async (name, initialFields, type = 'standard') => {
    // Check for duplicate name in current state
    if (journeys.some(j => j.name === name)) {
        alert("A journey with this name already exists.");
        return;
    }

    try {
        // Sanitize initial fields as well
        const cleanFields = JSON.parse(JSON.stringify(initialFields));

        await setDoc(doc(db, "journeys", name), {
            name: name,
            fields: cleanFields,
            timestamp: new Date().toISOString(),
            type: type,
            createdBy: user.email
        });

        if (isDirty) {
            setPendingJourney(name);
            setIsSavePromptOpen(true);
        } else {
            setSelectedJourney(name);
            setFields(initialFields);
            setIsDirty(false);
            setMode(userRole === 'reader' ? "Preview" : "Edit");
        }

        setIsAddModalOpen(false);
    } catch (e) {
        console.error("Error creating journey:", e);
        alert("Failed to create journey.");
    }
  };

  // --- FIREBASE: DELETE JOURNEY ---
  const handleDeleteJourney = async () => {
    if (deleteConfirmationText === "DELETE" && selectedJourney) {
        try {
            await deleteDoc(doc(db, "journeys", selectedJourney));
            
            // Reset Selection
            setSelectedJourney(null);
            setFields([]);
            setIsDirty(false);
            
            // Close Modal & Reset
            setIsDeleteModalOpen(false);
            setDeleteConfirmationText("");
        } catch (e) {
            console.error("Error deleting journey:", e);
            alert("Failed to delete journey.");
        }
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

  // --- 2. HANDLE LOADING STATE ---
  if (authLoading || (user && accessLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#bdc5c9]">
        <Loader2 className="animate-spin text-gray-500" size={48} />
      </div>
    );
  }

  // --- 3. SHOW LOGIN IF NO USER ---
  if (!user) {
    return <Login />;
  }

  // --- NEW: ACCESS DENIED SCREEN ---
  if (!hasAccess) {
      return (
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden font-sans text-slate-200">
              {/* Subtle Background */}
              <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
              
              <div className="relative z-10 max-w-md">
                  <div className="mb-8 flex justify-center">
                    <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-2xl">
                        <Shield size={40} className="text-indigo-500" strokeWidth={1.5} />
                    </div>
                  </div>
                  
                  <h1 className="text-3xl font-bold text-white mb-4 tracking-tight">Access Pending</h1>
                  
                  <p className="text-slate-400 text-sm leading-relaxed mb-8 border-b border-slate-800 pb-8">
                      Your account has been created, but you need to be added to a team before you can access the Form Builder. 
                      <br/><br/>
                      Please contact an administrator to grant you access.
                  </p>

                  <div className="flex flex-col items-center gap-4">
                      <div className="text-xs font-mono bg-slate-900 py-2 px-4 rounded-full border border-slate-800 text-slate-500">
                          {user.email}
                      </div>
                      
                      <button 
                          onClick={handleLogout}
                          className="flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:underline mt-4 transition-all"
                      >
                          <LogOut size={12} /> Sign Out
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  // --- 4. MAIN APP (If Logged In) ---
  
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans relative overflow-hidden">
      {/* --- BACKGROUND SHAPES (Subtler version) --- */}
      <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-blue-100/40 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-sky-100/40 rounded-full blur-3xl pointer-events-none"></div>

      {/* Backdrop for Dropdown */}
      {isDropdownOpen && (
        <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity" 
            onClick={() => setIsDropdownOpen(false)}
        />
      )}

      {/* HEADER - ALWAYS VISIBLE */}
      <header className="flex items-center justify-between mb-2 px-6 pt-6 relative z-50">
        <div className="flex items-center gap-6">
             {/* --- NEW LOGO --- */}
             <div className="text-2xl font-bold tracking-tight text-[#1e293b] font-brand flex items-center gap-2 cursor-default select-none -mt-4">
                <Layout className="text-blue-600" size={26} strokeWidth={2.5} />
                FormBuilder
             </div>
        </div>

        {/* Journey Selector - CENTERED */}
        <div className="absolute left-1/2 top-6 -translate-x-1/2 flex items-center gap-2">
            <div className="relative" ref={dropdownRef}>
                <div 
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className={`bg-white rounded-xl shadow-[0_6px_12px_-4px_rgba(0,0,0,0.15)] px-4 py-2 min-w-[260px] flex items-center justify-between text-slate-600 cursor-pointer border transition-all select-none relative
                        ${isDropdownOpen ? 'border-blue-500 ring-2 ring-blue-100 z-50' : 'border-slate-200 hover:border-slate-300 hover:shadow-[0_8px_16px_-4px_rgba(0,0,0,0.2)]'}
                    `}
                >
                    <span className="text-sm font-medium">{selectedJourney || "Select a Journey..."}</span>
                    <ChevronDown 
                        size={16} 
                        className={`transition-transform duration-200 text-slate-400 ${isDropdownOpen ? 'rotate-180 text-blue-500' : ''}`} 
                    />
                </div>
                
                {isDropdownOpen && (
                    <div className={`absolute top-full left-1/2 -translate-x-1/2 ${isSuperAdmin ? 'w-[600px]' : 'w-[300px]'} bg-white mt-2 rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden flex animate-in fade-in zoom-in-95 duration-150 origin-top`}>
                        <div className={`flex-1 flex flex-col ${isSuperAdmin ? 'border-r border-slate-100' : ''}`}>
                            <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Standard Journeys
                            </div>
                            <div className="max-h-[400px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                {standardJourneys.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 text-xs italic">No standard journeys yet</div>
                                ) : (
                                    standardJourneys.map(j => (
                                        <div 
                                            key={j.name}
                                            onClick={() => attemptSwitchJourney(j.name)}
                                            className={`px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-all border border-transparent
                                                ${selectedJourney === j.name 
                                                    ? 'bg-blue-50 text-blue-700 font-bold shadow-sm border-blue-100' 
                                                    : 'hover:bg-slate-50 text-slate-600 hover:border-slate-100'}
                                            `}
                                        >
                                            {j.name}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {isSuperAdmin && (
                            <div className="flex-1 flex flex-col bg-slate-50/50">
                                <div className="px-4 py-3 bg-slate-100/50 border-b border-slate-200/50 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                        <Shield size={10} />
                                        Admin Journeys
                                </div>
                                <div className="max-h-[400px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                    {adminJourneys.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400 text-xs italic">No admin journeys yet</div>
                                    ) : (
                                        adminJourneys.map(j => (
                                            <div 
                                                key={j.name}
                                                onClick={() => attemptSwitchJourney(j.name)}
                                                className={`px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-all border border-transparent flex items-center justify-between group
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
                        )}
                    </div>
                )}
            </div>

            {isSuperAdmin && (
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-200 hover:border-blue-300 hover:text-blue-600 text-slate-400 transition-all"
                    title="Add New Journey"
                >
                    <Plus size={20} />
                </button>
            )}

            {isSuperAdmin && selectedJourney && (
                <button 
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-500 text-slate-400 transition-all ml-1"
                    title="Delete Journey"
                >
                    <Trash2 size={20} />
                </button>
            )}
         </div>
        
        <div className="flex items-center gap-4">
             <AccountSettings user={user} isSuperAdmin={isSuperAdmin} />
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
      <main className="flex flex-1 gap-6 max-w-[1200px] mx-auto w-full items-start h-[calc(100vh-140px)] px-6 relative z-10">
        
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
            // --- NEW EMPTY STATE ---
            <div className="flex-1 h-full flex flex-col items-center justify-center text-center p-12">
                <div className="w-24 h-24 bg-white rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] flex items-center justify-center mb-8 rotate-3 transition-transform hover:rotate-6 duration-500">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                        <Plus size={24} strokeWidth={3} />
                    </div>
                </div>
                <h2 className="text-3xl font-bold text-slate-800 mb-3 tracking-tight">No Journey Selected</h2>
                <p className="text-slate-500 max-w-md text-sm leading-relaxed mb-8">
                    Select an existing journey from the dropdown menu above, or create a new one to start building your form workflow.
                </p>
                <div className="flex items-center gap-3">
                    {/* "Open Menu" triggers the same state as clicking the dropdown itself */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsDropdownOpen(true); }}
                        className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-sm hover:border-slate-300 hover:shadow-md transition-all flex items-center gap-2"
                    >
                        <ChevronDown size={14} /> Open Menu
                    </button>
                    {isSuperAdmin && (
                        <button 
                            onClick={() => setIsAddModalOpen(true)}
                            className="px-5 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2"
                        >
                            <Plus size={14} /> Create New
                        </button>
                    )}
                </div>
                <div className="mt-12 text-[10px] font-medium bg-slate-100/50 text-slate-400 px-4 py-2 rounded-full border border-slate-100 flex items-center gap-2">
                    <Shield size={12} /> Authenticated as {user.email}
                </div>
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
                userRole={userRole} // NEW: Pass the role
            />
        )}
      </main>
    </div>
  );
}

export default App;
