import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { 
  Users, 
  Search, 
  School, 
  Layers, 
  ArrowRight,
  Filter,
  UserCircle,
  Hash,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

interface College {
  id: string;
  college_name: string;
  college_code: string;
}

interface Batch {
  id: string;
  class_name: string;
  batch_year: string;
  batch_code: string;
  college_id: string;
}

interface Student {
  id: string;
  student_name: string;
  roll_number: string;
  batch_id: string;
  batches: Batch;
  college_id: string; // From batch
}

const GlobalStudents: React.FC = () => {
  const [colleges, setColleges] = useState<College[]>([]);
  const [selectedCollege, setSelectedCollege] = useState<string>('all');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedCollege !== 'all') {
      fetchBatches(selectedCollege);
    } else {
      setBatches([]);
      setSelectedBatch('all');
    }
    fetchStudents();
  }, [selectedCollege]);

  useEffect(() => {
    fetchStudents();
  }, [selectedBatch]);

  const fetchInitialData = async () => {
    try {
      const { data, error } = await supabase
        .from('colleges')
        .select('id, college_name, college_code')
        .order('college_name');
      
      if (error) throw error;
      setColleges(data || []);
      setLoading(false);
    } catch (err: any) {
      toast.error('Error loading colleges: ' + err.message);
      setLoading(false);
    }
  };

  const fetchBatches = async (collegeId: string) => {
    try {
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('college_id', collegeId)
        .order('class_name');
      
      if (error) throw error;
      setBatches(data || []);
    } catch (err: any) {
      toast.error('Error loading batches: ' + err.message);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('students')
        .select(`
          *,
          batches:batch_id (
            *,
            colleges:college_id (*)
          )
        `);

      if (selectedBatch !== 'all') {
        query = query.eq('batch_id', selectedBatch);
      } else if (selectedCollege !== 'all') {
        // Since we don't have college_id directly on student (based on description),
        // we filter via batch's college_id relation if possible, or just fetch all
        // and filter in local state if the query is too complex for simple RLS/Filter.
        // Actually batch_id is in batches table which has college_id.
        
        // Find all batch IDs for this college
        const { data: collegeBatches } = await supabase
          .from('batches')
          .select('id')
          .eq('college_id', selectedCollege);
        
        const batchIds = collegeBatches?.map(b => b.id) || [];
        if (batchIds.length > 0) {
          query = query.in('batch_id', batchIds);
        } else {
          // If no batches, no students
          setStudents([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query.order('student_name');
      if (error) throw error;
      setStudents(data || []);
    } catch (err: any) {
      toast.error('Error loading students: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.roll_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout title="Global Student Directory">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Student Directory</h2>
            <p className="text-slate-500 font-medium mt-1">View and search students across all colleges system-wide</p>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-100 rounded-2xl shadow-sm">
            <Users size={20} className="text-primary-500" />
            <span className="text-lg font-black text-slate-700">{students.length}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Total Loaded</span>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-3xl border-2 border-slate-100 p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <School size={14} />
                Filter by College
              </label>
              <select
                value={selectedCollege}
                onChange={(e) => setSelectedCollege(e.target.value)}
                className="w-full h-12 px-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-2xl outline-none transition-all font-bold text-slate-700 appearance-none cursor-pointer"
              >
                <option value="all">All Colleges</option>
                {colleges.map(college => (
                  <option key={college.id} value={college.id}>{college.college_name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Layers size={14} />
                Filter by Batch
              </label>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                disabled={selectedCollege === 'all'}
                className="w-full h-12 px-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-2xl outline-none transition-all font-bold text-slate-700 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="all">All Batches</option>
                {batches.map(batch => (
                  <option key={batch.id} value={batch.id}>{batch.class_name} ({batch.batch_year})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Search size={14} />
                Search Student
              </label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Name or Roll Number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-2xl outline-none transition-all font-bold text-slate-700"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Students List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-slate-50 h-40 rounded-3xl animate-pulse border-2 border-slate-100" />
              ))
            ) : filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={student.id}
                  className="bg-white rounded-3xl border-2 border-slate-100 p-5 hover:border-primary-200 transition-all group shadow-sm"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                        <UserCircle size={28} />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800 leading-tight">{student.student_name}</h4>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Hash size={10} className="text-slate-400" />
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{student.roll_number}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl">
                      <School size={14} className="text-slate-400" />
                      <span className="text-[11px] font-bold text-slate-600 truncate">{student.batches.colleges.college_name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl">
                      <Layers size={14} className="text-slate-400" />
                      <span className="text-[11px] font-bold text-slate-600">{student.batches.class_name}</span>
                      <div className="w-1 h-1 rounded-full bg-slate-300 mx-1" />
                      <Calendar size={14} className="text-slate-400" />
                      <span className="text-[11px] font-bold text-slate-600">{student.batches.batch_year}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t-2 border-slate-50 flex justify-end">
                    <div className="text-[10px] font-black text-primary-500 uppercase tracking-widest flex items-center gap-1">
                      Batch Code: {student.batches.batch_code}
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-20 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mx-auto mb-4 border-2 border-slate-100">
                  <Filter size={40} />
                </div>
                <h4 className="text-lg font-black text-slate-700">No students found</h4>
                <p className="text-sm text-slate-400 font-bold mt-1 max-w-xs mx-auto">
                  Try adjusting your filters or search query to find the students you're looking for.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default GlobalStudents;
