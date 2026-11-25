'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { FormInput, FormSelect, FormTextarea } from '@/components/ui/FormInput';
import { api, getApiErrorMessage } from '@/lib/api';
import { ApiResponse, Ticket } from '@/types';

const createTicketSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(150),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(5000),
  category: z.enum(['BUG', 'FEATURE', 'BILLING', 'ACCOUNT', 'GENERAL', 'OTHER']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
});

type CreateTicketForm = z.infer<typeof createTicketSchema>;

export default function NewTicketPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTicketForm>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      category: 'GENERAL',
      priority: 'MEDIUM',
    },
  });

  const onSubmit = async (data: CreateTicketForm) => {
    setSubmitting(true);
    try {
      const res = await api.post<ApiResponse<Ticket>>('/tickets', data);
      toast.success('Ticket created successfully');
      router.push(`/tickets/${res.data.data.id}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to create ticket'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Tickets
        </Link>

        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Submit a Support Ticket
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Provide clear details so our team can resolve your issue quickly.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <FormInput
              label="Subject / Title"
              placeholder="e.g., Unable to export billing invoice PDF"
              error={errors.title?.message}
              {...register('title')}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormSelect
                label="Category"
                error={errors.category?.message}
                options={[
                  { label: 'General', value: 'GENERAL' },
                  { label: 'Bug Report', value: 'BUG' },
                  { label: 'Feature Request', value: 'FEATURE' },
                  { label: 'Billing', value: 'BILLING' },
                  { label: 'Account', value: 'ACCOUNT' },
                  { label: 'Other', value: 'OTHER' },
                ]}
                {...register('category')}
              />

              <FormSelect
                label="Priority"
                error={errors.priority?.message}
                options={[
                  { label: 'Low', value: 'LOW' },
                  { label: 'Medium', value: 'MEDIUM' },
                  { label: 'High', value: 'HIGH' },
                  { label: 'Urgent', value: 'URGENT' },
                ]}
                {...register('priority')}
              />
            </div>

            <FormTextarea
              label="Description"
              rows={6}
              placeholder="Steps to reproduce, expected behavior, or any relevant context..."
              error={errors.description?.message}
              {...register('description')}
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <Link
                href="/dashboard"
                className="px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm disabled:opacity-60 transition"
              >
                {submitting ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
