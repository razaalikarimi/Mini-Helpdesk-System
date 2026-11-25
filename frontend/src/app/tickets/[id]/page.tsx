'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Clock, Edit3, MessageSquare, Send, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Navbar } from '@/components/layout/Navbar';
import { CategoryBadge, PriorityBadge, StatusBadge } from '@/components/ui/Badge';
import { FormInput, FormSelect, FormTextarea } from '@/components/ui/FormInput';
import { Modal } from '@/components/ui/Modal';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { api, getApiErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ActivityLog, ApiResponse, Ticket, TicketCategory, TicketPriority } from '@/types';

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState<TicketCategory>('GENERAL');
  const [editPriority, setEditPriority] = useState<TicketPriority>('MEDIUM');
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    try {
      const [ticketRes, activityRes] = await Promise.all([
        api.get<ApiResponse<Ticket>>(`/tickets/${id}`),
        api.get<ApiResponse<ActivityLog[]>>(`/tickets/${id}/activity`),
      ]);
      const t = ticketRes.data.data;
      setTicket(t);
      setActivity(activityRes.data.data);
      setEditTitle(t.title);
      setEditDesc(t.description);
      setEditCategory(t.category);
      setEditPriority(t.priority);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load ticket'));
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSendingComment(true);
    try {
      await api.post(`/tickets/${id}/comments`, { message: commentText.trim() });
      setCommentText('');
      toast.success('Reply posted');
      await fetchDetail();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to post comment'));
    } finally {
      setSendingComment(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      await api.patch(`/tickets/${id}`, {
        title: editTitle,
        description: editDesc,
        category: editCategory,
        priority: editPriority,
      });
      toast.success('Ticket updated');
      setEditOpen(false);
      await fetchDetail();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update ticket'));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/tickets/${id}`);
      toast.success('Ticket deleted');
      router.push('/dashboard');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to delete ticket'));
    } finally {
      setDeleting(false);
    }
  };

  const canModify = ticket && user && ticket.createdById === user.id && ticket.status === 'OPEN';
  const canComment = ticket && (user?.role === 'ADMIN' || ticket.status !== 'CLOSED');

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Tickets
        </Link>

        {loading || !ticket ? (
          <CardSkeleton />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Ticket + Comments */}
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={ticket.status} />
                      <PriorityBadge priority={ticket.priority} />
                      <CategoryBadge category={ticket.category} />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                      {ticket.title}
                    </h1>
                  </div>

                  {canModify && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {ticket.description}
                </p>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                  <span>Created: {new Date(ticket.createdAt).toLocaleString()}</span>
                  {ticket.assignedTo && <span>Assigned to: {ticket.assignedTo.name}</span>}
                  {ticket.resolvedAt && (
                    <span>Resolved: {new Date(ticket.resolvedAt).toLocaleString()}</span>
                  )}
                </div>
              </div>

              {/* Comments Thread */}
              <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-sm">
                <h2 className="text-base font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                  Conversation ({ticket.comments?.length ?? 0})
                </h2>

                <div className="space-y-4">
                  {(!ticket.comments || ticket.comments.length === 0) && (
                    <p className="text-sm text-slate-500">No comments yet.</p>
                  )}
                  {ticket.comments?.map((c) => (
                    <div
                      key={c.id}
                      className={`rounded-xl p-4 border ${
                        c.user.role === 'ADMIN'
                          ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200/70 dark:border-indigo-900'
                          : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {c.user.name}{' '}
                          {c.user.role === 'ADMIN' && (
                            <span className="ml-1 px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[10px]">
                              Support
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(c.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {c.message}
                      </p>
                    </div>
                  ))}
                </div>

                {canComment ? (
                  <form onSubmit={handleAddComment} className="space-y-3 pt-2">
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={3}
                      placeholder="Write a reply..."
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={sendingComment || !commentText.trim()}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50 transition"
                      >
                        <Send className="w-3.5 h-3.5" />
                        {sendingComment ? 'Posting...' : 'Post Reply'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    This ticket is CLOSED. Comments are disabled.
                  </p>
                )}
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm h-fit">
              <h2 className="text-base font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                <Clock className="w-4 h-4 text-indigo-600" />
                Activity Timeline
              </h2>
              {activity.length === 0 ? (
                <p className="text-sm text-slate-500">No activity recorded.</p>
              ) : (
                <ol className="relative border-l border-slate-200 dark:border-slate-800 ml-2 space-y-5">
                  {activity.map((item) => (
                    <li key={item.id} className="ml-4">
                      <span className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-indigo-600 border-2 border-white dark:border-slate-900" />
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {item.eventType.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        by {item.actor.name}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}
      </main>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Open Ticket">
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <FormInput
            label="Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <FormSelect
              label="Category"
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value as TicketCategory)}
              options={[
                { label: 'General', value: 'GENERAL' },
                { label: 'Bug', value: 'BUG' },
                { label: 'Feature', value: 'FEATURE' },
                { label: 'Billing', value: 'BILLING' },
                { label: 'Account', value: 'ACCOUNT' },
                { label: 'Other', value: 'OTHER' },
              ]}
            />
            <FormSelect
              label="Priority"
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value as TicketPriority)}
              options={[
                { label: 'Low', value: 'LOW' },
                { label: 'Medium', value: 'MEDIUM' },
                { label: 'High', value: 'HIGH' },
                { label: 'Urgent', value: 'URGENT' },
              ]}
            />
          </div>
          <FormTextarea
            label="Description"
            rows={4}
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingEdit}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold"
            >
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Ticket">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to permanently delete this ticket? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold"
            >
              {deleting ? 'Deleting...' : 'Delete Ticket'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
