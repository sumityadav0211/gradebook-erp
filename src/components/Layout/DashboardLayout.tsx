// src/components/Layout/DashboardLayout.tsx
import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  School, 
  Users, 
  GraduationCap, 
  BookOpen, 
  ClipboardList, 
  LogOut, 
  Menu, 
  X, 
  UserCircle,
  ChevronRight,
  FileText,
  Trophy,
  Layout,
  ClipboardCheck,
  HeartPulse,
  HardDrive
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
}

const DashboardLayout: React.FC<{ children: React.ReactNode, title: string }> = ({ children, title }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Breadcrumb generator
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(p => p !== '');
    const crumbs: { name: string, url: string, isLast: boolean }[] = [];
    
    paths.forEach((path, idx) => {
      // Check if it's a UUID (technical ID)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(path);
      
      // We always track the cumulative URL even for hidden segments
      const url = `/${paths.slice(0, idx + 1).join('/')}`;
      
      if (!isUUID) {
        const name = path.charAt(0).toUpperCase() + path.slice(1).replace(/_/g, ' ');
        crumbs.push({ name, url, isLast: false });
      }
    });

    if (crumbs.length > 0) {
      crumbs[crumbs.length - 1].isLast = true;
    }
    
    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  // Define navigation based on role
  const getNavItems = (): NavItem[] => {
    const role = user?.role;
    
    if (role === 'master_admin') {
      return [
        { name: 'Dashboard', path: '/master', icon: LayoutDashboard },
        { name: 'Colleges', path: '/master/colleges', icon: School },
        { name: 'Students', path: '/master/students', icon: GraduationCap },
        { name: 'Users', path: '/master/users', icon: Users },
        { name: 'System Health', path: '/master/health', icon: HeartPulse },
        { name: 'Storage', path: '/master/storage', icon: HardDrive },
      ];
    }
    
    if (role === 'admin') {
      return [
        { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
        { name: 'Batches', path: '/admin/batches', icon: GraduationCap },
        { name: 'Subjects', path: '/admin/subjects', icon: BookOpen },
        { name: 'Exams', path: '/admin/exams', icon: ClipboardList },
        { name: 'Teachers', path: '/admin/teachers', icon: Users },
        { name: 'PDF History', path: '/admin/pdf-history', icon: FileText },
        { name: 'PDF Structure', path: '/admin/pdf-structure', icon: Layout },
        { name: 'Rankings', path: '/admin/leaderboard', icon: Trophy },
        { name: 'Result Report', path: '/admin/result-report', icon: ClipboardCheck },
        { name: 'Bulk Marks Entry', path: '/admin/bulk-marks', icon: ClipboardList },
      ];
    }
    
    if (role === 'teacher') {
      return [
        { name: 'Dashboard', path: '/teacher', icon: LayoutDashboard },
        { name: 'Students', path: '/teacher/students', icon: Users },
        { name: 'Rankings', path: '/teacher/leaderboard', icon: Trophy },
        { name: 'Result Report', path: '/teacher/result-report', icon: ClipboardCheck },
        { name: 'Bulk Marks Entry', path: '/teacher/bulk-marks', icon: ClipboardList },
      ];
    }
    
    return [];
  };

  const navItems = getNavItems();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-slate-400">
      {/* Brand */}
      <div className="p-4 sm:p-6 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-primary-900/40">
            <BookOpen size={20} />
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">Grade<span className="text-primary-400">Book</span></h1>
        </div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mt-2.5 font-bold font-mono">Institutional ERP</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              title={item.name}
              id={`nav-item-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/30 font-semibold' 
                  : 'hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={18} className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-primary-400 transition-colors'} />
              <span className="text-sm tracking-wide">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Info & Badge */}
      <div className="p-4 border-t border-white/5 bg-slate-950/20">
        <div className="flex items-center gap-3 p-2 bg-white/5 rounded-2xl border border-white/5">
          <div className="shrink-0 w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-primary-400 border border-white/10">
            <UserCircle size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{user?.name}</p>
            <span className={`inline-flex items-center px-2 py-0.5 mt-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
              user?.role === 'master_admin' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
              user?.role === 'admin' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 
              'bg-green-500/20 text-green-400 border border-green-500/30'
            }`}>
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 h-screen sticky top-0 border-r border-slate-200 z-30" id="desktop-sidebar">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-[280px] z-50 lg:hidden shadow-2xl"
              id="mobile-sidebar"
            >
              <SidebarContent />
              <button 
                id="mobile-close-btn"
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute top-4 -right-12 p-3 bg-slate-900 text-white rounded-xl shadow-xl lg:hidden active:scale-90 transition-transform"
              >
                <X size={20} />
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Navbar */}
        <header className="h-14 sm:h-16 lg:h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 z-20 shadow-sm" id="top-navbar">
          <div className="flex items-center gap-3">
            <button 
              id="mobile-menu-toggle"
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2.5 -ml-2 text-slate-500 hover:bg-slate-100 rounded-xl lg:hidden active:scale-90 transition-all"
            >
              <Menu size={22} />
            </button>
            
            {/* Desktop Breadcrumbs */}
            <div className="hidden lg:flex items-center gap-2 text-xs font-bold text-slate-400">
               {breadcrumbs.map((bc, i) => (
                 <React.Fragment key={bc.url}>
                   {i > 0 && <ChevronRight size={12} className="text-slate-300" />}
                   <Link 
                     to={bc.url} 
                     className={`hover:text-primary-600 transition-colors uppercase tracking-widest ${bc.isLast ? 'text-primary-600 font-black' : ''}`}
                   >
                     {bc.name}
                   </Link>
                 </React.Fragment>
               ))}
            </div>

            {/* Mobile Title Replacement */}
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-6 h-6 bg-primary-600 rounded-lg flex items-center justify-center text-white scale-90">
                <BookOpen size={14} />
              </div>
              <h2 className="text-base font-black text-slate-800 tracking-tight">GradeBook</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              id="logout-btn"
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all active:scale-95 group"
            >
              <LogOut size={18} className="group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 xl:p-8 bg-slate-50/50" id="main-content">
          <div className="max-w-7xl mx-auto h-full">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
