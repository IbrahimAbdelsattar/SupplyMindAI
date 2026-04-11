import React, { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'manager' | 'analyst';
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role: 'manager' | 'analyst') => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const mockUsers: Record<string, User> = {
  manager: {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah@company.com',
    role: 'manager',
  },
  analyst: {
    id: '2',
    name: 'Alex Chen',
    email: 'alex@company.com',
    role: 'analyst',
  },
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string, role: 'manager' | 'analyst') => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setUser(mockUsers[role]);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
