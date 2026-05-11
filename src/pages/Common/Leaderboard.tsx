import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Search, 
  Filter, 
  ChevronDown, 
  Medal, 
  TrendingUp,
  Loader2,
  Users,
  Star,
  ArrowUpRight
} from 'lucide-react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import EmptyState from '../../components/EmptyState';

interface RankingData {
  id: string;
  name: string;
  rollNumber: string;
  totalGained: number;
  totalOut: number;
  percentage: number;
  rank: number;
}

const Leaderboard: React.FC = () => {
  const { user } = useAuth();
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [rankings, setRankings] = useState<RankingData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBatches();
  }, [user]);

  const fetchBatches = async () => {
    if (!user?.college_id) return;
    try {
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('college_id', user.college_id)
        .order('batch_code', { ascending: true });
      
      if (error) throw error;
      setBatches(data || []);
      if (data && data.length > 0) {
        setSelectedBatchId(data[0].id);
      }
    } catch (err: any) {
      toast.error('Failed to load batches');
    }
  };

  useEffect(() => {
    if (selectedBatchId) {
      calculateRankings();
    }
  }, [selectedBatchId]);

  const calculateRankings = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch all students in batch
      // 2. Fetch all exams in batch
      // 3. Fetch all results for these students
      const [
        { data: students, error: sErr },
        { data: exams, error: eErr },
        { data: results, error: rErr }
      ] = await Promise.all([
        supabase.from('students').select('*').eq('batch_id', selectedBatchId),
        supabase.from('exams').select('*').eq('batch_id', selectedBatchId),
        supabase.from('results').select('*, exams(*)').eq('student_id', 'all') // We'll filter later or fetch better
      ]);

      // Optimize: Fetch results related to the batch members
      const { data: batchResults, error: brErr } = await supabase
        .from('results')
        .select('*, exams(out_of_marks)')
        .in('student_id', (students || []).map(s => s.id));

      if (sErr || eErr || brErr) throw new Error('Failed to fetch performance data');

      const studentStats: RankingData[] = (students || []).map(student => {
        const studentResults = (batchResults || []).filter(r => r.student_id === student.id);
        
        // Sum up marks
        let gained = 0;
        let outOf = 0;

        studentResults.forEach(res => {
          gained += res.gained_marks || 0;
          outOf += res.exams?.out_of_marks || 0;
        });

        const pct = outOf > 0 ? (gained / outOf) * 100 : 0;

        return {
          id: student.id,
          name: student.student_name,
          rollNumber: student.roll_number,
          totalGained: gained,
          totalOut: outOf,
          percentage: parseFloat(pct.toFixed(2)),
          rank: 0
        };
      });

      // Sort by percentage descending
      const sorted = studentStats.sort((a, b) => b.percentage - a.percentage);
      
      // Assign ranks
      const ranked = sorted.map((s, index) => ({ ...s, rank: index + 1 }));
      
      setRankings(ranked);
    } catch (err: any) {
      console.error(err);
      toast.error('Performance calculation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRankings = rankings.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.rollNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRankBadge = (rank: number) => {
    switch(rank) {
      case 1: return <Medal className="text-amber-400" size={24} />;
      case 2: return <Medal className="text-slate-400" size={24} />;
      case 3: return <Medal className="text-amber-700" size={24} />;
      default: return <span className="w-6 text-center font-black text-slate-300">#{rank}</span>;
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
                <Trophy size={24} />
              </div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Merit Rankings</h1>
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Batch Performance Leaderboard</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="pl-12 pr-10 py-4 bg-white border border-slate-100 rounded-2xl outline-none font-black text-slate-700 shadow-sm appearance-none focus:ring-4 focus:ring-amber-500/10 transition-all min-w-[200px]"
              >
                {batches.map(v => (
                  <option key={v.id} value={v.id}>{v.class_name} ({v.batch_code})</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Find student..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl outline-none font-black text-slate-700 shadow-sm focus:ring-4 focus:ring-amber-500/10 transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="animate-spin text-amber-500" size={48} />
          <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Computing Ranks...</p>
        </div>
      ) : filteredRankings.length > 0 ? (
        <div className="space-y-8">
          {/* Top 3 Spotlight */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredRankings.slice(0, 3).map((student) => (
              <div 
                key={student.id}
                className={`relative p-8 rounded-[2.5rem] border-2 flex flex-col items-center text-center overflow-hidden transition-all hover:-translate-y-1 ${
                  student.rank === 1 ? 'bg-amber-50 border-amber-200' :
                  student.rank === 2 ? 'bg-slate-50 border-slate-200' :
                  'bg-orange-50 border-orange-200'
                }`}
              >
                <div className={`p-4 rounded-full mb-4 shadow-xl ${
                  student.rank === 1 ? 'bg-amber-400 text-white' :
                  student.rank === 2 ? 'bg-slate-400 text-white' :
                  'bg-amber-700 text-white'
                }`}>
                  <Star size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-900 leading-tight mb-1">{student.name}</h3>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Roll: {student.rollNumber}</p>
                
                <div className="mt-auto pt-6 border-t border-slate-200 w-full flex items-center justify-center gap-6">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Percent</p>
                    <p className="text-2xl font-black text-slate-900">{student.percentage}%</p>
                  </div>
                  <div className="w-[1px] h-8 bg-slate-200" />
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Rank</p>
                    <p className="text-2xl font-black text-slate-900">#{student.rank}</p>
                  </div>
                </div>

                <div className="absolute -right-4 -bottom-4 opacity-5 pointer-events-none">
                   <Trophy size={160} />
                </div>
              </div>
            ))}
          </div>

          {/* Ranking Table */}
          <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
             <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 w-24">Rank</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Student Info</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Score</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Percentage</th>
                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredRankings.map((student) => (
                    <tr key={student.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="p-6">
                        <div className="flex items-center justify-center">
                          {getRankBadge(student.rank)}
                        </div>
                      </td>
                      <td className="p-6">
                        <div>
                          <p className="font-black text-slate-900 text-lg group-hover:text-amber-600 transition-colors">{student.name}</p>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Roll Number: {student.rollNumber}</p>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="font-black text-slate-700">
                          {student.totalGained}
                          <span className="text-slate-300 text-sm font-bold ml-1">/ {student.totalOut}</span>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl">
                          <TrendingUp size={14} className={student.percentage >= 75 ? 'text-emerald-500' : 'text-slate-400'} />
                          <span className={`font-black ${student.percentage >= 75 ? 'text-emerald-600' : 'text-slate-900'}`}>
                            {student.percentage}%
                          </span>
                        </div>
                      </td>
                      <td className="p-6 text-right">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          student.percentage >= 60 ? 'bg-emerald-50 text-emerald-600' :
                          student.percentage >= 35 ? 'bg-amber-50 text-amber-600' :
                          'bg-red-50 text-red-600'
                        }`}>
                          {student.percentage >= 35 ? 'Qualified' : 'Detained'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[3rem] border border-slate-100 py-24">
          <EmptyState 
            title="No Performance Data"
            description="Either there are no students in this batch or no results have been recorded yet."
            actionText="Refresh Stats"
            onAction={calculateRankings}
          />
        </div>
      )}
    </DashboardLayout>
  );
};

export default Leaderboard;
