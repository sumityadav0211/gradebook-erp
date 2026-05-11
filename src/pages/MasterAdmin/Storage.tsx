import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { 
  Database, 
  Folder, 
  File as FileIcon, 
  Trash2, 
  Download, 
  RefreshCcw, 
  Search,
  HardDrive,
  Info,
  Calendar,
  Layers,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Users,
  School,
  BarChart3
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

interface Bucket {
  id: string;
  name: string;
  public: boolean;
  created_at: string;
  updated_at: string;
}

interface StorageFile {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: any;
}

const Storage: React.FC = () => {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filesLoading, setFilesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    totalStorage: 0,
    studentCount: 0,
    collegeCount: 0,
    resultCount: 0
  });

  useEffect(() => {
    fetchBuckets();
    fetchGlobalStats();
  }, []);

  useEffect(() => {
    if (selectedBucket) {
      fetchFiles(selectedBucket);
    }
  }, [selectedBucket]);

  const fetchGlobalStats = async () => {
    try {
      const [
        { count: sCount },
        { count: cCount },
        { count: rCount }
      ] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('colleges').select('*', { count: 'exact', head: true }),
        supabase.from('results').select('*', { count: 'exact', head: true })
      ]);

      let totalBytes = 0;
      const bucketIds = ['student-photos', 'result-pdfs', 'documents'];
      
      for (const bucketId of bucketIds) {
        const { data: files } = await supabase.storage.from(bucketId).list();
        if (files) {
          files.forEach(f => {
            if (f.metadata?.size) totalBytes += f.metadata.size;
          });
        }
      }

      setStats({
        totalStorage: totalBytes,
        studentCount: sCount || 0,
        collegeCount: cCount || 0,
        resultCount: rCount || 0
      });
    } catch (err) {
      console.error('Error fetching global stats:', err);
    }
  };

  const fetchBuckets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage.listBuckets();
      if (error) {
        console.warn('Could not list all buckets via API, trying known buckets...');
        // If listing fails (often due to restricted RLS on buckets table), 
        // we manually check the ones we know should exist
        const knownIds = ['student-photos', 'result-pdfs', 'documents'];
        const validBuckets: Bucket[] = [];
        
        for (const id of knownIds) {
          const { data: bData } = await supabase.storage.getBucket(id);
          if (bData) {
            validBuckets.push(bData as any);
          }
        }
        setBuckets(validBuckets);
        if (validBuckets.length > 0 && !selectedBucket) {
          setSelectedBucket(validBuckets[0].id);
        }
      } else {
        setBuckets(data || []);
        if (data && data.length > 0 && !selectedBucket) {
          setSelectedBucket(data[0].id);
        }
      }
    } catch (err: any) {
      toast.error('Failed to fetch buckets: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async (bucketId: string) => {
    setFilesLoading(true);
    try {
      const { data, error } = await supabase.storage.from(bucketId).list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw error;
      setFiles(data as unknown as StorageFile[] || []);
    } catch (err: any) {
      toast.error('Failed to fetch files: ' + err.message);
    } finally {
      setFilesLoading(false);
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    if (!selectedBucket) return;
    if (!window.confirm(`Are you sure you want to delete "${fileName}"?`)) return;

    try {
      const { error } = await supabase.storage.from(selectedBucket).remove([fileName]);
      if (error) throw error;
      toast.success('File deleted successfully');
      fetchFiles(selectedBucket);
    } catch (err: any) {
      toast.error('Error deleting file: ' + err.message);
    }
  };

  const handleDownloadFile = async (fileName: string) => {
    if (!selectedBucket) return;
    try {
      const { data, error } = await supabase.storage.from(selectedBucket).download(fileName);
      if (error) throw error;
      
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      toast.error('Error downloading file: ' + err.message);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout title="Supabase Storage">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Supabase Storage</h2>
            <p className="text-slate-500 font-medium mt-1">Manage cloud storage buckets and assets</p>
          </div>
          <button 
            onClick={() => {
              fetchBuckets();
              fetchGlobalStats();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all active:scale-95 text-sm"
          >
            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border-2 border-slate-100 p-5 flex items-center gap-4 shadow-sm"
          >
            <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl">
              <HardDrive size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Storage Status</p>
              <div className="flex items-baseline gap-2">
                <h4 className="text-xl font-black text-slate-800">{formatSize(stats.totalStorage)}</h4>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Used</span>
              </div>
              <div className="mt-2 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-500 h-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, (stats.totalStorage / (1024 * 1024 * 1024)) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-tight">
                {formatSize(Math.max(0, (1024 * 1024 * 1024) - stats.totalStorage))} Remaining of 1GB
              </p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl border-2 border-slate-100 p-5 flex items-center gap-4 shadow-sm"
          >
            <div className="p-3.5 bg-purple-50 text-purple-600 rounded-2xl">
              <Users size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Students</p>
              <h4 className="text-xl font-black text-slate-800">{stats.studentCount.toLocaleString()}</h4>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl border-2 border-slate-100 p-5 flex items-center gap-4 shadow-sm"
          >
            <div className="p-3.5 bg-green-50 text-green-600 rounded-2xl">
              <School size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Colleges</p>
              <h4 className="text-xl font-black text-slate-800">{stats.collegeCount.toLocaleString()}</h4>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-3xl border-2 border-slate-100 p-5 flex items-center gap-4 shadow-sm"
          >
            <div className="p-3.5 bg-orange-50 text-orange-600 rounded-2xl">
              <BarChart3 size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Results</p>
              <h4 className="text-xl font-black text-slate-800">{stats.resultCount.toLocaleString()}</h4>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Buckets Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-3xl border-2 border-slate-100 p-5 shadow-sm">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Database size={14} />
                Storage Buckets
              </h3>
              
              <div className="space-y-2">
                {buckets.map((bucket) => (
                  <button
                    key={bucket.id}
                    onClick={() => setSelectedBucket(bucket.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 text-left ${
                      selectedBucket === bucket.id 
                        ? 'bg-primary-50 border-2 border-primary-200 text-primary-700 shadow-sm' 
                        : 'bg-slate-50 border-2 border-transparent text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${selectedBucket === bucket.id ? 'bg-primary-100' : 'bg-white'}`}>
                      <Folder size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black truncate">{bucket.name}</p>
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                        {bucket.public ? 'Public' : 'Private'}
                      </span>
                    </div>
                    {selectedBucket === bucket.id && <ChevronRight size={16} />}
                  </button>
                ))}
                
                {buckets.length === 0 && !loading && (
                  <div className="text-center py-8">
                    <p className="text-sm text-slate-400 font-medium italic">No buckets found</p>
                  </div>
                )}
              </div>
            </div>

            {selectedBucket && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900 rounded-3xl p-5 text-white shadow-xl"
              >
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Info size={14} />
                  Bucket Info
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ID</p>
                    <p className="text-sm font-mono text-primary-400">{selectedBucket}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Access Policy</p>
                    <div className="flex items-center gap-2 mt-1">
                      <ShieldCheck size={14} className="text-green-400" />
                      <p className="text-sm font-bold">
                        {buckets.find(b => b.id === selectedBucket)?.public ? 'Public' : 'Private Restricted'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Storage Type</p>
                    <p className="text-sm font-bold">Supabase Cloud S3</p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Files Main Content */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-3xl border-2 border-slate-100 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
              {/* Toolbar */}
              <div className="p-4 sm:p-6 border-b-2 border-slate-50 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text"
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-2xl outline-none transition-all font-bold text-slate-700 text-sm"
                  />
                </div>
                
                <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Layers size={14} />
                    <span>{filteredFiles.length} Objects</span>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                  <div className="flex items-center gap-1.5">
                    <HardDrive size={14} />
                    <span>Bucket: {selectedBucket}</span>
                  </div>
                </div>
              </div>

              {/* Files Table */}
              <div className="flex-1 overflow-x-auto">
                {filesLoading ? (
                  <div className="h-full flex items-center justify-center p-20">
                    <div className="flex flex-col items-center gap-4">
                      <RefreshCcw className="animate-spin text-primary-500" size={40} />
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Loading objects...</p>
                    </div>
                  </div>
                ) : filteredFiles.length > 0 ? (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Created At</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Size</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-slate-50">
                      <AnimatePresence mode="popLayout">
                        {filteredFiles.map((file) => (
                          <motion.tr 
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            key={file.id || file.name}
                            className="hover:bg-slate-50/80 transition-colors group"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-slate-100 rounded-xl text-slate-500 group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors">
                                  <FileIcon size={18} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-black text-slate-700 truncate max-w-[200px]">{file.name}</p>
                                  <p className="text-[10px] text-slate-400 font-bold font-mono">{file.id?.substring(0, 8) || 'N/A'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                                <Calendar size={14} className="opacity-50" />
                                {file.created_at ? new Date(file.created_at).toLocaleDateString() : 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs font-mono font-black text-slate-600">
                                {file.metadata?.size ? formatSize(file.metadata.size) : '0 B'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                {file.metadata?.mimetype || 'binary'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => handleDownloadFile(file.name)}
                                  className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                                  title="Download"
                                >
                                  <Download size={18} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteFile(file.name)}
                                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                  title="Delete"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-20 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mb-4 border-2 border-slate-100">
                      <Folder size={40} />
                    </div>
                    <h4 className="text-lg font-black text-slate-700">No objects found</h4>
                    <p className="text-sm text-slate-400 font-bold mt-1">
                      {searchQuery ? `No matches for "${searchQuery}"` : 'This bucket is currently empty'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions / Tips */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 border-2 border-blue-100 p-4 rounded-3xl flex gap-4">
                <div className="p-3 bg-blue-500 rounded-2xl text-white shadow-lg shadow-blue-500/20 h-fit">
                  <ExternalLink size={20} />
                </div>
                <div>
                  <h4 className="text-blue-900 font-black text-sm">Dashboard Link</h4>
                  <p className="text-blue-700/70 text-[11px] font-bold mt-0.5 leading-relaxed">
                    View advanced storage metrics in Supabase Dashboard.
                  </p>
                </div>
              </div>
              
              <div className="bg-purple-50 border-2 border-purple-100 p-4 rounded-3xl flex gap-4">
                <div className="p-3 bg-purple-500 rounded-2xl text-white shadow-lg shadow-purple-500/20 h-fit">
                  <Layers size={20} />
                </div>
                <div>
                  <h4 className="text-purple-900 font-black text-sm">Large Files</h4>
                  <p className="text-purple-700/70 text-[11px] font-bold mt-0.5 leading-relaxed">
                    Buckets have a default 50MB per-file upload limit.
                  </p>
                </div>
              </div>

              <div className="bg-slate-200 border-2 border-slate-300 p-4 rounded-3xl flex gap-4 opacity-75">
                <div className="p-3 bg-slate-800 rounded-2xl text-white shadow-lg h-fit">
                  <RefreshCcw size={20} />
                </div>
                <div>
                  <h4 className="text-slate-900 font-black text-sm">Coming Soon</h4>
                  <p className="text-slate-700/70 text-[11px] font-bold mt-0.5 leading-relaxed">
                    Direct drag & drop upload will be enabled soon.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Storage;
