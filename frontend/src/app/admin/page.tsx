'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CheckCircle2, Clock, Inbox, Search, Ticket as TicketIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { Navbar } from '@/components/layout/Navbar';
import { CategoryBadge, PriorityBadge, StatusBadge } from '@/components/ui/Badge';
import { Pagination } from '@/components/ui/Pagination';
import { CardSkeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { Column, Table } from '@/components/ui/Table';
import { api, getApiErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  ApiResponse,
  DashboardStats,
  PaginationMeta,
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '@/types';

export default function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(true);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TicketStatus | ''>('');
  const [priority, setPriority] = useState<TicketPriority | ''>('');
  const [category, setCategory] = useState<TicketCategory | ''>('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
    if (!authLoading && user && user.role !== 'ADMIN') router.replace('/dashboard');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    api
      .get<ApiResponse<DashboardStats>>('/admin/dashboard/stats')
      .then((res) => setStats(res.data.data))
      .catch((err) => toast.error(getApiErrorMessage(err, 'Failed to load dashboard stats')))
      .finally(() => setLoadingStats(false));
  }, [user]);

  const fetchTickets = useCallback(async () => {
    if (!user || user.role !== 'ADMIN') return;
    setLoadingTickets(true);
    try {
      const params: Record<string, string | number> = { page, limit: 10 };
      if (search.trim()) params.search = search.trim();
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (category) params.category = category;

      const res = await api.get<ApiResponse<Ticket[]>>('/admin/tickets', { params });
      setTickets(res.data.data);
      if (res.data.meta) setMeta(res.data.meta);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load tickets'));
    } finally {
      setLoadingTickets(false);
    }
  }, [user, page, search, status, priority, category]);

  useEffect(() => {
    void fetchTickets();
  }, [fetchTickets]);

  const statusChartData = stats
    ? Object.entries(stats.byStatus).map(([name, value]) => ({ name: name.replace('_', ' '), value }))
    : [];

  const columns: Column<Ticket>[] = [
    {
      key: 'title',
      header: 'Ticket',
      render: (t) => (
        <div>
          <p className="font-semibold text-slate-900 dark:text-slate-100">{t.title}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">by {t.createdBy.name}</p>
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
      key: 'assignedTo',
      header: 'Assignee',
      render: (t) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {t.assignedTo?.name ?? 'Unassigned'}
        </span>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Admin Operations Console
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Monitor helpdesk metrics, triage incoming tickets, and manage resolutions.
          </p>
        </div>

        {/* Stats Cards */}
        {loadingStats || !stats ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Total Tickets</p>
                <p className="text-2xl font-bold mt-1">{stats.totalTickets}</p>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                <TicketIcon className="w-5 h-5" />
              </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Open Queue</p>
                <p className="text-2xl font-bold mt-1">{stats.byStatus.OPEN}</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
                <Inbox className="w-5 h-5" />
              </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Resolved / Closed</p>
                <p className="text-2xl font-bold mt-1">
                  {stats.byStatus.RESOLVED + stats.byStatus.CLOSED}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Avg Resolution</p>
                <p className="text-2xl font-bold mt-1">{stats.avgResolutionTimeHours}h</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </div>
        )}

        {/* Charts */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                Tickets by Status
              </h2>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusChartData}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                Tickets Created (Last 7 Days)
              </h2>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.ticketsLast7Days}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* All Tickets Filters & Table */}
        <div className="space-y-4">
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
                placeholder="Search tickets..."
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

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {loadingTickets ? (
              <TableSkeleton rows={5} />
            ) : (
              <>
                <Table
                  data={tickets}
                  columns={columns}
                  keyExtractor={(t) => t.id}
                  onRowClick={(t) => router.push(`/admin/tickets/${t.id}`)}
                  emptyMessage="No tickets found."
                />
                <Pagination meta={meta} onPageChange={setPage} />
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
