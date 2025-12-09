import React, { useState, useRef, useEffect } from 'react';
import { Menu, Key, Plus, ChevronLeft, Save, Trash2, Settings, X, UserPlus, Copy, Check } from 'lucide-react'; 
import { createPortal } from 'react-dom';

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
    bg: '#f3f4f6', // gray-100
    text: '#374151', // gray-700
    border: '#d1d5db' // gray-300
});

const AccountSettings = () => {
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState('menu'); 
  
  // CHANGED: Initialize from localStorage
  const [integrations, setIntegrations] = useState(() => {
      try {
          const saved = localStorage.getItem('admin_integrations');
          return saved ? JSON.parse(saved) : [
              { id: 1, label: "Salesforce", ...getPastelColor(0) },
              { id: 2, label: "HubSpot", ...getPastelColor(1) }
          ];
      } catch (e) {
          return [
              { id: 1, label: "Salesforce", ...getPastelColor(0) },
              { id: 2, label: "HubSpot", ...getPastelColor(1) }
          ];
      }
  });

  // CHANGED: Save to localStorage
  useEffect(() => {
      localStorage.setItem('admin_integrations', JSON.stringify(integrations));
      window.dispatchEvent(new Event('integrations-updated'));
  }, [integrations]);

  const [newIntegrationName, setNewIntegrationName] = useState("");
  
  // Teams State (Admin is ID 0, fixed)
  const [teams, setTeams] = useState([
      { id: 0, label: "Admin", ...getTeamStyle(), fixed: true },
      { id: 1, label: "Marketing", ...getTeamStyle() }
  ]);
  const [newTeamName, setNewTeamName] = useState("");

  // Shared Editing State
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  // NEW: Manage Team State
  const [managingTeam, setManagingTeam] = useState(null); // The team object being managed
  const [teamUsers, setTeamUsers] = useState({
      0: [], // Admin users
      1: []  // Marketing users
  });
  
  // Invite Form State
  const [inviteForm, setInviteForm] = useState({ firstName: "", lastName: "", email: "" });
  const [deleteUserConfirm, setDeleteUserConfirm] = useState(null); // ID of user to delete
  const [expandedUserId, setExpandedUserId] = useState(null); // New state for expanded user
  const [copiedId, setCopiedId] = useState(null); // Feedback for copy action

  const buttonRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // Update position when menu opens
  useEffect(() => {
      if (isAdminMenuOpen && buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect();
          const isWide = activeView === 'integrations' || activeView === 'teams';
          setMenuPosition({
              top: rect.bottom + 8,
              left: rect.right - (isWide ? 320 : 240)
          });
      }
  }, [isAdminMenuOpen, activeView]);

  // --- Integration Handlers ---
  const handleAddIntegration = () => {
      if (!newIntegrationName.trim()) return;
      const newId = Math.max(0, ...integrations.map(i => i.id)) + 1;
      const newIntegration = {
          id: newId,
          label: newIntegrationName,
          ...getPastelColor(integrations.length)
      };
      setIntegrations([...integrations, newIntegration]);
      setNewIntegrationName("");
  };

  const saveIntegrationEdit = () => {
      setIntegrations(integrations.map(i => 
          i.id === editingId ? { ...i, label: editName } : i
      ));
      setEditingId(null);
  };

  // --- Team Handlers ---
  const handleAddTeam = () => {
      if (!newTeamName.trim()) return;
      const newId = Math.max(0, ...teams.map(t => t.id)) + 1;
      const newTeam = {
          id: newId,
          label: newTeamName,
          ...getTeamStyle()
      };
      setTeams([...teams, newTeam]);
      // Initialize empty user list for new team
      setTeamUsers(prev => ({ ...prev, [newId]: [] }));
      setNewTeamName("");
  };

  const saveTeamEdit = () => {
      setTeams(teams.map(t => 
          t.id === editingId ? { ...t, label: editName } : t
      ));
      setEditingId(null);
  };

  const deleteTeam = (id) => {
      setTeams(teams.filter(t => t.id !== id));
      // Also cleanup users? Optional.
  };

  const startEditing = (item) => {
      if (item.fixed) return;
      setEditingId(item.id);
      setEditName(item.label);
  };

  // --- Manage Team Users Handlers ---
  const openTeamManager = (team) => {
      setManagingTeam(team);
      // Reset form
      setInviteForm({ firstName: "", lastName: "", email: "" });
  };

  const handleInviteUser = () => {
      if (!inviteForm.firstName || !inviteForm.lastName || !inviteForm.email) return;
      
      const teamId = managingTeam.id;
      const currentUsers = teamUsers[teamId] || [];
      const newUserId = Math.max(0, ...Object.values(teamUsers).flat().map(u => u.id || 0)) + 1;
      
      const newUser = {
          id: newUserId,
          ...inviteForm,
          initials: `${inviteForm.firstName[0]}${inviteForm.lastName[0]}`.toUpperCase()
      };

      setTeamUsers(prev => ({
          ...prev,
          [teamId]: [...currentUsers, newUser]
      }));
      setInviteForm({ firstName: "", lastName: "", email: "" });
  };

  const handleRemoveUser = (userId) => {
      const teamId = managingTeam.id;
      setTeamUsers(prev => ({
          ...prev,
          [teamId]: prev[teamId].filter(u => u.id !== userId)
      }));
      setDeleteUserConfirm(null);
  };

  const handleCopyEmail = (e, email, id) => {
      e.stopPropagation();
      navigator.clipboard.writeText(email);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
  };

  const toggleUserExpand = (userId) => {
      setExpandedUserId(expandedUserId === userId ? null : userId);
  };

  const resetMenu = () => {
      setIsAdminMenuOpen(false);
      setTimeout(() => setActiveView('menu'), 200);
  };

  return (
    <div className="flex flex-col items-end gap-1.5 relative z-50">
      {/* Account Pill */}
      <div className="bg-gray-100 rounded-full pl-0.5 pr-2 py-0.5 flex items-center gap-2 shadow-sm border border-gray-200 cursor-pointer hover:bg-gray-200 transition-colors select-none">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
          ZP
        </div>
        <Menu size={14} className="text-gray-500" />
      </div>

      {/* Admin World Link */}
      <button 
        ref={buttonRef}
        onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
        className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors group select-none"
      >
        <Key size={12} className="text-gray-400 group-hover:text-gray-600" />
        <span className="text-xs font-medium border-b border-gray-300 group-hover:border-gray-600 pb-px">Admin World</span>
      </button>

      {/* Admin World Menu Popup */}
      {isAdminMenuOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-start">
            <div 
                className="absolute inset-0 bg-black/20 backdrop-blur-sm" 
                onClick={resetMenu}
            />
            
            <div 
                className={`absolute bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-[10000] animate-in fade-in zoom-in-95 duration-200 origin-top-right transition-all ease-in-out`}
                style={{ 
                    top: menuPosition.top, 
                    left: menuPosition.left,
                    width: (activeView === 'integrations' || activeView === 'teams') ? '320px' : '240px'
                }}
            >
                {/* Header */}
                <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 mb-1 text-gray-500">
                    {activeView !== 'menu' ? (
                        <button onClick={() => setActiveView('menu')} className="hover:text-gray-800 transition-colors mr-1">
                            <ChevronLeft size={14} />
                        </button>
                    ) : (
                        <Key size={12} />
                    )}
                    <span className="text-xs font-semibold underline">
                        {activeView === 'integrations' ? 'Manage Integrations' : 
                         activeView === 'teams' ? 'Manage Teams' : 'Admin World'}
                    </span>
                </div>
                
                {/* --- MAIN MENU VIEW --- */}
                {activeView === 'menu' && (
                    <div className="flex flex-col gap-1">
                        
                        {/* Teams Section */}
                        <div className="flex flex-col gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors group/tm">
                            <button 
                                onClick={() => setActiveView('teams')}
                                className="text-left text-sm text-gray-700 font-medium flex justify-between items-center w-full"
                            >
                                Teams
                                <span className="text-[10px] text-gray-400 group-hover/tm:text-blue-500 font-normal">Edit</span>
                            </button>
                            <div className="flex flex-wrap gap-1.5">
                                {teams.map(t => (
                                    <span 
                                        key={t.id}
                                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border shadow-sm"
                                        style={{ backgroundColor: t.bg, color: t.text, borderColor: t.border }}
                                    >
                                        {t.label}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Integrations Section */}
                        <div className="flex flex-col gap-2 p-2 hover:bg-gray-50 rounded-lg transition-colors group/int">
                            <button 
                                onClick={() => setActiveView('integrations')}
                                className="text-left text-sm text-gray-700 font-medium flex justify-between items-center w-full"
                            >
                                Integrations
                                <span className="text-[10px] text-gray-400 group-hover/int:text-blue-500 font-normal">Edit</span>
                            </button>
                            <div className="flex flex-wrap gap-1.5">
                                {integrations.map(int => (
                                    <span 
                                        key={int.id}
                                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border shadow-sm"
                                        style={{ backgroundColor: int.bg, color: int.text, borderColor: int.border }}
                                    >
                                        {int.label}
                                    </span>
                                ))}
                                {integrations.length === 0 && <span className="text-[10px] text-gray-400 italic">None configured</span>}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TEAMS MANAGER VIEW --- */}
                {activeView === 'teams' && (
                    <div className="p-2 space-y-4">
                        <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar px-1">
                            {teams.map(t => (
                                <div key={t.id} className="flex items-center gap-2 group">
                                    {editingId === t.id ? (
                                        <div className="flex items-center gap-2 w-full">
                                            <input 
                                                type="text" 
                                                autoFocus
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && saveTeamEdit()}
                                                className="flex-1 text-xs border border-blue-300 rounded px-2 py-1 outline-none"
                                            />
                                            <button onClick={saveTeamEdit} className="text-green-600 hover:bg-green-50 p-1 rounded">
                                                <Save size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <span 
                                                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border shadow-sm flex-1"
                                                style={{ backgroundColor: t.bg, color: t.text, borderColor: t.border }}
                                            >
                                                {t.label}
                                                {t.fixed && <span className="ml-1 opacity-50 text-[9px]">(Fixed)</span>}
                                            </span>
                                            
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {/* Manage Users Button (Gear) */}
                                                <button 
                                                    onClick={() => openTeamManager(t)}
                                                    className="text-gray-400 hover:text-blue-600 p-1 hover:bg-blue-50 rounded"
                                                    title="Manage Users"
                                                >
                                                    <Settings size={12} />
                                                </button>

                                                {!t.fixed && (
                                                    <>
                                                        <button 
                                                            onClick={() => startEditing(t)}
                                                            className="text-gray-400 hover:text-blue-600 p-1 hover:bg-gray-100 rounded"
                                                            title="Rename"
                                                        >
                                                            <Save size={12} className="rotate-90" /> {/* Reuse icon visually or replace */}
                                                        </button>
                                                        <button 
                                                            onClick={() => deleteTeam(t.id)}
                                                            className="text-gray-400 hover:text-red-600 p-1 hover:bg-red-50 rounded"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </>
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
                                <input 
                                    type="text"
                                    placeholder="e.g. Finance"
                                    value={newTeamName}
                                    onChange={(e) => setNewTeamName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddTeam()}
                                    className="flex-1 text-xs border border-gray-300 rounded-md px-2 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                />
                                <button 
                                    onClick={handleAddTeam}
                                    disabled={!newTeamName.trim()}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md px-3 py-1.5 flex items-center justify-center transition-colors"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- INTEGRATIONS MANAGER VIEW --- */}
                {activeView === 'integrations' && (
                    <div className="p-2 space-y-4">
                         {/* ... Same as before ... */}
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
                                            <button onClick={saveIntegrationEdit} className="text-green-600 hover:bg-green-50 p-1 rounded">
                                                <Save size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <span 
                                                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border shadow-sm flex-1"
                                                style={{ backgroundColor: int.bg, color: int.text, borderColor: int.border }}
                                            >
                                                {int.label}
                                            </span>
                                            <button 
                                                onClick={() => startEditing(int)}
                                                className="text-[10px] text-gray-400 hover:text-blue-600 px-2 py-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                Rename
                                            </button>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-gray-100 pt-3 mt-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1.5 block">Add New Integration</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text"
                                    placeholder="e.g. Jira"
                                    value={newIntegrationName}
                                    onChange={(e) => setNewIntegrationName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddIntegration()}
                                    className="flex-1 text-xs border border-gray-300 rounded-md px-2 py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                />
                                <button 
                                    onClick={handleAddIntegration}
                                    disabled={!newIntegrationName.trim()}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md px-3 py-1.5 flex items-center justify-center transition-colors"
                                >
                                    <Plus size={16} />
                                </button>
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
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
                            <div className="flex flex-col">
                                <h3 className="font-bold text-lg text-gray-800">Manage Team</h3>
                                <p className="text-sm text-gray-500">Add or remove users for <strong className="text-gray-700">{managingTeam.label}</strong></p>
                            </div>
                            <button onClick={() => setManagingTeam(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 overflow-y-auto"> {/* Keep outer scroll for small screens/form, but maybe limit it */}
                            {/* Invite Form */}
                            <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 mb-6">
                                <label className="text-xs font-bold text-blue-800 uppercase mb-3 flex items-center gap-2">
                                    <UserPlus size={14} /> Invite User
                                </label>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <input 
                                        type="text" 
                                        placeholder="First Name" 
                                        className="text-sm border border-gray-300 rounded px-3 py-2 outline-none focus:border-blue-500"
                                        value={inviteForm.firstName}
                                        onChange={e => setInviteForm({...inviteForm, firstName: e.target.value})}
                                    />
                                    <input 
                                        type="text" 
                                        placeholder="Last Name" 
                                        className="text-sm border border-gray-300 rounded px-3 py-2 outline-none focus:border-blue-500"
                                        value={inviteForm.lastName}
                                        onChange={e => setInviteForm({...inviteForm, lastName: e.target.value})}
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <input 
                                        type="email" 
                                        placeholder="Email Address" 
                                        className="flex-1 text-sm border border-gray-300 rounded px-3 py-2 outline-none focus:border-blue-500"
                                        value={inviteForm.email}
                                        onChange={e => setInviteForm({...inviteForm, email: e.target.value})}
                                    />
                                    <button 
                                        onClick={handleInviteUser}
                                        disabled={!inviteForm.firstName || !inviteForm.lastName || !inviteForm.email}
                                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-md transition-colors shadow-sm"
                                    >
                                        Invite
                                    </button>
                                </div>
                            </div>

                            {/* Users List */}
                            <div>
                                <h4 className="text-sm font-bold text-gray-700 mb-3">Team Members ({teamUsers[managingTeam.id]?.length || 0})</h4>
                                <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto custom-scrollbar pr-1"> 
                                    {(teamUsers[managingTeam.id] || []).length === 0 ? (
                                        <div className="col-span-2 text-center py-6 text-gray-400 italic bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                            No users in this team yet.
                                        </div>
                                    ) : (
                                        (teamUsers[managingTeam.id] || []).map(user => {
                                            const isExpanded = expandedUserId === user.id;
                                            return (
                                                <div 
                                                    key={user.id} 
                                                    onClick={() => toggleUserExpand(user.id)}
                                                    className={`flex flex-col justify-center p-2 bg-white border rounded-lg shadow-sm group hover:border-gray-300 transition-all cursor-pointer relative ${isExpanded ? 'border-blue-200 bg-blue-50/30 row-span-2 h-auto' : 'border-gray-100 h-10'}`}
                                                >
                                                    <div className="flex items-center justify-between w-full">
                                                        <div className="flex items-center gap-2 min-w-0"> 
                                                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 flex-shrink-0">
                                                                {user.initials}
                                                            </div>
                                                            <div className="text-xs font-semibold text-gray-800 truncate" title={`${user.firstName} ${user.lastName}`}>
                                                                {user.firstName} {user.lastName}
                                                            </div>
                                                        </div>
                                                        
                                                        {deleteUserConfirm === user.id ? (
                                                            <div 
                                                                onClick={e => e.stopPropagation()}
                                                                className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-200 bg-white absolute right-1 shadow-sm border border-red-100 rounded p-0.5 z-10 top-2"
                                                            >
                                                                <button 
                                                                    onClick={() => handleRemoveUser(user.id)}
                                                                    className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded hover:bg-red-700 font-bold"
                                                                >
                                                                    Yes
                                                                </button>
                                                                <button 
                                                                    onClick={() => setDeleteUserConfirm(null)}
                                                                    className="bg-gray-200 text-gray-600 text-[9px] px-1.5 py-0.5 rounded hover:bg-gray-300 font-bold"
                                                                >
                                                                    No
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setDeleteUserConfirm(user.id); }}
                                                                className="text-gray-300 hover:text-red-500 rounded-full transition-colors flex-shrink-0 ml-1"
                                                                title="Remove User"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Expanded Email View */}
                                                    {isExpanded && (
                                                        <div className="mt-2 pl-8 pr-1 animate-in fade-in slide-in-from-top-1 duration-200 flex items-center justify-between">
                                                            <span className="text-[10px] text-gray-500 truncate select-all">{user.email}</span>
                                                            <button 
                                                                onClick={(e) => handleCopyEmail(e, user.email, user.id)}
                                                                className="text-gray-400 hover:text-blue-600 p-1 rounded-md hover:bg-blue-50 transition-colors"
                                                                title="Copy Email"
                                                            >
                                                                {copiedId === user.id ? <Check size={10} className="text-green-500" /> : <Copy size={10} />}
                                                            </button>
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
        </div>,
        document.body
      )}
    </div>
  );
};

export default AccountSettings;
