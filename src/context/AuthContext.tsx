import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import LoadingSpinner from '../components/LoadingSpinner';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'master_admin' | 'admin' | 'teacher';
  college_id: string | null;
  can_add_admin: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('erp_session');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('erp_session');
      }
    }
    // Simulate minor delay for branding experience
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    console.log('--- Login Debug ---');
    console.log('Email Attempt:', cleanEmail);

    // 1. Fetch user from custom table (Case-insensitive lookup)
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (error) {
      console.error('Supabase Query Error:', error);
      throw new Error(`Database Access Error: ${error.message}`);
    }

    if (!dbUser) {
      console.error('Login Failure: No user found for', cleanEmail);
      throw new Error('User is not found');
    }

    console.log('User Record Found:', { id: dbUser.id, role: dbUser.role, email: dbUser.email });
    
    // 2. Verify password (CLEAN TEXT AS REQUESTED)
    const isValid = cleanPassword === dbUser.password;
    
    if (!isValid) {
      console.log('Password mismatch for:', cleanEmail);
      throw new Error('Invalid credentials');
    }

    console.log('Login successful for:', dbUser.name);

    // 3. Create session data
    const sessionUser: User = {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      college_id: dbUser.college_id,
      can_add_admin: dbUser.can_add_admin,
    };

    setUser(sessionUser);
    localStorage.setItem('erp_session', JSON.stringify(sessionUser));
    return sessionUser;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('erp_session');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {loading ? <LoadingSpinner /> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
