import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  UserPlus, 
  Trash2, 
  Edit2, 
  X, 
  Mail, 
  Lock, 
  User, 
  CheckCircle2, 
  ShieldCheck, 
  Loader2,
  AlertCircle,
  Search,
  ShieldPlus,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';

interface Instructor {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher';
  can_add_admin: boolean;
  created_at: string;
}

const Teachers: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentInstructor, setCurrentInstructor] = useState<Instructor | null>(null);
  const [modalRole, setModalRole] = useState<'admin' | 'teacher'>('teacher');
  
  // Form states
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    can_add_admin: false 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Helper for avatar color
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-100 text-blue-600 border-blue-200',
      'bg-indigo-100 text-indigo-600 border-indigo-200',
      'bg-purple-100 text-purple-600 border-purple-200',
      'bg-pink-100 text-pink-600 border-pink-200',
      'bg-rose-100 text-rose-600 border-rose-200',
      'bg-orange-100 text-orange-600 border-orange-200',
      'bg-amber-100 text-amber-600 border-amber-200',
      'bg-emerald-100 text-emerald-600 border-emerald-200',
      'bg-teal-100 text-teal-600 border-teal-200',
      'bg-cyan-100 text-cyan-600 border-cyan-200',
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  const fetchInstructors = async () => {
    if (!currentUser?.college_id) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role, can_add_admin, created_at')
        .eq('college_id', currentUser.college_id)
        .in('role', ['admin', 'teacher'])
        .order('role', { ascending: true })
        .order('name', { ascending: true });
      
      if (error) throw error;
      setInstructors(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch faculty list');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInstructors();
  }, [currentUser]);

  const openModal = (role: 'admin' | 'teacher', instructor: Instructor | null = null) => {
    setModalRole(role);
    if (instructor) {
      setCurrentInstructor(instructor);
      setFormData({ 
        name: instructor.name, 
        email: instructor.email, 
        password: '', 
        can_add_admin: instructor.can_add_admin 
      });
    } else {
      setCurrentInstructor(null);
      setFormData({ name: '', email: '', password: '', can_add_admin: false });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.college_id) return;

    setIsSubmitting(true);
    try {
      // Check if email already exists (excluding current instructor if editing)
      let emailQuery = supabase
        .from('users')
        .select('id')
        .eq('email', formData.email.toLowerCase().trim());
      
      if (currentInstructor) {
        emailQuery = emailQuery.neq('id', currentInstructor.id);
      }

      const { data: existingUser, error: checkError } = await emailQuery.maybeSingle();
      
      if (checkError) throw checkError;
      if (existingUser) {
        toast.error('This email is already registered to another account');
        setIsSubmitting(false);
        return;
      }

      const dataToSave: any = {
        name: formData.name,
        email: formData.email.toLowerCase().trim(),
        role: modalRole,
        can_add_admin: modalRole === 'admin' ? formData.can_add_admin : false,
        college_id: currentUser.college_id
      };

      // Store password directly as plain text (AS REQUESTED)
      if (formData.password) {
        dataToSave.password = formData.password;
      } else if (!currentInstructor) {
        throw new Error('Password is required for new users');
      }

      if (currentInstructor) {
        const { error } = await supabase
          .from('users')
          .update(dataToSave)
          .eq('id', currentInstructor.id);
        
        if (error) throw error;
        toast.success(`${modalRole === 'admin' ? 'Administrator' : 'Teacher'} updated`);
      } else {
        const { error } = await supabase
          .from('users')
          .insert([dataToSave]);
        
        if (error) {
          if (error.code === '23505') throw new Error('Email address already exists');
          throw error;
        }
        toast.success(`New ${modalRole} account activated`);
      }
      
      setIsModalOpen(false);
      fetchInstructors();
    } catch (error: any) {
      toast.error(error.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!currentInstructor) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', currentInstructor.id);
      
      if (error) throw error;
      toast.success('Account deactivated and removed');
      setIsDeleteModalOpen(false);
      fetchInstructors();
    } catch (error: any) {
      toast.error('System error: Could not remove user account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredInstructors = instructors.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout title="Faculty Members">
      <div className="page-header">
        <div>
          <h1 className="page-title">Faculty Staff</h1>
          <p className="page-subtitle">Administrative control over institutional educators and staff</p>
        </div>
        <div className="flex items-center gap-3">
          {currentUser?.can_add_admin && (
            <button 
              onClick={() => openModal('admin')}
              className="h-12 px-6 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-900/10"
            >
              <ShieldPlus size={18} className="text-primary-400" />
              <span className="hidden sm:inline uppercase text-[10px] tracking-widest">Add Admin</span>
            </button>
          )}
          <button 
            onClick={() => openModal('teacher')}
            className="btn-primary flex items-center justify-center gap-2 px-6 h-12 shadow-lg shadow-primary-600/20"
          >
            <UserPlus size={18} />
            <span className="hidden sm:inline uppercase text-[10px] tracking-widest">Add Teacher</span>
            <span className="sm:hidden uppercase text-[10px] tracking-widest">New Staff</span>
          </button>
        </div>
      </div>

      <div className="mb-8 relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={20} />
        <input 
          type="text"
          placeholder="Lookup staff by primary identifier or name..."
          className="input-field pl-12 h-14 bg-white border-slate-100 shadow-sm text-sm font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase tracking-widest hidden sm:block">
           Staff Count: {instructors.length}
        </div>
      </div>

      <div className="table-wrapper hidden sm:block">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-80">Faculty Profile</th>
              <th className="w-64">System Identifier</th>
              <th className="text-center w-40">Access Tier</th>
              <th className="text-center w-40">Privileges</th>
              <th className="text-center w-40">Onboarded</th>
              <th className="text-right">Control</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse"><td colSpan={6} className="p-10 bg-slate-50/20"></td></tr>
              ))
            ) : filteredInstructors.length > 0 ? (
              filteredInstructors.map((inst) => (
                <tr key={inst.id} className="group hover:bg-slate-50">
                  <td>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs border uppercase shrink-0 shadow-sm ${getAvatarColor(inst.name)}`}>
                        {inst.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-800 tracking-tight leading-tight">{inst.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Institutional Faculty</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2 text-slate-500">
                       <Mail size={14} className="text-slate-300" />
                       <span className="text-xs font-bold tracking-tight">{inst.email}</span>
                    </div>
                  </td>
                  <td className="text-center">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                      inst.role === 'admin' 
                        ? 'bg-blue-50 text-blue-700 border-blue-100' 
                        : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    }`}>
                      {inst.role}
                    </span>
                  </td>
                  <td className="text-center">
                    <div className="flex items-center justify-center">
                      {inst.can_add_admin ? (
                        <div className="flex items-center gap-2 text-primary-600 bg-primary-50 px-2 py-1 rounded-lg border border-primary-100">
                          <ShieldPlus size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Root</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 font-black">—</span>
                      )}
                    </div>
                  </td>
                  <td className="text-center">
                    <span className="text-xs font-bold text-slate-400 font-mono">
                      {new Date(inst.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex justify-end gap-1">
                      <button 
                         onClick={() => openModal(inst.role, inst)}
                         className="btn-icon hover:text-primary-600 hover:bg-primary-50"
                         title="Modify Account"
                      >
                         <Edit2 size={16} />
                      </button>
                      <button 
                         onClick={() => { setCurrentInstructor(inst); setIsDeleteModalOpen(true); }}
                         className="btn-icon hover:text-red-600 hover:bg-red-50"
                         title="Revoke Access"
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
                    icon={User}
                    title={searchTerm ? "No faculty found" : "Faculty register empty"}
                    message={searchTerm ? `The record search for "${searchTerm}" returned no matches in staff database.` : "Established educator accounts will be indexed here. Standardize your staff rollout now."}
                    action={searchTerm ? undefined : { label: "Provision Staff", onClick: () => openModal('teacher') }}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="sm:hidden space-y-4">
        {filteredInstructors.map(inst => (
          <motion.div 
            key={inst.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6 bg-white border-slate-100 shadow-sm"
          >
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center font-black text-lg border uppercase shrink-0 shadow-sm ${getAvatarColor(inst.name)}`}>
                  {inst.name.charAt(0)}
                </div>
                <div>
                  <p className="font-extrabold text-slate-800 tracking-tight">{inst.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{inst.email}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                inst.role === 'admin' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
              }`}>
                {inst.role}
              </span>
            </div>

            <div className="flex items-center justify-between pt-5 border-t border-slate-50">
              <div className="flex items-center gap-2">
                {inst.can_add_admin && (
                   <div className="flex items-center gap-2 text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">
                      <ShieldCheck size={12} />
                      <span className="text-[8px] font-black uppercase tracking-widest leading-none">Security Root</span>
                   </div>
                )}
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Joined {new Date(inst.created_at).toLocaleDateString()}</span>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => openModal(inst.role, inst)}
                  className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-500 rounded-xl hover:bg-primary-50 hover:text-primary-600 transition-all border border-slate-100"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => { setCurrentInstructor(inst); setIsDeleteModalOpen(true); }}
                  className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-500 rounded-xl transition-all border border-red-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Account Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="modal-overlay">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="modal-box w-full max-w-lg"
            >
              <div className="modal-header">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${modalRole === 'admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    {modalRole === 'admin' ? <ShieldCheck size={20} /> : <User size={20} />}
                  </div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">
                    {currentInstructor ? 'Modify Account' : `Provision ${modalRole}`}
                  </h2>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="btn-icon">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="divide-y divide-slate-100">
                <div className="modal-body space-y-5 pt-6">
                  <div>
                    <label className="input-label">Full Faculty Name</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Dr. Robert Wilson"
                      className="input-field"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="input-label">Institutional Email</label>
                    <input 
                      type="email"
                      required
                      placeholder="teacher@institution.edu"
                      className="input-field"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="input-label mb-1">Account Password</label>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">
                       {currentInstructor ? 'Leave blank to keep current' : 'Required for first time login'}
                    </p>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                      <input 
                        type={showPassword ? 'text' : 'password'}
                        required={!currentInstructor}
                        placeholder={currentInstructor ? "••••••••" : "Default password"}
                        className="input-field pl-10 pr-10"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-600 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {modalRole === 'admin' && (
                    <div className="pt-2">
                       <label className="input-label">Administrative Privileges</label>
                       <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl transition-all ${formData.can_add_admin ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                              <ShieldPlus size={20} />
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-800 tracking-tight">Management Access</p>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Can provision other administrators</p>
                            </div>
                          </div>
                          <button 
                            type="button"
                            onClick={() => setFormData({ ...formData, can_add_admin: !formData.can_add_admin })}
                            className={`w-12 h-6 rounded-full relative transition-all ${formData.can_add_admin ? 'bg-indigo-600' : 'bg-slate-300'}`}
                          >
                             <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.can_add_admin ? 'right-1' : 'left-1'}`}></div>
                          </button>
                       </div>
                    </div>
                  )}
                </div>

                <div className="modal-footer pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn-secondary flex-1"
                  >
                    Discard
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                    <span>{currentInstructor ? 'Save Changes' : 'Activate Account'}</span>
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
        message={`This will permanently deactivate account for "${currentInstructor?.name}". All access to institution data will be terminated.`}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
        isLoading={isSubmitting}
      />
    </DashboardLayout>
  );
};

export default Teachers;
