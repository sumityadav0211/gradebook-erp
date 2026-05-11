import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { 
  Database, 
  HardDrive, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ResourceStatus {
  name: string;
  type: 'table' | 'bucket' | 'columns';
  status: 'checking' | 'active' | 'missing' | 'error';
  message?: string;
  required: boolean;
}

const SystemHealth: React.FC = () => {
  const [resources, setResources] = useState<ResourceStatus[]>([
    { name: 'colleges', type: 'table', status: 'checking', required: true },
    { name: 'colleges_columns', type: 'columns', status: 'checking', required: false, message: 'Logo/Slogan support' },
    { name: 'users', type: 'table', status: 'checking', required: true },
    { name: 'batches', type: 'table', status: 'checking', required: true },
    { name: 'students', type: 'table', status: 'checking', required: true },
    { name: 'subjects', type: 'table', status: 'checking', required: true },
    { name: 'batch_subjects', type: 'table', status: 'checking', required: true },
    { name: 'exams', type: 'table', status: 'checking', required: true },
    { name: 'results', type: 'table', status: 'checking', required: true },
    { name: 'pdf_records', type: 'table', status: 'checking', required: false },
    { name: 'documents', type: 'bucket', status: 'checking', required: false },
    { name: 'result-pdfs', type: 'bucket', status: 'checking', required: true },
    { name: 'student-photos', type: 'bucket', status: 'checking', required: false },
  ]);
  const [isChecking, setIsChecking] = useState(false);

  const checkHealth = async () => {
    setIsChecking(true);
    const updatedResources = [...resources];

    for (let i = 0; i < updatedResources.length; i++) {
        const resource = updatedResources[i];
        updatedResources[i] = { ...resource, status: 'checking' };
        setResources([...updatedResources]);

        try {
            if (resource.type === 'table') {
                const { error } = await supabase.from(resource.name).select('*').limit(0);
                if (error) {
                    if (error.code === '42P01') { // Table does not exist
                        updatedResources[i].status = 'missing';
                        updatedResources[i].message = 'Table not found in database.';
                    } else {
                        updatedResources[i].status = 'error';
                        updatedResources[i].message = error.message;
                    }
                } else {
                    updatedResources[i].status = 'active';
                }
            } else if (resource.type === 'columns') {
                // Check if specific columns exist in colleges table
                try {
                  const { data, error } = await supabase
                    .from('colleges')
                    .select('logo_url, slogan, address')
                    .limit(0);
                  
                  if (error) {
                    if (error.message?.includes('schema cache') || error.message?.includes('column')) {
                      updatedResources[i].status = 'missing';
                      updatedResources[i].message = 'Optional image/slogan columns missing.';
                    } else {
                      updatedResources[i].status = 'error';
                      updatedResources[i].message = error.message;
                    }
                  } else {
                    updatedResources[i].status = 'active';
                  }
                } catch (e) {
                  updatedResources[i].status = 'missing';
                }
            } else {
                // Check bucket by trying to list (or just upload dummy and delete?)
                // Listing buckets requires service role, so we try to check bucket public access if possible
                // or just try to list one item
                const { error } = await supabase.storage.from(resource.name).list('', { limit: 1 });
                if (error) {
                    if (error.message.includes('Bucket not found')) {
                        updatedResources[i].status = 'missing';
                        updatedResources[i].message = 'Bucket not found in Storage.';
                    } else {
                        updatedResources[i].status = 'error';
                        updatedResources[i].message = error.message;
                    }
                } else {
                    updatedResources[i].status = 'active';
                }
            }
        } catch (err: any) {
            updatedResources[i].status = 'error';
            updatedResources[i].message = err.message || 'Unknown error';
        }
        setResources([...updatedResources]);
    }
    setIsChecking(false);
    toast.success('System health check complete');
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const getStatusIcon = (res: ResourceStatus) => {
    switch (res.status) {
      case 'active': return <CheckCircle2 className="text-emerald-500" size={20} />;
      case 'missing': 
        return res.required ? 
          <XCircle className="text-red-500" size={20} /> : 
          <AlertTriangle className="text-slate-300" size={20} title="Optional feature unavailable" />;
      case 'error': return <AlertTriangle className="text-amber-500" size={20} />;
      case 'checking': return <RefreshCw className="text-slate-400 animate-spin" size={20} />;
    }
  };

  return (
    <DashboardLayout title="System Health & Configuration">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Configuration Checklist</h2>
          <p className="text-slate-500 text-sm mt-1">Verify that all Supabase database tables and storage buckets are correctly configured.</p>
        </div>
        <button 
          onClick={checkHealth}
          disabled={isChecking}
          className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={18} className={isChecking ? 'animate-spin' : ''} />
          {isChecking ? 'Checking...' : 'Re-verify System'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Database Tables */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-extrabold text-slate-800 flex items-center gap-2">
              <Database className="text-blue-500" size={20} />
              Database Tables
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">PostgreSQL</span>
          </div>
          <div className="divide-y divide-slate-100">
            {resources.filter(r => r.type === 'table').map((res) => (
              <div key={res.name} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[10px] ${
                    res.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 
                    res.status === 'missing' ? (res.required ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400') : 'bg-slate-100 text-slate-500'
                  }`}>
                    {res.type === 'columns' ? 'CL' : 'TB'}
                  </div>
                  <div>
                    <p className="font-bold text-slate-700 text-sm">{res.name}</p>
                    {res.message && <p className="text-[10px] text-slate-400 font-mono">{res.message}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                    {res.required && <span className="text-[9px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded uppercase tracking-tighter">Required</span>}
                    {getStatusIcon(res)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Storage Buckets */}
        <div className="flex flex-col gap-8">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-extrabold text-slate-800 flex items-center gap-2">
                <HardDrive className="text-purple-500" size={20} />
                Storage Buckets
              </h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">S3 Engine</span>
            </div>
            <div className="divide-y divide-slate-100">
              {resources.filter(r => r.type === 'bucket').map((res) => (
                <div key={res.name} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[10px] ${
                      res.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 
                      res.status === 'missing' ? (res.required ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400') : 'bg-slate-100 text-slate-500'
                    }`}>
                      BK
                    </div>
                    <div>
                      <p className="font-bold text-slate-700 text-sm">{res.name}</p>
                      {res.message && <p className="text-[10px] text-slate-400 font-mono">{res.message}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                      {res.required && <span className="text-[9px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded uppercase tracking-tighter">Required</span>}
                      {getStatusIcon(res)}
                  </div>
                </div>
              ))}
            </div>
            {resources.some(r => r.type === 'bucket' && r.status === 'missing' && r.required) && (
              <div className="p-6 bg-red-50 border-t border-red-100">
                <div className="flex gap-3">
                  <AlertTriangle className="text-red-600 shrink-0" size={20} />
                  <div>
                    <h4 className="text-sm font-bold text-red-900">Missing Buckets Detected</h4>
                    <p className="text-xs text-red-700 mt-1 leading-relaxed">
                      You must manually create the missing buckets in your Supabase Dashboard. 
                      Go to <strong className="font-bold">Storage</strong>, click <strong className="font-bold">New Bucket</strong>, 
                      give it the exact name shown above, and make sure to toggle <strong className="font-bold">Public</strong>.
                    </p>
                    <a 
                      href="https://supabase.com/dashboard/project/yxwmvykxgucillhcnevo/storage/buckets" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-3 text-xs font-bold text-red-600 hover:text-red-800 transition-colors bg-white px-3 py-1.5 rounded-lg border border-red-200"
                    >
                      Open Supabase Storage <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Setup Instructions */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 text-white shadow-xl shadow-slate-900/10">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <ShieldCheck className="text-primary-400" size={20} />
              Setup Guide
            </h3>
            
            {resources.some(r => r.name === 'colleges_columns' && r.status === 'missing') && (
              <div className="mb-6 p-4 bg-slate-700/50 rounded-2xl border border-slate-600">
                <h4 className="text-sm font-bold text-primary-300 mb-2">Enable Slogans & Logos</h4>
                <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                  To enable institution slogans and logos, run this SQL in your Supabase SQL Editor:
                </p>
                <pre className="bg-slate-900 p-3 rounded-lg text-[10px] font-mono text-emerald-400 overflow-x-auto">
{`ALTER TABLE colleges 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS portrait_url TEXT,
ADD COLUMN IF NOT EXISTS slogan TEXT,
ADD COLUMN IF NOT EXISTS sub_slogan TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS institute_name TEXT,
ADD COLUMN IF NOT EXISTS registration_number TEXT;

ALTER TABLE students
ADD COLUMN IF NOT EXISTS mother_name TEXT,
ADD COLUMN IF NOT EXISTS registration_number TEXT,
ADD COLUMN IF NOT EXISTS pen_number TEXT,
ADD COLUMN IF NOT EXISTS exam_set_number TEXT;

ALTER TABLE subjects
ADD COLUMN IF NOT EXISTS is_graded BOOLEAN DEFAULT false;

ALTER TABLE results
ADD COLUMN IF NOT EXISTS grade TEXT;`}
                </pre>
              </div>
            )}

            <ul className="space-y-4 text-slate-300 text-sm">
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white shrink-0">1</span>
                <span>Ensure <strong className="text-white">RLS Policies</strong> for Storage allow public inserts and reads.</span>
              </li>
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white shrink-0">2</span>
                <span>The <strong className="text-white">documents</strong> bucket is used for college logos and slogans.</span>
              </li>
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white shrink-0">3</span>
                <span>The <strong className="text-white">result-pdfs</strong> bucket stores archived annual reports.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SystemHealth;
