import { authStorage, clearAuthSession, getAuthToken, saveAuthSession } from '@/lib/auth-session';
import React, { createContext, useContext, useState } from 'react';
import api from '@/services/api';
import { PUBLIC_ROUTES } from '@/services/api';

interface User {
  photo?: string;
  id: string; 
  email: string;
  name: string;
  username: string;
  city?: string;
  instrument?: string;
  bio?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, remember?: boolean) => Promise<void>;
  register: (email: string, password: string, name: string, username: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // Check for token and load user
    if (typeof window !== 'undefined') {
        const token = getAuthToken();
        const storedUser = authStorage().getItem('currentUser');
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
      const token = getAuthToken();
      if (token) {
        try {
          // We use the new /me endpoint which requires authentication
          await api.get('/auth/me');
        } catch {
          // Token verification failed, logging out
          // Logout logic duplicated here to avoid dependency cycle or closure issues before logout is defined
          setUser(null);
          clearAuthSession();
          const isPublicRoute = PUBLIC_ROUTES.some(route => window.location.pathname.startsWith(route));
          
          if (!isPublicRoute) {
             window.location.href = '/login';
          }
        }
      }
    };
    verifyToken();
  }, []);

  // Auth responses do not include photos; refresh the current public profile separately.
  React.useEffect(() => {
    if (!user?.id) return;
    const id = user.id;
    const controller = new AbortController();
    api.get('/users/' + id, { signal: controller.signal }).then(({ data }) => {
      if (typeof data.photo !== 'string') return;
      setUser(previous => {
        if (!previous || previous.id !== id || previous.photo === data.photo) return previous;
        const next = { ...previous, photo: data.photo };
        authStorage().setItem('currentUser', JSON.stringify(next));
        return next;
      });
    }).catch(() => { /* Profile images are optional; a failure must not end the session. */ });
    return () => controller.abort();
  }, [user?.id]);

  const login = async (username: string, password: string, remember = false) => {
    try {
      const response = await api.post('/auth/login', { username, password }, { timeout: 30000 });
      const { token, id, email, name, city } = response.data;
      const user: User = { 
        id: String(id), // Ensure it's a string for frontend consistency
        username: response.data.username || username,
        email,
        name,
        city: city || '',
        photo: response.data.photo || '',
      };
      
      saveAuthSession(token, user, remember);
      setUser(user);
      
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
      
      // After register, do NOT auto-login. Let the user verify email.
      // await login(username, password);
      
    } catch (error) {
      console.error("Register error", error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    clearAuthSession();
  };

  const updateProfile = (data: Partial<User>) => {
    // Not implemented on backend fully yet for updating own profile via this context directly
    if (user) {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      authStorage().setItem('currentUser', JSON.stringify(updatedUser));
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
