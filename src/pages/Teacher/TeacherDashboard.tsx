import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  GraduationCap, 
  Users, 
  ChevronRight,
  Loader2,
  Calendar,
  BookOpen,
  ClipboardList,
  Layers,
  LayoutDashboard,
  ArrowRight,
  UserCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import EmptyState from '../../components/EmptyState';

interface Batch {
  id: string;
  class_name: string;
  batch_year: number;
  batch_code: string;
  student_count?: number;
}

const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [collegeData, setCollegeData] = useState<any>(null);
  const [stats, setStats] = useState({ totalBatches: 0, totalStudents: 0, totalSubjects: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const fetchTeacherData = async () => {
    if (!user?.college_id) return;
    
    try {
      setIsLoading(true);
      
      const [batchesRes, collegeRes, subjectsRes] = await Promise.all([
        supabase
          .from('batches')
          .select('*, students(id)')
          .eq('college_id', user.college_id)
          .order('batch_year', { ascending: false }),
        supabase
          .from('colleges')
          .select('*')
          .eq('id', user.college_id)
          .single(),
        supabase
          .from('subjects')
          .select('id', { count: 'exact', head: true })
          .eq('college_id', user.college_id)
      ]);

      if (batchesRes.error) throw batchesRes.error;
      if (collegeRes.error) throw collegeRes.error;

      const formattedBatches = (batchesRes.data || []).map(b => ({
        ...b,
        student_count: (b.students as any[]).length
      }));

      const studentTotal = formattedBatches.reduce((acc, curr) => acc + (curr.student_count || 0), 0);
      
      setBatches(formattedBatches);
      setCollegeData(collegeRes.data);
      setStats({
        totalBatches: formattedBatches.length,
        totalStudents: studentTotal,
        totalSubjects: subjectsRes.count || 0
      });
      
    } catch (error: any) {
      toast.error('Failed to load dashboard metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacherData();
  }, [user]);

  return (
    <DashboardLayout title="Faculty Command Center">
      {/* Welcome Banner */}
      <div className="card bg-slate-900 border-none p-8 mb-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-primary-500/20 transition-all duration-500" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-white tracking-tight">
              Welcome back, <span className="text-primary-400">{user?.name}</span>
            </h1>
            <p className="text-slate-400 font-medium max-w-md">
              Monitoring academic progress and evaluating student performance for {collegeData?.college_name || 'Academic Institution'}.
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-4">
             <div className="text-right">
                <p className="text-[10px] font-black text-primary-400 uppercase tracking-widest leading-none">System Status</p>
                <p className="text-sm font-bold text-white mt-1">Operational</p>
             </div>
             <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-primary-400 border border-white/10">
                <LayoutDashboard size={24} />
             </div>
          </div>
        </div>
      </div>

      {/* Statistics Matrix */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <div className="badge bg-primary-100 text-primary-600">
            <Layers size={18} />
          </div>
          <div>
            <p className="stat-label">Total Batches</p>
            <p className="stat-value">{isLoading ? '...' : stats.totalBatches}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="badge bg-emerald-100 text-emerald-600">
            <UserCircle size={18} />
          </div>
          <div>
            <p className="stat-label">Students Under Oversight</p>
            <p className="stat-value">{isLoading ? '...' : stats.totalStudents}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="badge bg-indigo-100 text-indigo-600">
            <BookOpen size={18} />
          </div>
          <div>
            <p className="stat-label">Assigned Subjects</p>
            <p className="stat-value">{isLoading ? '...' : stats.totalSubjects}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="badge bg-amber-100 text-amber-600">
            <GraduationCap size={18} />
          </div>
          <div>
            <p className="stat-label">Academic Center</p>
            <p className="stat-value text-base">{collegeData?.college_code || '---'}</p>
          </div>
        </div>
      </div>

      {/* Batch Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Active Learning Cohorts</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Assigned Class Batches</p>
        </div>
        <button 
          onClick={() => navigate('/teacher/students')}
          className="btn-secondary flex items-center justify-center gap-2 px-6 h-11 bg-white"
        >
          <span>View All Students</span>
          <ArrowRight size={16} />
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-slate-100 rounded-[2rem] animate-pulse"></div>
          ))}
        </div>
      ) : batches.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches.map((batch) => (
            <motion.div
              key={batch.id}
              whileHover={{ y: -4, scale: 1.01 }}
              onClick={() => navigate(`/teacher/students?batchId=${batch.id}`)}
              className="card group cursor-pointer hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                  batch.class_name.includes('12') 
                    ? 'bg-purple-50 text-purple-600 border-purple-100' 
                    : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                }`}>
                  {batch.class_name}
                </span>
                <span className="text-xs font-bold text-slate-400 font-mono tracking-tighter">
                  {batch.batch_year}
                </span>
              </div>
              
              <div className="mb-6">
                <h3 className="text-xl font-black text-slate-800 tracking-tight group-hover:text-primary-600 transition-colors">
                  {batch.batch_code}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Cohort Batch Identifier</p>
              </div>

              <div className="flex items-center justify-between pt-5 border-t border-slate-50">
                <div className="flex items-center gap-2">
                  <UserCircle size={14} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-600">{batch.student_count || 0} Students</span>
                </div>
                <div className="w-8 h-8 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white transition-all">
                  <ArrowRight size={16} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="card p-12">
          <EmptyState 
            icon={ClipboardList}
            title="No Assigned Cohorts"
            message="Your faculty profile currently has no active batch mappings. Please coordinate with the institution administrator to link your administrative dashboard to specific academic cohorts."
          />
        </div>
      )}
    </DashboardLayout>
  );
};

export default TeacherDashboard;
