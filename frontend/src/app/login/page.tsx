'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { LifeBuoy } from 'lucide-react';
import { FormInput } from '@/components/ui/FormInput';
import { getApiErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // Pre-warm the backend API (helpful when hosted on Render free tier)
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    const healthUrl = apiUrl.replace(/\/api\/v1\/?$/, '/health');
    fetch(healthUrl, { mode: 'cors' }).catch(() => {});
  }, []);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setSubmitting(true);
    try {
      const user = await login(data.email, data.password);
      toast.success(`Welcome back, ${user.name}`);
      router.push(user.role === 'ADMIN' ? '/admin' : '/dashboard');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Invalid credentials'));
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (email: string, password: string) => {
    setValue('email', email);
    setValue('password', password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
            <LifeBuoy className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Sign in to Helpdesk
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Track support tickets, updates, and team resolutions
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormInput
              label="Email Address"
              type="email"
              placeholder="alice@helpdesk.local"
              error={errors.email?.message}
              {...register('email')}
            />
            <FormInput
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-sm disabled:opacity-60 transition"
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 text-center">
              Quick Demo Credentials
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillDemo('admin@helpdesk.local', 'AdminPass123!')}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Demo Admin
              </button>
              <button
                type="button"
                onClick={() => fillDemo('alice@helpdesk.local', 'UserPass123!')}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Demo User (Alice)
              </button>
            </div>
          </div>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold text-indigo-600 hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
