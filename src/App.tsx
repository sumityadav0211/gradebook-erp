import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

// Lazy load pages
const Login = lazy(() => import('./pages/Login'));
const NotFound = lazy(() => import('./pages/NotFound'));
import LoadingSpinner from './components/LoadingSpinner';

// Master Admin Pages
const MasterDashboard = lazy(() => import('./pages/MasterAdmin/MasterDashboard'));
const Colleges = lazy(() => import('./pages/MasterAdmin/Colleges'));
const Users = lazy(() => import('./pages/MasterAdmin/Users'));
const SystemHealth = lazy(() => import('./pages/MasterAdmin/SystemHealth'));
const Storage = lazy(() => import('./pages/MasterAdmin/Storage'));
const GlobalStudents = lazy(() => import('./pages/MasterAdmin/GlobalStudents'));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'));
const Batches = lazy(() => import('./pages/Admin/Batches'));
const Students = lazy(() => import('./pages/Admin/Students'));
const StudentResult = lazy(() => import('./pages/Admin/StudentResult'));
const Subjects = lazy(() => import('./pages/Admin/Subjects'));
const Exams = lazy(() => import('./pages/Admin/Exams'));
const Teachers = lazy(() => import('./pages/Admin/Teachers'));
const PDFHistory = lazy(() => import('./pages/Admin/PDFHistory'));
const PDFStructure = lazy(() => import('./pages/Admin/PDFStructure'));
const Leaderboard = lazy(() => import('./pages/Common/Leaderboard'));
const ResultReport = lazy(() => import('./pages/Common/ResultReport'));
const BulkMarksEntry = lazy(() => import('./pages/Common/BulkMarksEntry'));

// Teacher Pages
const TeacherDashboard = lazy(() => import('./pages/Teacher/TeacherDashboard'));
const TeacherStudents = lazy(() => import('./pages/Teacher/TeacherStudents'));


function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Master Admin Routes */}
            <Route path="/master" element={<ProtectedRoute allowedRoles={['master_admin']}><MasterDashboard /></ProtectedRoute>} />
            <Route path="/master/colleges" element={<ProtectedRoute allowedRoles={['master_admin']}><Colleges /></ProtectedRoute>} />
            <Route path="/master/users" element={<ProtectedRoute allowedRoles={['master_admin']}><Users /></ProtectedRoute>} />
            <Route path="/master/health" element={<ProtectedRoute allowedRoles={['master_admin']}><SystemHealth /></ProtectedRoute>} />
            <Route path="/master/storage" element={<ProtectedRoute allowedRoles={['master_admin']}><Storage /></ProtectedRoute>} />
            <Route path="/master/students" element={<ProtectedRoute allowedRoles={['master_admin']}><GlobalStudents /></ProtectedRoute>} />

            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/batches" element={<ProtectedRoute allowedRoles={['admin']}><Batches /></ProtectedRoute>} />
            <Route path="/admin/batches/:batchId/students" element={<ProtectedRoute allowedRoles={['admin']}><Students /></ProtectedRoute>} />
            <Route path="/admin/batches/:batchId/students/:studentId/result" element={<ProtectedRoute allowedRoles={['admin']}><StudentResult /></ProtectedRoute>} />
            <Route path="/admin/subjects" element={<ProtectedRoute allowedRoles={['admin']}><Subjects /></ProtectedRoute>} />
            <Route path="/admin/exams" element={<ProtectedRoute allowedRoles={['admin']}><Exams /></ProtectedRoute>} />
            <Route path="/admin/teachers" element={<ProtectedRoute allowedRoles={['admin']}><Teachers /></ProtectedRoute>} />
            <Route path="/admin/pdf-history" element={<ProtectedRoute allowedRoles={['admin']}><PDFHistory /></ProtectedRoute>} />
            <Route path="/admin/pdf-structure" element={<ProtectedRoute allowedRoles={['admin']}><PDFStructure /></ProtectedRoute>} />
            <Route path="/admin/leaderboard" element={<ProtectedRoute allowedRoles={['admin']}><Leaderboard /></ProtectedRoute>} />
            <Route path="/admin/result-report" element={<ProtectedRoute allowedRoles={['admin']}><ResultReport /></ProtectedRoute>} />
            <Route path="/admin/bulk-marks" element={<ProtectedRoute allowedRoles={['admin']}><BulkMarksEntry /></ProtectedRoute>} />

            {/* Teacher Routes */}
            <Route path="/teacher" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/teacher/students" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherStudents /></ProtectedRoute>} />
            <Route path="/teacher/leaderboard" element={<ProtectedRoute allowedRoles={['teacher']}><Leaderboard /></ProtectedRoute>} />
            <Route path="/teacher/result-report" element={<ProtectedRoute allowedRoles={['teacher']}><ResultReport /></ProtectedRoute>} />
            <Route path="/teacher/bulk-marks" element={<ProtectedRoute allowedRoles={['teacher']}><BulkMarksEntry /></ProtectedRoute>} />

            {/* Redirects & 404 */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
