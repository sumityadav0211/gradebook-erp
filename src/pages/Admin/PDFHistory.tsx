import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, Search, Filter, Trash2, 
  ExternalLink, Loader2, Calendar, 
  LayoutGrid, List as ListIcon, 
  ChevronDown, RefreshCw, AlertCircle
} from 'lucide-react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import ConfirmDialog from '../../components/ConfirmDialog';
import PDFHistoryCard from '../../components/PDF/PDFHistoryCard';
import EmptyState from '../../components/EmptyState';

const PDFHistory: React.FC = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [deleteItem, setDeleteItem] = useState<{id: string, url: string} | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  const fetchData = useCallback(async () => {
    if (!user?.college_id) return;
    setIsLoading(true);
    try {
      // Fetch batches and exams for filters
      const [batchesRes, examsRes] = await Promise.all([
        supabase.from('batches').select('*').eq('college_id', user.college_id).order('batch_code'),
        supabase.from('exams').select('*').order('created_at', { ascending: false })
      ]);

      setBatches(batchesRes.data || []);
      setExams(examsRes.data || []);

      // Fetch history
      let query = supabase
        .from('pdf_records')
        .select(`
          *,
          students (student_name, roll_number, batch_id),
          exams (exam_name)
        `)
        .eq('college_id', user.college_id)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      setRecords(data || []);
    } catch (err: any) {
      toast.error('Failed to load history');
    } finally {
      setTimeout(() => setIsLoading(false), 500);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const confirmDelete = (id: string, storageUrl: string) => {
    setDeleteItem({ id, url: storageUrl });
  };

  const handleDelete = useCallback(async () => {
    if (!deleteItem) return;
    
    const { id, url: storageUrl } = deleteItem;
    setIsDeleting(id);
    try {
      // 1. Delete from database first
      const { error: dbError } = await supabase.from('pdf_records').delete().eq('id', id);
      if (dbError) throw dbError;

      // 2. Extract path from URL to delete from storage
      // Robust path extraction
      try {
        if (storageUrl && storageUrl.includes('result-pdfs')) {
          const pathParts = storageUrl.split('result-pdfs/');
          if (pathParts.length > 1) {
            const filePath = pathParts[1].split('?')[0]; // Remove query params if any
            await supabase.storage.from('result-pdfs').remove([filePath]);
          }
        }
      } catch (storageErr) {
        console.error('Storage deletion skipped or failed:', storageErr);
        // We don't fail the whole operation if storage deletion fails but DB succeeded
      }

      setRecords(prev => prev.filter(r => r.id !== id));
      toast.success('Record purged from archives');
    } catch (err: any) {
      console.error('Purge error:', err);
      toast.error(err.message || 'Purge operation failed');
    } finally {
      setIsDeleting(null);
      setDeleteItem(null);
    }
  }, [deleteItem, records]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;
    
    setIsBulkDeleting(true);
    const loadingToast = toast.loading(`Purging ${selectedIds.length} archives...`);
    
    try {
      const recordsToDelete = records.filter(r => selectedIds.includes(r.id));
      
      // 1. Delete from database
      const { error: dbError } = await supabase.from('pdf_records').delete().in('id', selectedIds);
      if (dbError) throw dbError;

      // 2. Delete from storage
      try {
        const filePaths = recordsToDelete
          .map(r => {
            if (!r.storage_url || !r.storage_url.includes('result-pdfs')) return null;
            const pathParts = r.storage_url.split('result-pdfs/');
            return pathParts.length > 1 ? pathParts[1].split('?')[0] : null;
          })
          .filter(p => p !== null) as string[];

        if (filePaths.length > 0) {
          await supabase.storage.from('result-pdfs').remove(filePaths);
        }
      } catch (storageErr) {
        console.error('Bulk storage deletion issues:', storageErr);
      }

      setRecords(prev => prev.filter(r => !selectedIds.includes(r.id)));
      setSelectedIds([]);
      toast.success('Batch purge successful', { id: loadingToast });
    } catch (err: any) {
      console.error('Batch purge error:', err);
      toast.error('Batch purge failed', { id: loadingToast });
    } finally {
      setIsBulkDeleting(false);
      setShowBulkConfirm(false);
    }
  }, [selectedIds, records]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRecords.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRecords.map(r => r.id));
    }
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch = 
      r.students?.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.students?.roll_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesBatch = !selectedBatch || r.students?.batch_id === selectedBatch;
    const matchesExam = !selectedExam || r.exam_id === selectedExam;
    const matchesType = selectedType === 'all' || r.type === selectedType;

    return matchesSearch && matchesBatch && matchesExam && matchesType;
  });

  return (
    <DashboardLayout>
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-primary-50 rounded-2xl text-primary-600">
              <FileText size={24} />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Archive Explorer</h1>
          </div>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Academic certification database & storage management</p>
        </div>

        <div className="flex items-center gap-3">
          {viewMode === 'grid' && filteredRecords.length > 0 && (
            <button 
              onClick={toggleSelectAll}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-200"
            >
              {selectedIds.length === filteredRecords.length ? 'Deselect All' : 'Select All page'}
            </button>
          )}

          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl">
            {selectedIds.length > 0 && (
              <button 
                onClick={() => setShowBulkConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
              >
                <Trash2 size={14} />
                <span className="hidden sm:inline">Revoke Selected</span> ({selectedIds.length})
              </button>
            )}
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutGrid size={20} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <ListIcon size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="md:col-span-2 relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="Search student or roll no..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-2xl outline-none transition-all font-bold text-slate-700"
          />
        </div>

        <div className="relative">
          <select 
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="w-full pl-4 pr-10 py-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-2xl outline-none transition-all font-bold text-slate-700 appearance-none"
          >
            <option value="">All Batches</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.class_name} ({b.batch_code})</option>
            ))}
          </select>
          <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select 
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
            className="w-full pl-4 pr-10 py-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-2xl outline-none transition-all font-bold text-slate-700 appearance-none"
          >
            <option value="">All Exams</option>
            {exams.map(e => (
              <option key={e.id} value={e.id}>{e.exam_name}</option>
            ))}
          </select>
          <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select 
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full pl-4 pr-10 py-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-2xl outline-none transition-all font-bold text-slate-700 appearance-none"
          >
            <option value="all">All Types</option>
            <option value="individual">Individual</option>
            <option value="combined">Aggregate</option>
          </select>
          <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <Loader2 size={48} className="animate-spin text-primary-600" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Scanning Archives...</p>
        </div>
      ) : filteredRecords.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredRecords.map(record => (
              <PDFHistoryCard 
                key={record.id} 
                record={record} 
                onDelete={confirmDelete}
                isDeleting={isDeleting === record.id}
                isSelected={selectedIds.includes(record.id)}
                onSelect={toggleSelect}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-6 w-12">
                    <input 
                      type="checkbox"
                      checked={selectedIds.length === filteredRecords.length && filteredRecords.length > 0}
                      onChange={toggleSelectAll}
                      className="w-5 h-5 rounded-lg border-2 border-slate-200 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    />
                  </th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Student Name</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Type</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Exam</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Generated On</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredRecords.map(record => (
                  <tr key={record.id} className={`hover:bg-slate-50/50 transition-colors ${selectedIds.includes(record.id) ? 'bg-primary-50/20' : ''}`}>
                    <td className="p-6">
                      <input 
                        type="checkbox"
                        checked={selectedIds.includes(record.id)}
                        onChange={() => toggleSelect(record.id)}
                        className="w-5 h-5 rounded-lg border-2 border-slate-200 text-primary-600 focus:ring-primary-500 cursor-pointer"
                      />
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl scale-90 ${record.type === 'individual' ? 'bg-blue-50 text-blue-500' : 'bg-amber-50 text-amber-500'}`}>
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className="font-black text-slate-900">{record.students?.student_name}</p>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Roll: {record.students?.roll_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        record.type === 'individual' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {record.type}
                      </span>
                    </td>
                    <td className="p-6 text-center text-sm font-black text-slate-600">
                      {record.exams?.exam_name || 'Aggregate Report'}
                    </td>
                    <td className="p-6 text-center text-sm font-bold text-slate-400">
                      {new Date(record.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a 
                          href={record.storage_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-3 text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                        >
                          <ExternalLink size={18} />
                        </a>
                        <button 
                          onClick={() => confirmDelete(record.id, record.storage_url)}
                          disabled={isDeleting === record.id}
                          className="p-3 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all disabled:opacity-50"
                        >
                          {isDeleting === record.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="bg-white rounded-[3rem] border border-slate-100 py-20">
          <EmptyState 
            title="No PDF Archives Found"
            description={searchTerm ? "No records match your search filters." : "Your generated certificates will appear here once you start creating report cards."}
            actionText={searchTerm ? "Clear Search" : undefined}
            onAction={searchTerm ? () => setSearchTerm('') : undefined}
          />
        </div>
      )}

      <ConfirmDialog 
        isOpen={!!deleteItem}
        title="Delete Archive"
        message="Are you sure you want to permanently delete this PDF certificate? This action cannot be reversed."
        onConfirm={handleDelete}
        onCancel={() => setDeleteItem(null)}
        isLoading={!!isDeleting}
      />

      <ConfirmDialog 
        isOpen={showBulkConfirm}
        title="Bulk Delete Archives"
        message={`Are you sure you want to permanently delete ${selectedIds.length} selected certificates? This action cannot be undone.`}
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkConfirm(false)}
        isLoading={isBulkDeleting}
      />
    </DashboardLayout>
  );
};

export default PDFHistory;
