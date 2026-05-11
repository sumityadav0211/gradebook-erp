import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/Layout/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { 
  FileText, 
  Save, 
  Loader2, 
  Eye, 
  Settings2, 
  Type,
  Layout,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const PDFStructure: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'header' | 'fields' | 'signatures'>('header');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const defaultSettings = {
    show_note: false,
    note_text: 'After summer vacation college will start from 15/06/2026',
    show_date_field: false,
    date_text: '01/05/2026',
    show_reg_no: true,
    show_roll_no: true,
    show_exam_seat_no: true,
    show_pen_no: true,
    show_mother_name: true,
    show_division: true,
    signature_left: 'Class Teacher',
    signature_center_label: 'Head Jr. College',
    signature_right: 'Principal',
    result_card_subtitle: 'AGGREGATE PROGRESS REPORT CARD',
    exam_1_label: 'TEST-1',
    exam_2_label: 'TERMINAL',
    exam_3_label: 'TEST-2',
    exam_4_label: 'ANNUAL',
    aggregate_label: 'AGGREGATE',
    aggregate_orientation: 'portrait',
    show_college_reg_no: true
  };

  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user?.college_id) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('pdf_settings')
          .select('*')
          .eq('college_id', user.college_id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        if (data) {
          setSettings({
            ...defaultSettings,
            ...data
          });
        }
      } catch (err: any) {
        console.error('Fetch error:', err);
        toast.error('Failed to load PDF structure settings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [user?.college_id]);

  const handleSave = async () => {
    if (!user?.college_id) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('pdf_settings')
        .upsert({
          ...settings,
          college_id: user.college_id,
          updated_at: new Date().toISOString()
        }, { onConflict: 'college_id' });

      if (error) throw error;
      toast.success('PDF Structure updated successfully');
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error('Could not save changes. Ensure database SQL has been executed.');
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { key: 'header', label: 'Header & Title' },
    { key: 'fields', label: 'Fields & Note' },
    { key: 'signatures', label: 'Signature Labels' }
  ];

  if (isLoading) {
    return (
      <DashboardLayout title="PDF Architect">
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <Loader2 size={48} className="animate-spin text-primary-600" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Calibrating Layouts...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Report Architect">
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-primary-50 rounded-2xl text-primary-600">
              <Settings2 size={24} />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">PDF Structure</h1>
          </div>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Configure layout and meta-data for result generation</p>
        </div>

        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-8 py-4 bg-primary-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary-700 transition-all shadow-xl shadow-primary-600/20 disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {isSaving ? 'Syncing...' : 'Commit Changes'}
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col md:flex-row h-[700px]">
        {/* Tab Sidebar */}
        <div className="w-full md:w-64 bg-slate-50 p-6 border-r border-slate-100 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab.key 
                  ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10' 
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.key === 'header' && <Layout size={16} />}
              {tab.key === 'fields' && <FileText size={16} />}
              {tab.key === 'signatures' && <Type size={16} />}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-white">
          <AnimatePresence mode="wait">
            {activeTab === 'header' && (
              <motion.div
                key="header"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-8"
              >
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">Main Report Title</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-6">Heading appearing on the top of aggregate cards</p>
                  
                  <div className="space-y-4 max-w-lg">
                    <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block">Report Title Label</label>
                    <input 
                      type="text"
                      value={settings.result_card_subtitle}
                      onChange={(e) => setSettings({ ...settings, result_card_subtitle: e.target.value })}
                      placeholder="AGGREGATE PROGRESS REPORT CARD"
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-2xl outline-none transition-all font-bold text-slate-700"
                    />
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-100">
                  <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">Column Headers (Sequence Order)</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-6">Custom labels for exam columns and total columns</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 max-w-2xl">
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block">Aggregate Orientation</label>
                      <div className="flex gap-2">
                        {['portrait', 'landscape'].map((mode) => (
                          <button
                            key={mode}
                            onClick={() => setSettings({ ...settings, aggregate_orientation: mode as any })}
                            className={`flex-1 py-3 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${
                              settings.aggregate_orientation === mode 
                                ? 'bg-slate-900 border-slate-900 text-white shadow-lg' 
                                : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'
                            }`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block">Column Labels</label>
                      <div className="grid grid-cols-1 gap-4">
                         <ToggleSwitch 
                          label="Show College Reg. No." 
                          value={settings.show_college_reg_no} 
                          onChange={(val) => setSettings({ ...settings, show_college_reg_no: val })} 
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block">Exam 1 Label</label>
                      <input 
                        type="text"
                        value={settings.exam_1_label}
                        onChange={(e) => setSettings({ ...settings, exam_1_label: e.target.value })}
                        placeholder="TEST-1"
                        className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-xl outline-none transition-all font-bold text-slate-700 text-sm"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block">Exam 2 Label</label>
                      <input 
                        type="text"
                        value={settings.exam_2_label}
                        onChange={(e) => setSettings({ ...settings, exam_2_label: e.target.value })}
                        placeholder="TERMINAL"
                        className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-xl outline-none transition-all font-bold text-slate-700 text-sm"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block">Exam 3 Label</label>
                      <input 
                        type="text"
                        value={settings.exam_3_label}
                        onChange={(e) => setSettings({ ...settings, exam_3_label: e.target.value })}
                        placeholder="TEST-2"
                        className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-xl outline-none transition-all font-bold text-slate-700 text-sm"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block">Exam 4 Label</label>
                      <input 
                        type="text"
                        value={settings.exam_4_label}
                        onChange={(e) => setSettings({ ...settings, exam_4_label: e.target.value })}
                        placeholder="ANNUAL"
                        className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-xl outline-none transition-all font-bold text-slate-700 text-sm"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block">Aggregate Column Label</label>
                      <input 
                        type="text"
                        value={settings.aggregate_label}
                        onChange={(e) => setSettings({ ...settings, aggregate_label: e.target.value })}
                        placeholder="AGGREGATE"
                        className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-xl outline-none transition-all font-bold text-slate-700 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'fields' && (
              <motion.div
                key="fields"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-12"
              >
                {/* Section 1 - Student Info */}
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">Student Info Fields</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-8">Choose which fields to show on the result card</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <ToggleSwitch 
                      label="Show Mother's Name" 
                      value={settings.show_mother_name} 
                      onChange={(val) => setSettings({ ...settings, show_mother_name: val })} 
                    />
                    <ToggleSwitch 
                      label="Show Roll No." 
                      value={settings.show_roll_no} 
                      onChange={(val) => setSettings({ ...settings, show_roll_no: val })} 
                    />
                    <ToggleSwitch 
                      label="Show REG. NO." 
                      value={settings.show_reg_no} 
                      onChange={(val) => setSettings({ ...settings, show_reg_no: val })} 
                    />
                    <ToggleSwitch 
                      label="Show Exam Seat No" 
                      value={settings.show_exam_seat_no} 
                      onChange={(val) => setSettings({ ...settings, show_exam_seat_no: val })} 
                    />
                    <ToggleSwitch 
                      label="Show PEN No" 
                      value={settings.show_pen_no} 
                      onChange={(val) => setSettings({ ...settings, show_pen_no: val })} 
                    />
                    <ToggleSwitch 
                      label="Show Division" 
                      value={settings.show_division} 
                      onChange={(val) => setSettings({ ...settings, show_division: val })} 
                    />
                  </div>
                </div>

                {/* Section 2 - Note */}
                <div className="pt-8 border-t border-slate-100">
                  <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">Note / Announcement</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-8">Add a custom message at the bottom of the card</p>
                  
                  <div className="space-y-6 max-w-2xl">
                    <ToggleSwitch 
                      label="Enable Note Section" 
                      value={settings.show_note} 
                      onChange={(val) => setSettings({ ...settings, show_note: val })} 
                    />
                    
                    {settings.show_note && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="space-y-4"
                      >
                         <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block">Note Text</label>
                         <textarea 
                           rows={3}
                           value={settings.note_text}
                           onChange={(e) => setSettings({ ...settings, note_text: e.target.value })}
                           placeholder="After summer vacation college will start from 15/06/2026"
                           className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-3xl outline-none transition-all font-bold text-slate-700 resize-none"
                         />
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Section 3 - Date */}
                <div className="pt-8 border-t border-slate-100">
                  <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">Date on Result Card</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-8">Configure issuance date visibility</p>
                  
                  <div className="space-y-6 max-w-lg">
                    <ToggleSwitch 
                      label="Show Date Field" 
                      value={settings.show_date_field} 
                      onChange={(val) => setSettings({ ...settings, show_date_field: val })} 
                    />
                    
                    {settings.show_date_field && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="space-y-4"
                      >
                         <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block">Manual Date Text</label>
                         <input 
                           type="text"
                           value={settings.date_text}
                           onChange={(e) => setSettings({ ...settings, date_text: e.target.value })}
                           placeholder="01/05/2026"
                           className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-2xl outline-none transition-all font-bold text-slate-700"
                         />
                         <p className="text-[10px] font-bold text-slate-400 italic">This date will appear on the result card</p>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'signatures' && (
              <motion.div
                key="signatures"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-8"
              >
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">Signature Labels</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-10">Configure the labeling for certification signatures</p>
                  
                  <div className="grid grid-cols-1 gap-8 max-w-lg">
                    <div className="space-y-4">
                      <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block">Left Signature Label</label>
                      <input 
                        type="text"
                        value={settings.signature_left}
                        onChange={(e) => setSettings({ ...settings, signature_left: e.target.value })}
                        placeholder="Class Teacher"
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-2xl outline-none transition-all font-bold text-slate-700"
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block">Center Signature Label</label>
                      <input 
                        type="text"
                        value={settings.signature_center_label}
                        onChange={(e) => setSettings({ ...settings, signature_center_label: e.target.value })}
                        placeholder="Head Jr. College"
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-2xl outline-none transition-all font-bold text-slate-700"
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <label className="text-[10px] uppercase font-black tracking-widest text-slate-500 block">Right Signature Label</label>
                      <input 
                        type="text"
                        value={settings.signature_right}
                        onChange={(e) => setSettings({ ...settings, signature_right: e.target.value })}
                        placeholder="Principal"
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-primary-500 rounded-2xl outline-none transition-all font-bold text-slate-700"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  );
};

const ToggleSwitch: React.FC<{ label: string, value: boolean, onChange: (v: boolean) => void }> = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 hover:bg-slate-100/50 transition-colors">
    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{label}</span>
    <button
      onClick={() => onChange(!value)}
      className={`w-12 h-6 rounded-full transition-all relative ${value ? 'bg-primary-600 shadow-lg shadow-primary-600/20' : 'bg-slate-300'}`}
    >
      <div className={`absolute top-1 h-4 w-4 bg-white rounded-full transition-all ${value ? 'right-1' : 'left-1'}`} />
    </button>
  </div>
);

export default PDFStructure;
