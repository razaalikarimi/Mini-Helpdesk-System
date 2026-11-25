'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Clock, MessageSquare, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { Navbar } from '@/components/layout/Navbar';
import { CategoryBadge, PriorityBadge, StatusBadge } from '@/components/ui/Badge';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { api, getApiErrorMessage } from '@/lib/api';
import { ActivityLog, ApiResponse, Ticket, TicketPriority, TicketStatus, User } from '@/types';

const NEXT_STATUS_OPTIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [],
};

export default function AdminTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!id) return;
    try {
      const [ticketRes, activityRes, adminsRes] = await Promise.all([
        api.get<ApiResponse<Ticket>>(`/tickets/${id}`),
        api.get<ApiResponse<ActivityLog[]>>(`/tickets/${id}/activity`),
        api.get<ApiResponse<User[]>>('/users/admins'),
      ]);
      setTicket(ticketRes.data.data);
      setActivity(activityRes.data.data);
      setAdmins(adminsRes.data.data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load ticket'));
      router.push('/admin');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const handleStatusChange = async (nextStatus: TicketStatus) => {
    try {
      await api.patch(`/admin/tickets/${id}/status`, { status: nextStatus });
      toast.success(`Status updated to ${nextStatus}`);
      await fetchAll();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update status'));
    }
  };

  const handlePriorityChange = async (priority: TicketPriority) => {
    try {
      await api.patch(`/admin/tickets/${id}/priority`, { priority });
      toast.success(`Priority updated to ${priority}`);
      await fetchAll();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update priority'));
    }
  };

  const handleAssign = async (assignedToId: string) => {
    try {
      await api.patch(`/admin/tickets/${id}/assign`, {
        assignedToId: assignedToId || null,
      });
      toast.success('Assignment updated');
      await fetchAll();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to assign ticket'));
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      await api.post(`/tickets/${id}/comments`, { message: commentText.trim() });
      setCommentText('');
      toast.success('Reply sent to user');
      await fetchAll();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to post reply'));
    } finally {
      setSubmittingComment(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Admin Console
        </Link>

        {loading || !ticket ? (
          <CardSkeleton />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={ticket.status} />
                  <PriorityBadge priority={ticket.priority} />
                  <CategoryBadge category={ticket.category} />
                </div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  {ticket.title}
                </h1>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {ticket.description}
                </p>
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 text-xs text-slate-500">
                  <span>
                    Requester: <strong>{ticket.createdBy.name}</strong> ({ticket.createdBy.email})
                  </span>
                  <span>Created: {new Date(ticket.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Conversation */}
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  Conversation ({ticket.comments?.length ?? 0})
                </h2>

                <div className="space-y-4">
                  {ticket.comments?.map((c) => (
                    <div
                      key={c.id}
                      className={`rounded-xl p-4 border ${
                        c.user.role === 'ADMIN'
                          ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200/70 dark:border-indigo-900'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold">{c.user.name}</span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(c.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{c.message}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleComment} className="space-y-3 pt-2">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={3}
                    placeholder="Reply to requester..."
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingComment || !commentText.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {submittingComment ? 'Sending...' : 'Send Reply'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Admin Controls + Activity */}
            <div className="space-y-6">
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5">
                <h2 className="text-base font-semibold">Triage Controls</h2>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase text-slate-500">
                    Transition Status
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {NEXT_STATUS_OPTIONS[ticket.status].length === 0 ? (
                      <span className="text-xs text-slate-400">
                        Ticket is CLOSED (no further transitions).
                      </span>
                    ) : (
                      NEXT_STATUS_OPTIONS[ticket.status].map((next) => (
                        <button
                          key={next}
                          type="button"
                          onClick={() => void handleStatusChange(next)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
                        >
                          Move to {next.replace('_', ' ')}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase text-slate-500">
                    Priority
                  </label>
                  <select
                    value={ticket.priority}
                    onChange={(e) => void handlePriorityChange(e.target.value as TicketPriority)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase text-slate-500">
                    Assigned Admin
                  </label>
                  <select
                    value={ticket.assignedToId ?? ''}
                    onChange={(e) => void handleAssign(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  >
                    <option value="">Unassigned</option>
                    {admins.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                <h2 className="text-base font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  Activity Timeline
                </h2>
                <ol className="relative border-l border-slate-200 dark:border-slate-800 ml-2 space-y-4">
                  {activity.map((item) => (
                    <li key={item.id} className="ml-4">
                      <span className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-indigo-600 border-2 border-white dark:border-slate-900" />
                      <p className="text-xs font-semibold">{item.eventType.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-slate-500">by {item.actor.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
