import React, { createContext, useContext, useState } from 'react';
import api from '@/services/api';

interface User {
  id: string; 
  email: string;
  name: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, username: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // Check for token and load user
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('currentUser');
        if (token && storedUser) {
            try {
                return JSON.parse(storedUser);
            } catch {
                return null;
            }
        }
    }
    return null;
  });

  // Verify token on mount
  React.useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // We use the new /me endpoint which requires authentication
          await api.get('/auth/me');
        } catch (error) {
          console.log("Token verification failed, logging out");
          // Logout logic duplicated here to avoid dependency cycle or closure issues before logout is defined
          setUser(null);
          localStorage.removeItem('currentUser');
          localStorage.removeItem('token');
          if (!window.location.pathname.includes('/login')) {
             window.location.href = '/login';
          }
        }
      }
    };
    verifyToken();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      const { token, id, email, name } = response.data;
      
      localStorage.setItem('token', token);
      
      const user: User = { 
        id: String(id), // Ensure it's a string for frontend consistency
        username: response.data.username || username,
        email,
        name
      };
      
      setUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      
    } catch (error) {
       console.error("Login error", error);
       throw error;
    }
  };

  const register = async (email: string, password: string, name: string, username: string) => {
    try {
      // Register endpoint expects UserModel: { username, email, hashedPassword, name }
      // We send 'hashedPassword' as 'password' ? No, `AuthController` register takes `UserModel`.
      // `UserModel` has `hashedPassword`. Frontend usually sends `password` and backend encodes it.
      // Let's check `AuthController.register`: `user.setHashedPassword(passwordEncoder.encode(user.getHashedPassword()));`
      // So it expects the plain password in the `hashedPassword` field of the JSON.
      
      await api.post('/auth/register', { 
        email, 
        hashedPassword: password, 
        name,
        username 
      });
      
      // After register, auto-login
      await login(username, password);
      
    } catch (error) {
      console.error("Register error", error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
  };

  const updateProfile = (data: Partial<User>) => {
    // Not implemented on backend fully yet for updating own profile via this context directly
    if (user) {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
       // TODO: Call backend update endpoint if available
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
