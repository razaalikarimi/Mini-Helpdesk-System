'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Ticket as TicketIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { Navbar } from '@/components/layout/Navbar';
import { CategoryBadge, PriorityBadge, StatusBadge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { Column, Table } from '@/components/ui/Table';
import { api, getApiErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  ApiResponse,
  PaginationMeta,
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '@/types';

export default function UserDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TicketStatus | ''>('');
  const [priority, setPriority] = useState<TicketPriority | ''>('');
  const [category, setCategory] = useState<TicketCategory | ''>('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
    if (!authLoading && user?.role === 'ADMIN') router.replace('/admin');
  }, [authLoading, user, router]);

  const fetchTickets = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 10 };
      if (search.trim()) params.search = search.trim();
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (category) params.category = category;

      const res = await api.get<ApiResponse<Ticket[]>>('/tickets/my', { params });
      setTickets(res.data.data);
      if (res.data.meta) setMeta(res.data.meta);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load tickets'));
    } finally {
      setLoading(false);
    }
  }, [user, page, search, status, priority, category]);

  useEffect(() => {
    void fetchTickets();
  }, [fetchTickets]);

  const columns: Column<Ticket>[] = [
    {
      key: 'title',
      header: 'Ticket',
      render: (t) => (
        <div>
          <p className="font-semibold text-slate-900 dark:text-slate-100">{t.title}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
            {t.description}
          </p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (t) => <CategoryBadge category={t.category} />,
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (t) => <PriorityBadge priority={t.priority} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => <StatusBadge status={t.status} />,
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      render: (t) => (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {new Date(t.updatedAt).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Support Tickets</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Track progress, reply to support agents, and manage open requests.
            </p>
          </div>
          <Link
            href="/tickets/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Create Ticket
          </Link>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search title or description..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as TicketStatus | '');
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
          </select>

          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value as TicketPriority | '');
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          >
            <option value="">All Priorities</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="URGENT">URGENT</option>
          </select>

          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as TicketCategory | '');
              setPage(1);
            }}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          >
            <option value="">All Categories</option>
            <option value="BUG">BUG</option>
            <option value="FEATURE">FEATURE</option>
            <option value="BILLING">BILLING</option>
            <option value="ACCOUNT">ACCOUNT</option>
            <option value="GENERAL">GENERAL</option>
            <option value="OTHER">OTHER</option>
          </select>
        </div>

        {/* Table Card */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {loading ? (
            <TableSkeleton rows={5} />
          ) : tickets.length === 0 ? (
            <div className="py-16 px-4 text-center space-y-3">
              <div className="inline-flex p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
                <TicketIcon className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No tickets match your filters
              </p>
              <Link
                href="/tickets/new"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:underline"
              >
                <Plus className="w-4 h-4" /> Create your first ticket
              </Link>
            </div>
          ) : (
            <>
              <Table
                data={tickets}
                columns={columns}
                keyExtractor={(t) => t.id}
                onRowClick={(t) => router.push(`/tickets/${t.id}`)}
              />
              <Pagination meta={meta} onPageChange={setPage} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
