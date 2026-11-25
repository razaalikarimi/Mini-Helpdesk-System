'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';
import { ApiResponse, User } from '@/types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function persistSession(token: string, user: User) {
  localStorage.setItem('helpdesk_token', token);
  localStorage.setItem('helpdesk_user', JSON.stringify(user));
  document.cookie = `helpdesk_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
  document.cookie = `helpdesk_role=${user.role}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
}

function clearSession() {
  localStorage.removeItem('helpdesk_token');
  localStorage.removeItem('helpdesk_user');
  document.cookie = 'helpdesk_token=; path=/; max-age=0';
  document.cookie = 'helpdesk_role=; path=/; max-age=0';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchMe = useCallback(async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('helpdesk_token') : null;
    if (!token) {
      setLoading(false);
      return;
    }

    const cachedRaw = localStorage.getItem('helpdesk_user');
    if (cachedRaw) {
      try {
        setUser(JSON.parse(cachedRaw) as User);
        setLoading(false);
      } catch {
        // ignore invalid cache
      }
    }

    try {
      const res = await api.get<ApiResponse<User>>('/auth/me');
      setUser(res.data.data);
      persistSession(token, res.data.data);
    } catch {
      clearSession();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await api.post<ApiResponse<{ user: User; accessToken: string }>>('/auth/login', {
      email,
      password,
    });
    const { user: loggedInUser, accessToken } = res.data.data;
    persistSession(accessToken, loggedInUser);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const register = async (name: string, email: string, password: string): Promise<User> => {
    const res = await api.post<ApiResponse<{ user: User; accessToken: string }>>(
      '/auth/register',
      { name, email, password },
    );
    const { user: registeredUser, accessToken } = res.data.data;
    persistSession(accessToken, registeredUser);
    setUser(registeredUser);
    return registeredUser;
  };

  const logout = () => {
    clearSession();
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
