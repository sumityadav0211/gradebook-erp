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
  School, 
  Hash, 
  Loader2,
  AlertCircle 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';

import ImageUpload from '../../components/ImageUpload';

interface College {
  id: string;
  college_name: string;
  college_code: string;
  logo_url?: string;
  portrait_url?: string;
  slogan?: string;
  sub_slogan?: string;
  address?: string;
  institute_name?: string;
  registration_number?: string;
  created_at: string;
}

const Colleges: React.FC = () => {
  const [colleges, setColleges] = useState<College[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentCollege, setCurrentCollege] = useState<College | null>(null);
  const [formData, setFormData] = useState({ 
    college_name: '', 
    college_code: '',
    logo_url: '',
    portrait_url: '',
    slogan: '',
    sub_slogan: '',
    address: '',
    institute_name: '',
    registration_number: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const [dbStatus, setDbStatus] = useState<{ sloganSupported: boolean }>({ sloganSupported: true });

  const fetchColleges = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('colleges')
        .select('*')
        .order('college_name', { ascending: true });
      
      if (error) throw error;
      const collegesData = data || [];
      setColleges(collegesData);

      // Check if slogan columns exist by looking at the keys of the first returned object (if any)
      if (collegesData.length > 0) {
        setDbStatus({ 
          sloganSupported: 'slogan' in collegesData[0] 
        });
      }
    } catch (error: any) {
      toast.error('Failed to load colleges');
      console.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchColleges();
  }, []);

  const openModal = (college: College | null = null) => {
    if (college) {
      setCurrentCollege(college);
      setFormData({ 
        college_name: college.college_name, 
        college_code: college.college_code,
        logo_url: college.logo_url || '',
        portrait_url: college.portrait_url || '',
        slogan: college.slogan || '',
        sub_slogan: college.sub_slogan || '',
        address: college.address || '',
        institute_name: college.institute_name || '',
        registration_number: college.registration_number || ''
      });
    } else {
      setCurrentCollege(null);
      setFormData({ 
        college_name: '', 
        college_code: '',
        logo_url: '',
        portrait_url: '',
        slogan: '',
        sub_slogan: '',
        address: '',
        institute_name: '',
        registration_number: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.college_name || !formData.college_code) {
      toast.error('All fields are required');
      return;
    }

    setIsSubmitting(true);
    const upperCode = formData.college_code.toUpperCase();

    try {
      const collegeData = { 
        college_name: formData.college_name, 
        college_code: upperCode,
        logo_url: formData.logo_url,
        portrait_url: formData.portrait_url,
        slogan: formData.slogan,
        sub_slogan: formData.sub_slogan,
        address: formData.address,
        institute_name: formData.institute_name,
        registration_number: formData.registration_number
      };

      const collegeDataLegacy = { 
        college_name: formData.college_name, 
        college_code: upperCode
      };

      if (currentCollege) {
        // Try update with new columns
        const { error } = await supabase
          .from('colleges')
          .update(collegeData)
          .eq('id', currentCollege.id);
        
        if (error) {
          // If columns don't exist, try legacy update
          if (error.code === '42703' || error.message?.includes('schema cache') || error.message?.includes('column')) {
            const { error: legacyError } = await supabase
              .from('colleges')
              .update(collegeDataLegacy)
              .eq('id', currentCollege.id);
            if (legacyError) throw legacyError;
            
            if (formData.slogan || formData.logo_url) {
              toast((t) => (
                <span className="flex flex-col gap-1">
                  <b className="text-amber-600">Partial Save Success</b>
                  <span className="text-xs">Slogan/Logo couldn't be saved. Please run SQL in System Health to enable these features.</span>
                </span>
              ), { icon: '⚠️', duration: 6000 });
            } else {
              toast.success('College updated successfully');
            }
          } else {
            throw error;
          }
        } else {
          toast.success('College updated successfully');
        }
      } else {
        // Try create with new columns
        const { error } = await supabase
          .from('colleges')
          .insert([collegeData]);
        
        if (error) {
          // If columns don't exist, try legacy insert
          if (error.code === '42703' || error.message?.includes('schema cache') || error.message?.includes('column')) {
            const { error: legacyError } = await supabase
              .from('colleges')
              .insert([collegeDataLegacy]);
            if (legacyError) throw legacyError;

            if (formData.slogan || formData.logo_url) {
              toast((t) => (
                <span className="flex flex-col gap-1">
                  <b className="text-amber-600">Created with Warnings</b>
                  <span className="text-xs">Slogan/Logo ignored. Run SQL in System Health to enable.</span>
                </span>
              ), { icon: '⚠️', duration: 6000 });
            } else {
              toast.success('New college onboarded');
            }
          } else {
            throw error;
          }
        } else {
          toast.success('New college onboarded');
        }
      }
      
      setIsModalOpen(false);
      fetchColleges();
    } catch (error: any) {
      toast.error(error.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!currentCollege) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('colleges')
        .delete()
        .eq('id', currentCollege.id);
      
      if (error) throw error;
      toast.success('College removed from system');
      setIsDeleteModalOpen(false);
      fetchColleges();
    } catch (error: any) {
      toast.error('Cannot delete: This college may have active users/data');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredColleges = colleges.filter(c => 
    c.college_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.college_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout title="System Registry">
      <div className="page-header">
        <div>
          <h1 className="page-title">Institution Registry</h1>
          <p className="page-subtitle">Global oversight and configuration of higher education campuses</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="btn-primary flex items-center justify-center gap-2 px-8 h-14 shadow-xl shadow-primary-600/20 active:scale-95 transition-all"
        >
          <Plus size={20} />
          <span className="uppercase text-[10px] font-black tracking-[0.2em]">Onboard College</span>
        </button>
      </div>

      {!dbStatus.sloganSupported && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="mb-8 overflow-hidden"
        >
          <div className="bg-amber-50 border border-amber-200 rounded-[2rem] p-6 flex gap-5 items-start shadow-sm">
             <div className="bg-amber-100 p-3 rounded-2xl text-amber-600 shadow-inner">
                <AlertCircle size={24} />
             </div>
             <div className="flex-1">
                <h4 className="text-sm font-black text-amber-900 uppercase tracking-widest">Database Schema Notice</h4>
                <p className="text-xs text-amber-700 mt-1 font-medium leading-loose">
                   The "Slogan" and "Logo" visual assets are currently in read-only mode because your cloud database table requires a schema expansion.
                </p>
                <div className="mt-4 flex items-center gap-4">
                   <button 
                     onClick={() => navigate('/master/health')}
                     className="text-[10px] font-black uppercase tracking-widest bg-amber-600 text-white px-5 py-2.5 rounded-xl hover:bg-amber-700 transition-all shadow-lg shadow-amber-600/20"
                   >
                     Update Database Schema
                   </button>
                   <span className="text-[10px] font-bold text-amber-400 italic">Immediate action required for full feature set</span>
                </div>
             </div>
          </div>
        </motion.div>
      )}

      <div className="mb-10 relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={22} />
        <input 
          type="text"
          placeholder="Lookup institution by name, registry code, or location..."
          className="input-field pl-14 h-16 bg-white border-slate-100 shadow-sm text-sm font-bold placeholder:text-slate-300"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="absolute right-5 top-1/2 -translate-y-1/2 px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:block">
           Global Index: {colleges.length}
        </div>
      </div>

      {/* Colleges Card Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-slate-100 rounded-[2rem] animate-pulse"></div>
          ))}
        </div>
      ) : filteredColleges.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredColleges.map((college) => (
            <motion.div 
              key={college.id}
              whileHover={{ scale: 1.01, translateY: -2 }}
              className="card group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    {college.logo_url ? (
                      <img 
                        src={college.logo_url} 
                        alt="logo" 
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-2xl object-cover border border-slate-100 shadow-sm" 
                      />
                    ) : (
                      <div className="w-14 h-14 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center font-black text-xl border border-primary-100">
                        {college.college_name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <span className="font-mono text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded uppercase tracking-widest border border-slate-200">
                        {college.college_code}
                      </span>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">
                        {new Date(college.created_at).getFullYear()} Onboarding
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-xl font-black text-slate-800 tracking-tight leading-tight group-hover:text-primary-600 transition-colors">
                    {college.college_name}
                  </h3>
                  {college.institute_name && (
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      {college.institute_name}
                    </p>
                  )}
                  {college.slogan && (
                    <p className="text-sm font-bold text-primary-600/80 italic mt-3 leading-snug">
                      "{college.slogan}"
                    </p>
                  )}
                  {college.address && (
                    <div className="flex items-start gap-2 mt-4 text-slate-500">
                      <p className="text-xs font-medium leading-relaxed italic line-clamp-2">
                         📍 {college.address}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-5 border-t border-slate-50">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full bg-emerald-500 animate-pulse`}></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active System</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openModal(college)}
                      className="btn-icon hover:bg-primary-50 hover:text-primary-600"
                      title="Configurations"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => { setCurrentCollege(college); setIsDeleteModalOpen(true); }}
                      className="btn-icon hover:bg-red-50 hover:text-red-600"
                      title="Deactivate"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="card p-12">
          <EmptyState 
            icon={School}
            title={searchTerm ? "No institutions match" : "Registry Empty"}
            message={searchTerm ? `No academic centers matching "${searchTerm}" found in system.` : "Onboard your first higher education campus to begin global oversight."}
          />
        </div>
      )}

      {/* Onboarding Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="modal-overlay">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="modal-box w-full max-w-2xl"
            >
              <div className="modal-header">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-100 rounded-xl text-primary-600">
                    <School size={20} />
                  </div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">
                    {currentCollege ? 'Institution Config' : 'Global Onboarding'}
                  </h2>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="btn-icon">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="divide-y divide-slate-100">
                <div className="modal-body overflow-y-auto max-h-[70vh] p-8 space-y-8">
                  {/* Basic Info Section */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-2">Institutional Identity</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="input-label">University / Sanstha Name</label>
                        <input 
                          type="text"
                          placeholder="e.g. SHREE SWAMI VIVEKANAND SHIKSHAN SANSTHA"
                          className="input-field"
                          value={formData.institute_name}
                          onChange={(e) => setFormData({ ...formData, institute_name: e.target.value.toUpperCase() })}
                        />
                      </div>
                      <div>
                        <label className="input-label">College Name <span className="text-red-500">*</span></label>
                        <input 
                          type="text"
                          required
                          placeholder="e.g. ROYAL ACADEMY OF SCIENCE"
                          className="input-field"
                          value={formData.college_name}
                          onChange={(e) => setFormData({ ...formData, college_name: e.target.value.toUpperCase() })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="input-label">Institution Code <span className="text-red-500">*</span></label>
                          <div className="relative">
                            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                            <input 
                              type="text"
                              required
                              placeholder="e.g. RAS042"
                              className="input-field pl-10 font-mono"
                              value={formData.college_code}
                              onChange={(e) => setFormData({ ...formData, college_code: e.target.value.toUpperCase() })}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="input-label">Registration No.</label>
                          <input 
                            type="text"
                            placeholder="e.g. COL-REG-123"
                            className="input-field"
                            value={formData.registration_number}
                            onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Slogans & Address Section */}
                  <div className="pt-8 space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-2">Academic Presence</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="input-label">Main Slogan</label>
                        <input 
                          type="text"
                          placeholder="e.g. Knowledge is Power"
                          className="input-field"
                          value={formData.slogan}
                          onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="input-label">Secondary Slogan</label>
                        <input 
                          type="text"
                          placeholder="e.g. Estd. 1990"
                          className="input-field"
                          value={formData.sub_slogan}
                          onChange={(e) => setFormData({ ...formData, sub_slogan: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="input-label">Campus Address</label>
                      <textarea 
                        placeholder="Complete postal address of the campus..."
                        className="input-field min-h-[80px] py-3 resize-none"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Image Assets Section */}
                  <div className="pt-8 space-y-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50 pb-2">Visual Branding</h3>
                    <div className="grid grid-cols-2 gap-6">
                      <ImageUpload 
                        bucket="documents"
                        path={`college-logo-${currentCollege?.id || 'new'}`}
                        label="Institution Logo"
                        currentUrl={formData.logo_url}
                        onUploadComplete={(url) => setFormData(prev => ({ ...prev, logo_url: url }))}
                      />
                      <ImageUpload 
                        bucket="documents"
                        path={`college-portrait-${currentCollege?.id || 'new'}`}
                        label="Founder Portrait"
                        currentUrl={formData.portrait_url}
                        onUploadComplete={(url) => setFormData(prev => ({ ...prev, portrait_url: url }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer p-8">
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
                    <span>{currentCollege ? 'Update Campus' : 'Finalize Onboarding'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog 
        isOpen={isDeleteModalOpen}
        title="Sanitize Record?"
        message={`This will permanently purge "${currentCollege?.college_name}" and its associated root configurations from the ERP index.`}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteModalOpen(false)}
        isLoading={isSubmitting}
      />
    </DashboardLayout>
  );
};

export default Colleges;
