import React, { useState, useRef, useEffect } from 'react';
import { Menu, Key, Plus, ChevronLeft, Save, Trash2, Settings, X, UserPlus, Copy, Check, Loader2, User, Camera, LogOut, Lock, Eye, EyeOff, Search, UserMinus, ShieldAlert, Users } from 'lucide-react'; 
import { createPortal } from 'react-dom';
import { db, auth } from '../firebase'; 
import { collection, addDoc, onSnapshot, query, where, updateDoc, doc, deleteDoc, getDocs, setDoc } from 'firebase/firestore'; 
import { signOut, updatePassword } from 'firebase/auth';

// Helper for pastel colors (Integrations)
const getPastelColor = (index) => {
    const hues = [210, 150, 330, 270, 30, 190, 45, 290]; 
    const hue = hues[index % hues.length];
    return {
        bg: `hsl(${hue}, 90%, 96%)`,
        text: `hsl(${hue}, 80%, 30%)`,
        border: `hsl(${hue}, 80%, 85%)`
    };
};

// Helper for Team styles (Grey)
const getTeamStyle = () => ({
    bg: '#f3f4f6', 
    text: '#374151', 
    border: '#d1d5db' 
});

const AccountSettings = ({ user, isSuperAdmin }) => { 
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState('menu'); 
  
  // --- Profile Modal State ---
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Track original values for change detection
  const [originalProfile, setOriginalProfile] = useState({ firstName: "Zak", lastName: "Parkin" });
  const [originalImage, setOriginalImage] = useState(null);

  const [profileForm, setProfileForm] = useState({ firstName: "Zak", lastName: "Parkin", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [profileImage, setProfileImage] = useState(null); 

  // --- REAL DATA STATE ---
  const [teams, setTeams] = useState([]);
  const [teamUsers, setTeamUsers] = useState({}); // Map of teamId -> users[]
  
  const [integrations, setIntegrations] = useState([]); 

  // --- NEW USER MANAGEMENT STATE ---
  const [allUsers, setAllUsers] = useState([]);
  const [userTeamsMap, setUserTeamsMap] = useState({});
  const [managingUser, setManagingUser] = useState(null); // User currently being managed via Gear icon
  const [userSearchTerm, setUserSearchTerm] = useState(""); // Specific search for Users view

  const [newIntegrationName, setNewIntegrationName] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [managingTeam, setManagingTeam] = useState(null);
  const [inviteForm, setInviteForm] = useState({ firstName: "", lastName: "", email: "" });
  const [deleteUserConfirm, setDeleteUserConfirm] = useState(null);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Search State for Team Manager
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const buttonRef = useRef(null);
  const profilePillRef = useRef(null); 
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [profilePosition, setProfilePosition] = useState({ top: 0, right: 0 }); 

  // Sync User to Firestore on Mount
  useEffect(() => {
      const syncUser = async () => {
          if (user) {
              const userRef = doc(db, "users", user.uid);
              const userSnap = await getDoc(userRef);
              
              if (!userSnap.exists()) {
                  await setDoc(userRef, {
                      uid: user.uid,
                      email: user.email,
                      firstName: "Zak", 
                      lastName: "Parkin" 
                  });
              } else {
                  const data = userSnap.data();
                  setProfileForm(prev => ({ ...prev, firstName: data.firstName || "", lastName: data.lastName || "" }));
                  
                  if (data.photoURL) {
                      setProfileImage(data.photoURL);
                      setOriginalImage(data.photoURL);
                  }
                  
                  setOriginalProfile({ firstName: data.firstName || "", lastName: data.lastName || "" });
              }
          }
      };
      syncUser();
  }, [user]);

  // Update position when view changes
  useEffect(() => {
      if (isAdminMenuOpen && buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect();
          const isWide = activeView === 'integrations' || activeView === 'teams' || activeView === 'users';
          setMenuPosition({
              top: rect.bottom + 8,
              left: rect.right - (isWide ? 320 : 240)
          });
      }
  }, [activeView, isAdminMenuOpen]); 

  // --- FIREBASE: LOAD TEAMS ---
  useEffect(() => {
    if (!user) return;

    const q = collection(db, "teams");
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const loadedTeams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        loadedTeams.sort((a, b) => {
            if (a.label === 'Admin') return -1;
            if (b.label === 'Admin') return 1;
            return a.label.localeCompare(b.label);
        });
        
        setTeams(loadedTeams);
    });
    return () => unsubscribe();
  }, [user]);

  // --- FIREBASE: LOAD INTEGRATIONS ---
  useEffect(() => {
    const q = collection(db, "integrations");
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        loaded.sort((a, b) => a.label.localeCompare(b.label));
        setIntegrations(loaded);
    });
    return () => unsubscribe();
  }, []);

  // --- FIREBASE: LOAD USERS FOR ADMIN VIEW ---
  useEffect(() => {
      // Only run if we are in a view that needs this data and user is admin
      if (!isSuperAdmin || (activeView !== 'users' && activeView !== 'menu')) return;
      
      const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
          const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          loaded.sort((a, b) => (a.firstName || "").localeCompare(b.firstName || ""));
          setAllUsers(loaded);
      });

      const unsubMembers = onSnapshot(collection(db, "team_members"), (snap) => {
          const mapping = {};
          snap.docs.forEach(d => {
              const data = d.data();
              if (!mapping[data.uid]) mapping[data.uid] = [];
              mapping[data.uid].push({ teamId: data.teamId, docId: d.id }); // Store docId for deletion
          });
          setUserTeamsMap(mapping);
      });

      return () => { unsubUsers(); unsubMembers(); };
  }, [activeView, isSuperAdmin]);

  // --- FIREBASE: LOAD USERS FOR MANAGED TEAM ---
  useEffect(() => {
      if (!managingTeam) return;

      const q = query(collection(db, "team_members"), where("teamId", "==", managingTeam.id));
      const unsubscribe = onSnapshot(q, (snapshot) => {
          const members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setTeamUsers(prev => ({ ...prev, [managingTeam.id]: members }));
      });
      return () => unsubscribe();
  }, [managingTeam]);

  // --- SEARCH EFFECT ---
  useEffect(() => {
      if (!searchTerm || searchTerm.length < 2) {
          setSearchResults([]);
          return;
      }

      const doSearch = async () => {
          setIsSearching(true);
          try {
              const usersRef = collection(db, "users");
              const q = query(
                  usersRef, 
                  where("email", ">=", searchTerm), 
                  where("email", "<=", searchTerm + '\uf8ff')
              );
              
              const snapshot = await getDocs(q);
              const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              
              const currentMemberEmails = (teamUsers[managingTeam?.id] || []).map(m => m.email);
              const filtered = users.filter(u => !currentMemberEmails.includes(u.email));
              
              setSearchResults(filtered);
          } catch (e) {
              console.error("Search failed:", e);
          }
          setIsSearching(false);
      };

      const timer = setTimeout(doSearch, 500);
      return () => clearTimeout(timer);
  }, [searchTerm, managingTeam, teamUsers]);

  // --- HANDLERS ---

  const toggleAdminMenu = () => {
      if (!isAdminMenuOpen && buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect();
          const isWide = activeView === 'integrations' || activeView === 'teams' || activeView === 'users';
          setMenuPosition({
              top: rect.bottom + 8,
              left: rect.right - (isWide ? 320 : 240)
          });
      }
      setIsAdminMenuOpen(!isAdminMenuOpen);
  };

  const handleLogout = async () => {
      await signOut(auth);
      window.location.reload();
  };

  const handleUpdateProfile = async () => {
      if (profileForm.password) {
          if (profileForm.password !== profileForm.confirmPassword) {
              alert("Passwords do not match!");
              return;
          }
          try {
              await updatePassword(user, profileForm.password);
              alert("Password updated!");
          } catch (e) {
              alert("Error updating password: " + e.message);
              return;
          }
      }
      
      setOriginalProfile({ firstName: profileForm.firstName, lastName: profileForm.lastName });
      setOriginalImage(profileImage);
      
      if (user) {
          try {
              await setDoc(doc(db, "users", user.uid), {
                  uid: user.uid,
                  email: user.email,
                  firstName: profileForm.firstName,
                  lastName: profileForm.lastName,
                  photoURL: profileImage
              }, { merge: true });
          } catch (e) { console.error(e); }
      }
      
      setProfileForm(prev => ({ ...prev, password: "", confirmPassword: "" }));
      setIsProfileOpen(false);
  };

  const handleImageUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setProfileImage(reader.result);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleAddTeam = async () => {
      if (!newTeamName.trim()) return;
      setLoading(true);
      try {
          await addDoc(collection(db, "teams"), {
              label: newTeamName,
              ...getTeamStyle(),
              createdBy: user.email,
              createdAt: new Date().toISOString()
          });
          setNewTeamName("");
      } catch (e) {
          console.error(e);
          alert("Failed to add team");
      }
      setLoading(false);
  };

  const deleteTeam = async (teamId) => {
      if (!window.confirm("Delete this team?")) return;
      try {
          await deleteDoc(doc(db, "teams", teamId));
      } catch (e) { console.error(e); }
  };

  const saveTeamEdit = async () => {
      if (!editName.trim() || !editingId) return;
      try {
          await updateDoc(doc(db, "teams", editingId), { label: editName });
          setEditingId(null);
      } catch (e) { console.error(e); }
  };

  const handleAddUserToTeam = async (targetUser, specificTeamId = null) => {
      const tId = specificTeamId || managingTeam?.id;
      if (!tId) return;
      try {
          await addDoc(collection(db, "team_members"), {
              teamId: tId,
              uid: targetUser.id || targetUser.uid, // Handle different user object structures
              firstName: targetUser.firstName || "",
              lastName: targetUser.lastName || "",
              email: targetUser.email,
              photoURL: targetUser.photoURL || null,
              initials: targetUser.firstName && targetUser.lastName ? `${targetUser.firstName[0]}${targetUser.lastName[0]}`.toUpperCase() : targetUser.email.substring(0,2).toUpperCase(),
              addedBy: user.email,
              addedAt: new Date().toISOString()
          });
          setSearchTerm("");
      } catch (e) {
          console.error(e);
          alert("Failed to add user");
      }
  };

  const handleRemoveUser = async (memberId) => {
      try {
          await deleteDoc(doc(db, "team_members", memberId));
          setDeleteUserConfirm(null);
      } catch (e) { console.error(e); }
  };

  const handleAddIntegration = async () => {
      if (!newIntegrationName.trim()) return;
      try {
          await addDoc(collection(db, "integrations"), {
              label: newIntegrationName,
              ...getPastelColor(integrations.length),
              createdAt: new Date().toISOString()
          });
          setNewIntegrationName("");
      } catch (e) { console.error(e); }
  };

  const saveIntegrationEdit = async () => {
      if (!editName.trim() || !editingId) return;
      try {
          await updateDoc(doc(db, "integrations", editingId), { label: editName });
          setEditingId(null);
      } catch (e) { console.error(e); }
  };

  const deleteIntegration = async (id) => { 
      if (!window.confirm("Delete this integration?")) return;
      try {
          await deleteDoc(doc(db, "integrations", id));
      } catch (e) { console.error(e); }
  };

  const startEditing = (item) => { if (item.fixed) return; setEditingId(item.id); setEditName(item.label); };

  const openTeamManager = (team) => {
      setManagingTeam(team);
      setInviteForm({ firstName: "", lastName: "", email: "" });
      setSearchTerm("");
      setSearchResults([]);
  };

  const openUserTeamManager = (targetUser) => {
      setManagingUser(targetUser);
  };

  const toggleUserExpand = (userId) => {
    setExpandedUserId(expandedUserId === userId ? null : userId);
  };

  const handleCopyEmail = (e, email, id) => {
      e.stopPropagation();
      navigator.clipboard.writeText(email);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDeleteUserGlobal = async (userId) => {
      // Confirmation handled in modal
      try {
          await deleteDoc(doc(db, "users", userId));
          // Delete from team_members
          const q = query(collection(db, "team_members"), where("uid", "==", userId));
          const snap = await getDocs(q);
          snap.docs.forEach(d => deleteDoc(d.ref));
          setManagingUser(null);
      } catch (e) { console.error(e); }
  };

  // NEW: Update User Role
  const handleUpdateUserRole = async (userId, newRole) => {
      try {
          await updateDoc(doc(db, "users", userId), { role: newRole });
      } catch (e) {
          console.error("Failed to update role:", e);
          alert("Failed to update role");
      }
  };

  const resetMenu = () => {
      setIsAdminMenuOpen(false);
      setTimeout(() => setActiveView('menu'), 200);
  };

  const handleOpenProfile = () => {
      if (profilePillRef.current) {
          const rect = profilePillRef.current.getBoundingClientRect();
          setProfilePosition({
              top: rect.bottom + 12, 
              right: window.innerWidth - rect.right
          });
      }
      setProfileForm(prev => ({ ...prev, password: "", confirmPassword: "" }));
      setShowPassword(false);
      setIsProfileOpen(true);
  };

  const hasChanges = 
      profileForm.firstName !== originalProfile.firstName ||
      profileForm.lastName !== originalProfile.lastName ||
      (profileForm.password !== "" && profileForm.password === profileForm.confirmPassword) ||
      profileImage !== originalImage;

  const initials = (profileForm.firstName && profileForm.lastName) 
      ? `${profileForm.firstName[0]}${profileForm.lastName[0]}`.toUpperCase()
      : (user?.email?.substring(0,2).toUpperCase() || "ZP");

  const getUserTeamNames = (uid) => {
      const userTeams = userTeamsMap[uid] || [];
      return userTeams.map(item => teams.find(t => t.id === item.teamId)?.label).filter(Boolean);
  };

  // Filter users based on search
  const filteredAllUsers = allUsers.filter(u => {
      if (!userSearchTerm) return true;
      const lower = userSearchTerm.toLowerCase();
      const name = `${u.firstName} ${u.lastName}`.toLowerCase();
      const email = u.email?.toLowerCase() || "";
      return name.includes(lower) || email.includes(lower);
  });

  // NEW: Derive the live user data for the modal
  const managingUserLive = managingUser ? (allUsers.find(u => u.id === managingUser.id) || managingUser) : null;

  return (
    <div className="flex flex-col items-end gap-1.5 relative z-50">
      <div 
        ref={profilePillRef}
        onClick={handleOpenProfile}
        className="bg-gray-100 rounded-full pl-0.5 pr-2 py-0.5 flex items-center gap-2 shadow-sm border border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors select-none"
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-[10px] shadow-sm uppercase overflow-hidden">
          {profileImage ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover" /> : initials}
        </div>
        <Menu size={14} className="text-gray-500" />
      </div>

      {isSuperAdmin && (
        <button 
          ref={buttonRef}
          onClick={toggleAdminMenu}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors group select-none"
        >
          <Key size={12} className="text-gray-400 group-hover:text-gray-600" />
          <span className="text-xs font-medium border-b border-gray-300 group-hover:border-gray-600 pb-px">Admin World</span>
        </button>
      )}

      {isProfileOpen && createPortal(
          <div className="fixed inset-0 z-[10000]">
              <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" onClick={() => setIsProfileOpen(false)} />
              
              <div 
                  className="absolute bg-white/60 backdrop-blur-2xl rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] border border-white/40 w-[320px] animate-in zoom-in-95 duration-200 z-10 overflow-hidden flex flex-col origin-top-right ring-1 ring-white/60"
                  style={{ top: profilePosition.top, right: profilePosition.right }}
              >
                  <div className="px-4 py-3 flex justify-between items-center border-b border-white/20 bg-white/10">
                      <span className="font-bold text-sm text-gray-800 tracking-tight">Account Details</span>
                      <button onClick={() => setIsProfileOpen(false)} className="text-gray-500 hover:text-gray-800 hover:bg-white/40 rounded-full p-1 transition-colors"><X size={14} /></button>
                  </div>

                  <div className="p-5 space-y-5">
                      <div className="flex flex-col items-center">
                          <div className="relative group cursor-pointer">
                              <div className="w-20 h-20 rounded-full bg-white/30 border border-white/60 shadow-inner flex items-center justify-center overflow-hidden hover:scale-105 transition-all duration-300">
                                  {profileImage ? (
                                      <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                                  ) : (
                                      <User size={32} className="text-gray-400" />
                                  )}
                              </div>
                              <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 rounded-full transition-opacity pointer-events-none backdrop-blur-sm">
                                  <Camera size={20} className="text-white drop-shadow-md" />
                              </div>
                          </div>
                          <button className="text-[10px] text-blue-600 font-bold mt-2 hover:text-blue-700 hover:underline uppercase tracking-wider">Change Photo</button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                              <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wide ml-1">First Name</label>
                              <input 
                                  type="text" 
                                  value={profileForm.firstName}
                                  onChange={(e) => setProfileForm({...profileForm, firstName: e.target.value})}
                                  className="w-full text-xs font-medium bg-white/40 border border-white/40 rounded-xl px-3 py-2 outline-none focus:bg-white/60 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/10 transition-all placeholder:text-gray-400 shadow-sm"
                              />
                          </div>
                          <div className="space-y-1">
                              <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wide ml-1">Last Name</label>
                              <input 
                                  type="text" 
                                  value={profileForm.lastName}
                                  onChange={(e) => setProfileForm({...profileForm, lastName: e.target.value})}
                                  className="w-full text-xs font-medium bg-white/40 border border-white/40 rounded-xl px-3 py-2 outline-none focus:bg-white/60 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/10 transition-all placeholder:text-gray-400 shadow-sm"
                              />
                          </div>
                      </div>

                      <div className="space-y-2">
                          <div className="space-y-1">
                              <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wide ml-1 flex items-center gap-1">
                                  New Password <span className="font-normal text-gray-400 normal-case tracking-normal opacity-70">(Optional)</span>
                              </label>
                              <div className="relative">
                                  <Lock size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                  <input 
                                      type={showPassword ? "text" : "password"}
                                      placeholder="New password"
                                      value={profileForm.password}
                                      onChange={(e) => setProfileForm({...profileForm, password: e.target.value})}
                                      className="w-full text-xs bg-white/40 border border-white/40 rounded-xl pl-9 pr-8 py-2 outline-none focus:bg-white/60 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/10 transition-all placeholder:text-gray-400 shadow-sm"
                                  />
                                  <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                      {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                                  </button>
                              </div>
                          </div>
                          
                          {profileForm.password && (
                              <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wide ml-1">
                                      Confirm Password
                                  </label>
                                  <div className="relative">
                                      <Lock size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                      <input 
                                          type={showPassword ? "text" : "password"}
                                          placeholder="Re-enter password"
                                          value={profileForm.confirmPassword}
                                          onChange={(e) => setProfileForm({...profileForm, confirmPassword: e.target.value})}
                                          className={`w-full text-xs bg-white/40 border rounded-xl pl-9 pr-3 py-2 outline-none focus:bg-white/60 focus:ring-2 transition-all placeholder:text-gray-400 shadow-sm ${
                                              profileForm.confirmPassword && profileForm.password !== profileForm.confirmPassword 
                                              ? "border-red-300 focus:border-red-400 focus:ring-red-400/10" 
                                              : "border-white/40 focus:border-blue-400/50 focus:ring-blue-400/10"
                                          }`}
                                      />
                                      {profileForm.confirmPassword && (
                                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                              {profileForm.password === profileForm.confirmPassword ? (
                                                  <Check size={12} className="text-green-500" />
                                              ) : (
                                                  <X size={12} className="text-red-500" />
                                              )}
                                          </div>
                                      )}
                                  </div>
                              </div>
                          )}
                      </div>

                      <div className="pt-2 flex flex-col gap-2">
                          {hasChanges && (
                              <button 
                                  onClick={handleUpdateProfile}
                                  className="w-full bg-blue-600/90 hover:bg-blue-600 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] text-xs flex items-center justify-center gap-2 backdrop-blur-sm animate-in fade-in zoom-in-95"
                              >
                                  <Save size={14} /> Save Changes
                              </button>
                          )}
                          
                          <button 
                              onClick={handleLogout}
                              className="w-full text-gray-500 hover:text-red-600 hover:bg-red-50/50 py-2 rounded-xl transition-colors text-[10px] font-bold flex items-center justify-center gap-1.5"
                          >
                              <LogOut size={12} /> Sign Out
                          </button>
                      </div>
                  </div>
              </div>
          </div>,
          document.body
      )}

      {isSuperAdmin && isAdminMenuOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-start">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={resetMenu} />
            
            <div 
                className={`absolute bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-[10000] animate-in fade-in zoom-in-95 duration-200 origin-top-right transition-all ease-in-out`}
                style={{ 
                    top: menuPosition.top, 
                    left: menuPosition.left,
                    width: (activeView === 'integrations' || activeView === 'teams' || activeView === 'users') ? '320px' : '240px'
                }}
            >
                <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 mb-1 text-gray-500">
                    {activeView !== 'menu' ? (
                        <button onClick={() => setActiveView('menu')} className="hover:text-gray-800 transition-colors mr-1"><ChevronLeft size={14} /></button>
                    ) : <Key size={12} />}
                    <span className="text-xs font-semibold underline">
                        {activeView === 'integrations' ? 'Manage Integrations' : activeView === 'teams' ? 'Manage Teams' : activeView === 'users' ? 'Manage Users' : 'Admin World'}
                    </span>
                </div>
                
                {activeView === 'menu' && (
                    <div className="flex flex-col gap-1">
                        <div className="flex flex-col gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors group/tm cursor-pointer" onClick={() => setActiveView('teams')}>
                            <div className="text-left text-sm text-gray-700 font-medium flex justify-between items-center w-full">
                                Teams
                                <span className="text-[10px] text-gray-400 group-hover/tm:text-blue-500 font-normal">Edit</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {teams.length === 0 && <span className="text-[10px] text-gray-400 italic">No teams yet</span>}
                                {teams.slice(0, 3).map(t => (
                                    <span key={t.id} className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border shadow-sm" style={{ backgroundColor: t.bg, color: t.text, borderColor: t.border }}>
                                        {t.label}
                                    </span>
                                ))}
                                {teams.length > 3 && <span className="text-[10px] text-gray-400">+{teams.length - 3}</span>}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors group/int cursor-pointer" onClick={() => setActiveView('integrations')}>
                            <div className="text-left text-sm text-gray-700 font-medium flex justify-between items-center w-full">
                                Integrations
                                <span className="text-[10px] text-gray-400 group-hover/int:text-blue-500 font-normal">Edit</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {integrations.map(int => (
                                    <span key={int.id} className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border shadow-sm" style={{ backgroundColor: int.bg, color: int.text, borderColor: int.border }}>{int.label}</span>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors group/users cursor-pointer" onClick={() => setActiveView('users')}>
                            <div className="text-left text-sm text-gray-700 font-medium flex justify-between items-center w-full">
                                Users
                                <span className="text-[10px] text-gray-400 group-hover/users:text-blue-500 font-normal">Edit</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="flex -space-x-1">
                                    {allUsers.slice(0, 3).map(u => (
                                        <div key={u.id} className="w-4 h-4 rounded-full bg-gray-200 ring-1 ring-white overflow-hidden flex items-center justify-center text-[8px] font-bold text-gray-500">
                                            {u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover" /> : (u.firstName?.[0] || u.email?.[0] || "?")}
                                        </div>
                                    ))}
                                </div>
                                {allUsers.length > 3 && <span className="text-[10px] text-gray-400">+{allUsers.length - 3}</span>}
                            </div>
                        </div>
                    </div>
                )}

                {activeView === 'users' && (
                    <div className="flex flex-col h-full">
                        {/* SEARCH USERS IN VIEW */}
                        <div className="px-2 pt-2 pb-2">
                             <div className="relative">
                                <input 
                                    type="text" 
                                    placeholder="Search users..." 
                                    className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 pl-7 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/10 transition-all bg-gray-50 focus:bg-white" 
                                    value={userSearchTerm} 
                                    onChange={e => setUserSearchTerm(e.target.value)} 
                                />
                                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                        </div>

                        <div className="p-2 space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pt-0">
                            {filteredAllUsers.map(u => (
                                <div key={u.id} className="flex items-center justify-between p-2 bg-white border border-gray-100 rounded-lg shadow-sm hover:border-gray-300 transition-all group">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden border border-blue-100">
                                            {u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover" /> : `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs font-bold text-gray-800 truncate">{u.firstName} {u.lastName}</span>
                                            <span className="text-[10px] text-gray-500 truncate">{u.email}</span>
                                            
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {getUserTeamNames(u.id).length === 0 ? (
                                                    <span className="text-[9px] text-gray-400 italic">No teams</span>
                                                ) : (
                                                    getUserTeamNames(u.id).map(teamName => (
                                                        <span key={teamName} className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                                                            {teamName}
                                                        </span>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => openUserTeamManager(u)}
                                        className="p-1.5 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                                        title="Manage User & Teams"
                                    >
                                        <Settings size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeView === 'teams' && (
                    <div className="p-2 space-y-4">
                        <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar px-1">
                            {teams.map(t => (
                                <div key={t.id} className="flex items-center gap-2 group">
                                    {editingId === t.id ? (
                                        <div className="flex items-center gap-2 w-full">
                                            <input type="text" autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveTeamEdit()} className="flex-1 text-xs border border-blue-300 rounded px-2 py-1 outline-none" />
                                            <button onClick={saveTeamEdit} className="text-green-600 hover:bg-green-50 p-1 rounded"><Save size={14} /></button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border shadow-sm flex-1" style={{ backgroundColor: t.bg, color: t.text, borderColor: t.border }}>
                                                {t.label}
                                            </span>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openTeamManager(t)} className="text-gray-400 hover:text-blue-600 p-1 hover:bg-blue-50 rounded" title="Manage Users"><Settings size={12} /></button>
                                                <button onClick={() => startEditing(t)} className="text-gray-400 hover:text-blue-600 p-1 hover:bg-gray-100 rounded" title="Rename"><Save size={12} className="rotate-90" /></button>
                                                {t.label !== 'Admin' && (
                                                    <button onClick={() => deleteTeam(t.id)} className="text-gray-400 hover:text-red-600 p-1 hover:bg-red-50 rounded" title="Delete"><Trash2 size={12} /></button>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-gray-100 pt-3 mt-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">Add New Team</label>
                            <div className="flex gap-2">
                                <input type="text" placeholder="e.g. Finance" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddTeam()} className="flex-1 text-xs border border-gray-300 rounded-md px-2 py-1.5 outline-none" />
                                <button onClick={handleAddTeam} disabled={!newTeamName.trim()} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md px-3 py-1.5 flex items-center justify-center">{loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={16} />}</button>
                            </div>
                        </div>
                    </div>
                )}

                {activeView === 'integrations' && (
                     <div className="p-2 space-y-4">
                        <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar px-1">
                            {integrations.map(int => (
                                <div key={int.id} className="flex items-center gap-2 group">
                                    {editingId === int.id ? (
                                        <div className="flex items-center gap-2 w-full">
                                            <input 
                                                type="text" 
                                                autoFocus 
                                                value={editName} 
                                                onChange={(e) => setEditName(e.target.value)} 
                                                onKeyDown={(e) => e.key === 'Enter' && saveIntegrationEdit()} 
                                                className="flex-1 text-xs border border-blue-300 rounded px-2 py-1 outline-none" 
                                            />
                                            <button onClick={saveIntegrationEdit} className="text-green-600 hover:bg-green-50 p-1 rounded"><Save size={14} /></button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border shadow-sm flex-1" style={{ backgroundColor: int.bg, color: int.text, borderColor: int.border }}>{int.label}</span>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => startEditing(int)} className="text-gray-400 hover:text-blue-600 p-1 hover:bg-gray-100 rounded" title="Rename"><Save size={12} className="rotate-90" /></button>
                                                <button onClick={() => deleteIntegration(int.id)} className="text-gray-400 hover:text-red-600 p-1 hover:bg-red-50 rounded" title="Delete"><Trash2 size={12} /></button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-gray-100 pt-3 mt-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">Add New Integration</label>
                            <div className="flex gap-2">
                                <input type="text" placeholder="e.g. Jira" value={newIntegrationName} onChange={(e) => setNewIntegrationName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddIntegration()} className="flex-1 text-xs border border-gray-300 rounded-md px-2 py-1.5 outline-none" />
                                <button onClick={handleAddIntegration} disabled={!newIntegrationName.trim()} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md px-3 py-1.5 flex items-center justify-center"><Plus size={16} /></button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* --- MANAGE TEAM USERS MODAL --- */}
            {managingTeam && createPortal(
                <div className="fixed inset-0 z-[10001] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setManagingTeam(null)} />
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-[500px] animate-in zoom-in-95 duration-200 relative z-10 flex flex-col max-h-[80vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
                            <div>
                                <h3 className="font-bold text-lg text-gray-800">Manage Team</h3>
                                <p className="text-sm text-gray-500">Users for <strong className="text-gray-700">{managingTeam.label}</strong></p>
                            </div>
                            <button onClick={() => setManagingTeam(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-400"><X size={20} /></button>
                        </div>

                        <div className="p-6 overflow-y-auto">
                            {/* SEARCH USERS */}
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
                                <label className="text-xs font-bold text-gray-700 uppercase mb-3 flex items-center gap-2">
                                    <UserPlus size={14} className="text-blue-500" /> 
                                    Add Team Member
                                </label>
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        placeholder="Search by email..." 
                                        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 pl-9 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" 
                                        value={searchTerm} 
                                        onChange={e => setSearchTerm(e.target.value)} 
                                    />
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                        {isSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                                    </div>
                                </div>

                                {searchTerm && (
                                    <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-sm max-h-[150px] overflow-y-auto custom-scrollbar divide-y divide-gray-50">
                                        {searchResults.length === 0 && !isSearching ? (
                                            <div className="p-3 text-xs text-center text-gray-400 italic">No users found.</div>
                                        ) : (
                                            searchResults.map(u => (
                                                <div key={u.id} className="flex items-center justify-between p-2 hover:bg-blue-50 transition-colors group">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold overflow-hidden">
                                                            {u.photoURL ? (
                                                                <img src={u.photoURL} alt="User" className="w-full h-full object-cover" />
                                                            ) : (
                                                                `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-semibold text-gray-800">{u.firstName} {u.lastName}</span>
                                                            <span className="text-[10px] text-gray-500">{u.email}</span>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleAddUserToTeam(u)}
                                                        className="px-2 py-1 bg-blue-600 text-white text-[10px] font-bold rounded shadow-sm hover:bg-blue-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        Add
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>

                            <div>
                                <h4 className="text-sm font-bold text-gray-700 mb-3">Team Members ({teamUsers[managingTeam.id]?.length || 0})</h4>
                                <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
                                    {(teamUsers[managingTeam.id] || []).length === 0 ? (
                                        <div className="col-span-2 text-center py-6 text-gray-400 italic bg-gray-50 rounded-lg border border-dashed border-gray-200">No users yet.</div>
                                    ) : (
                                        (teamUsers[managingTeam.id] || []).map(user => {
                                            const isExpanded = expandedUserId === user.id;
                                            return (
                                                <div key={user.id} onClick={() => toggleUserExpand(user.id)} className={`flex flex-col justify-center p-2 bg-white border rounded-lg shadow-sm group hover:border-gray-300 transition-all cursor-pointer relative ${isExpanded ? 'border-blue-200 bg-blue-50/30 row-span-2 h-auto' : 'border-gray-100 h-10'}`}>
                                                    <div className="flex items-center justify-between w-full">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 flex-shrink-0 overflow-hidden">
                                                                {user.photoURL ? (
                                                                    <img src={user.photoURL} alt="User" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    user.initials
                                                                )}
                                                            </div>
                                                            <div className="text-xs font-semibold text-gray-800 truncate">{user.firstName} {user.lastName}</div>
                                                        </div>
                                                        {deleteUserConfirm === user.id ? (
                                                            <div onClick={e => e.stopPropagation()} className="flex items-center gap-1 absolute right-1 bg-white shadow-sm border border-red-100 rounded p-0.5 z-10 top-2">
                                                                <button onClick={() => handleRemoveUser(user.id)} className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">Yes</button>
                                                                <button onClick={() => setDeleteUserConfirm(null)} className="bg-gray-200 text-gray-600 text-[9px] px-1.5 py-0.5 rounded font-bold">No</button>
                                                            </div>
                                                        ) : (
                                                            <button onClick={(e) => { e.stopPropagation(); setDeleteUserConfirm(user.id); }} className="text-gray-300 hover:text-red-500 ml-1"><Trash2 size={12} /></button>
                                                        )}
                                                    </div>
                                                    {isExpanded && (
                                                        <div className="mt-2 pl-8 pr-1 flex items-center justify-between">
                                                            <span className="text-[10px] text-gray-500 truncate select-all">{user.email}</span>
                                                            <button onClick={(e) => handleCopyEmail(e, user.email, user.id)} className="text-gray-400 hover:text-blue-600 p-1 rounded-md">{copiedId === user.id ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}</button>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

             {/* --- NEW: MANAGE USER (VIA GEAR ICON) MODAL --- */}
             {managingUserLive && createPortal(
                <div className="fixed inset-0 z-[10002] flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setManagingUser(null)} />
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-[400px] animate-in zoom-in-95 duration-200 relative z-10 flex flex-col overflow-hidden">
                        
                        {/* Header */}
                        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold overflow-hidden border border-blue-200">
                                    {managingUserLive.photoURL ? (
                                        <img src={managingUserLive.photoURL} alt="User" className="w-full h-full object-cover" />
                                    ) : (
                                        `${managingUserLive.firstName?.[0] || ''}${managingUserLive.lastName?.[0] || ''}`
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-gray-800">{managingUserLive.firstName} {managingUserLive.lastName}</h3>
                                    <p className="text-[10px] text-gray-500">{managingUserLive.email}</p>
                                </div>
                            </div>
                            <button onClick={() => setManagingUser(null)} className="p-1.5 hover:bg-gray-200 rounded-full text-gray-400"><X size={16} /></button>
                        </div>

                        <div className="p-5 space-y-6">
                            
                            {/* NEW: User Role Section */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <Users size={12} /> User Role
                                </h4>
                                <div className="flex bg-gray-100 p-1 rounded-lg">
                                    <button 
                                        onClick={() => handleUpdateUserRole(managingUserLive.id, 'editor')}
                                        className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all ${
                                            (managingUserLive.role || 'editor') === 'editor' 
                                            ? 'bg-white text-blue-600 shadow-sm' 
                                            : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        Editor
                                    </button>
                                    <button 
                                        onClick={() => handleUpdateUserRole(managingUserLive.id, 'reader')}
                                        className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-all ${
                                            managingUserLive.role === 'reader' 
                                            ? 'bg-white text-blue-600 shadow-sm' 
                                            : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        Reader
                                    </button>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-2 italic">
                                    {(managingUserLive.role || 'editor') === 'editor' 
                                        ? "Editors can create and modify forms." 
                                        : "Readers can only view forms and cannot make changes."}
                                </p>
                            </div>

                            {/* Manage Teams Section */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <UserPlus size={12} /> Team Memberships
                                </h4>
                                <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                                    {teams.map(team => {
                                        const userTeams = userTeamsMap[managingUserLive.id] || [];
                                        const isMember = userTeams.some(item => item.teamId === team.id);
                                        const memberRecord = userTeams.find(item => item.teamId === team.id);

                                        return (
                                            <div key={team.id} className="flex items-center justify-between p-2 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: team.border }}></span>
                                                    <span className="text-xs font-semibold text-gray-700">{team.label}</span>
                                                </div>
                                                
                                                {isMember ? (
                                                    <button 
                                                        onClick={() => handleRemoveUser(memberRecord.docId)}
                                                        className="text-[10px] font-bold px-2 py-1 bg-red-50 text-red-600 rounded border border-red-100 hover:bg-red-100 transition-colors flex items-center gap-1"
                                                    >
                                                        <UserMinus size={10} /> Remove
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => handleAddUserToTeam(managingUserLive, team.id)}
                                                        className="text-[10px] font-bold px-2 py-1 bg-white text-gray-600 rounded border border-gray-200 hover:border-blue-300 hover:text-blue-600 transition-colors flex items-center gap-1 shadow-sm"
                                                    >
                                                        <Plus size={10} /> Add
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Delete User Section */}
                            <div className="pt-4 border-t border-gray-100">
                                <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <ShieldAlert size={12} /> Danger Zone
                                </h4>
                                <p className="text-[10px] text-gray-400 mb-3">
                                    Permanently delete this user and remove them from all teams. This action cannot be undone.
                                </p>
                                {deleteUserConfirm === managingUserLive.id ? (
                                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                                        <button 
                                            onClick={() => handleDeleteUserGlobal(managingUserLive.id)}
                                            className="flex-1 bg-red-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                                        >
                                            Confirm Delete
                                        </button>
                                        <button 
                                            onClick={() => setDeleteUserConfirm(null)}
                                            className="flex-1 bg-gray-100 text-gray-600 text-xs font-bold py-2 rounded-lg hover:bg-gray-200 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => setDeleteUserConfirm(managingUserLive.id)}
                                        className="w-full border border-red-200 text-red-600 text-xs font-bold py-2 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Trash2 size={12} /> Delete User
                                    </button>
                                )}
                            </div>

                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default AccountSettings;
