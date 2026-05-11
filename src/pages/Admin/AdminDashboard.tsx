import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  ClipboardList, 
  ChevronRight,
  Loader2,
  Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { motion } from 'motion/react';

interface Stats {
  batches: number;
  students: number;
  subjects: number;
  exams: number;
}

interface Batch {
  id: string;
  class_name: string;
  batch_year: string;
  batch_code: string;
  student_count?: number;
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ batches: 0, students: 0, subjects: 0, exams: 0 });
  const [batches, setBatches] = useState<Batch[]>([]);
  const [activeTab, setActiveTab] = useState<'11th' | '12th'>('11th');
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    if (!user?.college_id) return;
    
    try {
      setIsLoading(true);
      
      const [
        { count: batchesCount },
        { count: subjectsCount }
      ] = await Promise.all([
        supabase.from('batches').select('*', { count: 'exact', head: true }).eq('college_id', user.college_id),
        supabase.from('subjects').select('*', { count: 'exact', head: true }).eq('college_id', user.college_id)
      ]);

      const { count: realStudents } = await supabase
        .from('students')
        .select('id, batches!inner(college_id)', { count: 'exact', head: true })
        .eq('batches.college_id', user.college_id);

      const { count: realExams } = await supabase
        .from('exams')
        .select('id, batches!inner(college_id)', { count: 'exact', head: true })
        .eq('batches.college_id', user.college_id);

      setStats({
        batches: batchesCount || 0,
        students: realStudents || 0,
        subjects: subjectsCount || 0,
        exams: realExams || 0,
      });

      const { data: batchesData, error: batchesError } = await supabase
        .from('batches')
        .select('*, students(id)')
        .eq('college_id', user.college_id)
        .order('batch_year', { ascending: false });

      if (batchesError) throw batchesError;

      const formattedBatches = (batchesData || []).map(b => ({
        ...b,
        student_count: (b.students as any[]).length
      }));

      setBatches(formattedBatches);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Partial data failure: Could not load all metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const filteredByClass = batches.filter(b => b.class_name.startsWith(activeTab));

  const statItems = [
    { label: 'Active Batches', value: stats.batches, icon: GraduationCap, color: 'blue' },
    { label: 'Enrolled Students', value: stats.students, icon: Users, color: 'indigo' },
    { label: 'Course Subjects', value: stats.subjects, icon: BookOpen, color: 'emerald' },
    { label: 'Scheduled Exams', value: stats.exams, icon: ClipboardList, color: 'amber' },
  ];

  return (
    <DashboardLayout title="College Management Dashboard">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.name}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-slate-100 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">College Live</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        {statItems.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="stat-card"
          >
            <div className={`shrink-0 w-10 sm:w-12 h-10 sm:h-12 bg-${stat.color}-50 text-${stat.color}-600 rounded-xl flex items-center justify-center shadow-sm`}>
              <stat.icon size={20} />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-black text-slate-900 leading-none">
                {isLoading ? '...' : stat.value}
              </p>
              <p className="text-[10px] uppercase font-bold text-slate-400 mt-1 tracking-wider">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="card">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">Cohort Overview</h2>
            <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Academic Class Batches</p>
          </div>
          
          <div className="flex p-1 bg-slate-100 rounded-2xl w-full md:w-auto">
            <button 
              onClick={() => setActiveTab('11th')}
              className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${
                activeTab === '11th' 
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              11th Standard
            </button>
            <button 
              onClick={() => setActiveTab('12th')}
              className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${
                activeTab === '12th' 
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              12th Standard
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-44 bg-slate-50 rounded-2xl animate-pulse"></div>)}
          </div>
        ) : filteredByClass.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredByClass.map((batch, idx) => (
              <motion.button 
                key={batch.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => navigate(`/admin/batches/${batch.id}/students`)}
                className="group relative flex flex-col p-5 sm:p-6 bg-white rounded-2xl border border-slate-100 hover:border-primary-200 hover:shadow-xl hover:shadow-primary-600/5 transition-all text-left"
              >
                <div className="flex justify-between items-start mb-6">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                    batch.class_name.startsWith('11') ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-purple-50 text-purple-600 border-purple-100'
                  }`}>
                    {batch.class_name.split(' (')[0]}
                  </span>
                  <div className="bg-slate-50 p-2 rounded-xl text-slate-400 group-hover:text-primary-500 group-hover:bg-primary-50 transition-colors">
                    <Calendar size={18} />
                  </div>
                </div>
                
                <h4 className="text-xl font-black text-slate-800 group-hover:text-primary-700 transition-colors tracking-tight">{batch.batch_code}</h4>
                <div className="flex items-center gap-2 mt-1">
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{batch.batch_year} Academic Cycle</p>
                </div>
                
                <div className="mt-8 pt-5 border-t border-slate-50 flex justify-between items-center group-hover:border-primary-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-xs font-black text-slate-600 group-hover:bg-primary-50 group-hover:text-primary-600 transition-all">
                      {batch.student_count}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Enrollment</p>
                      <p className="text-xs font-bold text-slate-700 mt-1">Active Students</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-primary-600 group-hover:text-white group-hover:translate-x-1 transition-all">
                    <ChevronRight size={16} />
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-white shadow-sm rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
              <GraduationCap size={32} />
            </div>
            <h3 className="text-slate-800 font-black tracking-tight">No active batches for Class {activeTab}</h3>
            <p className="text-slate-400 text-sm mt-1 max-w-xs mx-auto">Establish administrative cohorts to begin managing students and evaluation records.</p>
            <button 
              onClick={() => navigate('/admin/batches')}
              className="mt-6 px-6 py-2.5 bg-primary-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary-700 active:scale-95 transition-all shadow-lg shadow-primary-600/20"
            >
              Create New Batch
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
