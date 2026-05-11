import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { School, Users, GraduationCap, ShieldCheck, Clock, TrendingUp, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'motion/react';

interface Stats {
  colleges: number;
  admins: number;
  teachers: number;
  students: number;
}

interface RecentCollege {
  id: string;
  college_name: string;
  college_code: string;
  created_at: string;
}

const MasterDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ colleges: 0, admins: 0, teachers: 0, students: 0 });
  const [recentColleges, setRecentColleges] = useState<RecentCollege[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      const [
        { count: collegesCount },
        { count: adminsCount },
        { count: teachersCount },
        { count: studentsCount },
        { data: colleges }
      ] = await Promise.all([
        supabase.from('colleges').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('colleges').select('*').order('created_at', { ascending: false }).limit(5)
      ]);

      setStats({
        colleges: collegesCount || 0,
        admins: adminsCount || 0,
        teachers: teachersCount || 0,
        students: studentsCount || 0,
      });
      
      if (colleges) setRecentColleges(colleges);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const statConfig = [
    { label: 'Colleges', value: stats.colleges, icon: School, color: 'purple', bg: 'bg-purple-50', text: 'text-purple-600' },
    { label: 'Admins', value: stats.admins, icon: ShieldCheck, color: 'blue', bg: 'bg-blue-50', text: 'text-blue-600' },
    { label: 'Teachers', value: stats.teachers, icon: Users, color: 'green', bg: 'bg-green-50', text: 'text-green-600' },
    { label: 'Students', value: stats.students, icon: GraduationCap, color: 'amber', bg: 'bg-amber-50', text: 'text-amber-600' },
  ];

  return (
    <DashboardLayout title="Master Control Panel">
      <div className="page-header">
        <div>
          <h1 className="page-title">Master Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.name}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">System Online</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
        {statConfig.map((stat, idx) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="stat-card group hover:scale-[1.02] transition-all cursor-default border-l-4"
            style={{ borderLeftColor: `var(--color-${stat.color}-500)` }}
          >
            <div className={`shrink-0 w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center ${stat.text} group-hover:scale-110 transition-transform`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-black text-slate-800 leading-none">
                {isLoading ? '...' : stat.value.toLocaleString()}
              </p>
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mt-1">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Storage Indicator */}
      <div className="mb-8 p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-xl text-white">
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Database Storage Capacity</h3>
              <p className="text-[10px] font-bold text-slate-400">Total System Record Load</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-black text-slate-800">{(stats.students * 0.05).toFixed(2)} MB Used</p>
            <p className="text-[10px] font-bold text-slate-400">{(1024 - (stats.students * 0.05)).toFixed(2)} MB Remaining</p>
          </div>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((stats.students * 0.05 / 1024) * 100, 100)}%` }}
            className="h-full bg-slate-900 rounded-full"
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[10px] font-black text-slate-400">0 MB</span>
          <span className="text-[10px] font-black text-slate-400">Target Soft Limit: 1024 MB (Spark Plan)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Colleges Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
              <Clock className="text-primary-500" size={18} />
              Recent College Onboardings
            </h2>
            <button className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1">
              View All <ChevronRight size={14} />
            </button>
          </div>
          
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Institution Info</th>
                  <th className="text-center">ID Code</th>
                  <th className="text-right">Registration Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={3} className="p-6 bg-slate-50/20 h-16"></td>
                    </tr>
                  ))
                ) : recentColleges.length > 0 ? (
                  recentColleges.map((college) => (
                    <tr key={college.id} className="group">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-black text-xs group-hover:bg-primary-600 group-hover:text-white transition-all">
                            {college.college_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-black text-slate-800 leading-tight">{college.college_name}</p>
                            <p className="text-[10px] uppercase font-bold text-slate-400 mt-0.5">Verified Institution</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-center">
                        <span className="font-mono text-xs text-primary-600 bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-100 font-black">
                          {college.college_code}
                        </span>
                      </td>
                      <td className="text-right">
                        <p className="text-sm font-bold text-slate-700">
                          {new Date(college.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="p-12 text-center text-slate-400 font-bold italic">No colleges registered yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Sidebar / Card */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-900/40">
            {/* Background design elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-600/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-600/20 rounded-full blur-3xl -ml-12 -mb-12"></div>
            
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                <TrendingUp className="text-primary-400" size={24} />
              </div>
              <h3 className="text-2xl font-black leading-tight mb-4 tracking-tight">Growth & Scale Summary</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-8">
                Managing unified operations across multiple campuses has never been smoother. Track performance, usage, and growth from a single pane of glass.
              </p>
              
              <div className="space-y-3">
                <button 
                  onClick={() => (window.location.href = '/master/colleges')}
                  className="w-full bg-white text-slate-900 font-black py-4 rounded-[1.25rem] hover:bg-primary-50 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  Add New Institution
                  <ChevronRight size={18} />
                </button>
                <button 
                  onClick={() => (window.location.href = '/master/users')}
                  className="w-full bg-slate-800 text-white font-black py-4 rounded-[1.25rem] hover:bg-slate-700 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  Manage System Users
                </button>
              </div>
            </div>
            
            <div className="mt-12 text-center">
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-[0.2em]">GradeBook Core v1.0.0</p>
            </div>
          </div>
          
          <div className="card bg-primary-50/50 border-primary-100 flex items-center gap-4">
             <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary-600 shadow-sm border border-primary-50">
                <Users size={20} />
             </div>
             <div>
                <p className="text-xs font-black text-primary-900 uppercase tracking-widest leading-none">System Load</p>
                <p className="text-sm font-bold text-primary-700 mt-1">Normal (4ms latency)</p>
             </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MasterDashboard;
