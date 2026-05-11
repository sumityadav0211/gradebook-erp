import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  User as UserIcon, 
  Mail, 
  Lock, 
  Shield, 
  School,
  Loader2,
  AlertCircle,
  Filter,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';

interface College {
  id: string;
  college_name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'master_admin' | 'admin' | 'teacher';
  college_id: string | null;
  can_add_admin: boolean;
  created_at: string;
  colleges?: {
    college_name: string;
  };
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'teacher' as 'admin' | 'teacher',
    college_id: '',
    can_add_admin: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      const [usersRes, collegesRes] = await Promise.all([
        supabase
          .from('users')
          .select('*, colleges(college_name)')
          .order('role', { ascending: true }),
        supabase
          .from('colleges')
          .select('id, college_name')
          .order('college_name', { ascending: true })
      ]);

      if (usersRes.error) throw usersRes.error;
      if (collegesRes.error) throw collegesRes.error;

      setUsers(usersRes.data || []);
      setColleges(collegesRes.data || []);
      
      // Select first college by default if creating new
      if (!formData.college_id && collegesRes.data?.length) {
        setFormData(prev => ({ ...prev, college_id: collegesRes.data[0].id }));
      }
    } catch (error: any) {
      toast.error('Failed to load system users');
      console.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openModal = (user: User | null = null) => {
    if (user) {
      setCurrentUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: '', // Password empty on edit
        role: user.role === 'master_admin' ? 'admin' : user.role as 'admin' | 'teacher',
        college_id: user.college_id || (colleges.length > 0 ? colleges[0].id : ''),
        can_add_admin: user.can_add_admin
      });
    } else {
      setCurrentUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'teacher',
        college_id: colleges.length > 0 ? colleges[0].id : '',
        can_add_admin: false
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || (!currentUser && !formData.password)) {
      toast.error('Please fill all required fields');
      return;
    }

    if (!formData.college_id && formData.role !== 'master_admin') {
      toast.error('Please select a college for this user');
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if email already exists (excluding current user if editing)
      let emailQuery = supabase
        .from('users')
        .select('id')
        .eq('email', formData.email.toLowerCase().trim());
      
      if (currentUser) {
        emailQuery = emailQuery.neq('id', currentUser.id);
      }

      const { data: existingUser, error: checkError } = await emailQuery.maybeSingle();
      
      if (checkError) throw checkError;
      if (existingUser) {
        toast.error('This email is already registered to another account');
        setIsSubmitting(false);
        return;
      }

      const payload: any = {
        name: formData.name,
        email: formData.email.toLowerCase().trim(),
        role: formData.role,
        college_id: formData.college_id,
        can_add_admin: formData.role === 'admin' ? formData.can_add_admin : false
      };

      // Store password directly as plain text (AS REQUESTED)
      if (formData.password) {
        payload.password = formData.password;
      }

      if (currentUser) {
        const { error } = await supabase
          .from('users')
          .update(payload)
          .eq('id', currentUser.id);
        
        if (error) throw error;
        toast.success(`${formData.name}'s profile updated`);
      } else {
        const { error } = await supabase
          .from('users')
          .insert([payload]);
        
        if (error) throw error;
        toast.success(`Account created for ${formData.name}`);
      }
      
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Error processing request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!currentUser) return;
    if (currentUser.role === 'master_admin') {
      toast.error('Master Admins cannot be deleted');
      setIsDeleteModalOpen(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', currentUser.id);
      
      if (error) throw error;
      toast.success('User account deactivated and removed');
      setIsDeleteModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error('Unable to delete user: Active linked records found');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'master_admin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'admin': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'teacher': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <DashboardLayout title="Identity Governance">
      <div className="page-header">
        <div>
          <h1 className="page-title">Global Authorization</h1>
          <p className="page-subtitle">Centralized control of system-wide administrative and faculty accounts</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="btn-primary flex items-center justify-center gap-2 px-8 h-14 shadow-xl shadow-primary-600/20 active:scale-95 transition-all"
        >
          <Plus size={20} />
          <span className="uppercase text-[10px] font-black tracking-[0.2em]">Provision Account</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 mb-10 group">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={22} />
          <input 
            type="text"
            placeholder="Search authorization matrix by name or email..."
            className="input-field pl-14 h-16 bg-white border-slate-100 shadow-sm text-sm font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select 
              className="input-field pl-12 pr-12 appearance-none h-16 bg-white border-slate-100 shadow-sm min-w-[200px] text-xs font-black uppercase tracking-widest"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">Hierarchical Tiers</option>
              <option value="master_admin">Master Overlords</option>
              <option value="admin">College Principals</option>
              <option value="teacher">Department Faculty</option>
            </select>
            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-80">Subject Identity</th>
              <th className="text-center w-48">Access Tier</th>
              <th>Assigned Campus</th>
              <th className="text-center w-40">Security Role</th>
              <th className="text-center w-40">Registration</th>
              <th className="text-right">Control</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={6} className="p-10 h-20 bg-slate-50/20"></td>
                </tr>
              ))
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr key={user.id} className="group hover:bg-slate-50/50 transition-all">
                  <td>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs border uppercase shrink-0 shadow-sm transition-transform group-hover:scale-105 ${
                        user.role === 'master_admin' ? 'bg-purple-50 text-purple-600 border-purple-100' : 
                        user.role === 'admin' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                        'bg-emerald-50 text-emerald-600 border-emerald-100'
                      }`}>
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-800 tracking-tight leading-tight">{user.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-center">
                    <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] border inline-block ${getRoleBadge(user.role)}`}>
                      {user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                       <School size={14} className="text-slate-300" />
                       <span className="text-xs font-bold text-slate-500 tracking-tight">
                         {user.role === 'master_admin' ? 'Omnipresent Management' : (user.colleges?.college_name || 'Unmapped Authority')}
                       </span>
                    </div>
                  </td>
                  <td className="text-center">
                    {user.can_add_admin ? (
                      <div className="flex items-center justify-center gap-2 text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-lg" title="Inherited Onboarding Rights">
                        <CheckCircle2 size={14} />
                        <span className="text-[9px] font-black uppercase tracking-wider">Escalated</span>
                      </div>
                    ) : (
                      <span className="text-slate-200 font-black tracking-widest">—</span>
                    )}
                  </td>
                  <td className="text-center">
                    <span className="text-slate-400 font-bold text-[10px] uppercase font-mono tracking-widest">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className={`flex justify-end gap-1.5 ${user.role === 'master_admin' ? 'invisible' : ''}`}>
                      <button 
                        onClick={() => openModal(user)}
                        className="btn-icon hover:bg-primary-50 hover:text-primary-600"
                        title="Update Access"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => { setCurrentUser(user); setIsDeleteModalOpen(true); }}
                        className="btn-icon hover:bg-red-50 hover:text-red-600"
                        title="Terminate Authorization"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>
                  <EmptyState 
                    icon={UserIcon}
                    title={searchTerm ? "Query Isolation" : "No Identity Mappings"}
                    message={searchTerm ? `The directory search for "${searchTerm}" yielded zero authorization assets.` : "The global user registry is currently sterilized. Onboard stakeholders to begin security distribution."}
                    action={searchTerm ? { label: "Clear Matrix Search", onClick: () => setSearchTerm('') } : undefined}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-xl shadow-2xl relative z-10"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                    <UserIcon size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">{currentUser ? 'Update User Identity' : 'Account Provisioning'}</h2>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text"
                        required
                        placeholder="John Doe"
                        className="input-field pl-10"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="email"
                        required
                        placeholder="john@example.com"
                        className="input-field pl-10"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    {currentUser ? 'Update Password (Optional)' : 'Secret Password'}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="password"
                      required={!currentUser}
                      placeholder={currentUser ? "Keep empty to remain unchanged" : "••••••••"}
                      className="input-field pl-10"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Platform Role</label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <select 
                        className="input-field pl-10"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                      >
                        <option value="teacher">Teacher</option>
                        <option value="admin">College Admin</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Select Institution</label>
                    <div className="relative">
                      <School className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <select 
                        className="input-field pl-10"
                        value={formData.college_id}
                        onChange={(e) => setFormData({ ...formData, college_id: e.target.value })}
                        required
                      >
                        {colleges.map(c => (
                          <option key={c.id} value={c.id}>{c.college_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {formData.role === 'admin' && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800">Escalate Permissions?</p>
                      <p className="text-[10px] text-slate-500">Allow this admin to create other admins in their college.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={formData.can_add_admin}
                        onChange={(e) => setFormData({ ...formData, can_add_admin: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 btn-primary py-3 rounded-xl flex items-center justify-center gap-2"
                  >
                    {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                    {currentUser ? 'Save Updates' : 'Grant Access'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog 
        isOpen={isDeleteModalOpen}
        title="Revoke ERP Access?"
        message={`This will permanently deactivate account for "${currentUser?.name}". All historical mapping will remain, but login privilege will be terminated.`}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
        isLoading={isSubmitting}
      />
    </DashboardLayout>
  );
};

export default Users;
