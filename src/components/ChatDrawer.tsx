import React, { useEffect, useRef, useState } from 'react';
import { Send, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import type { Booking, ChatMessage } from '../types';

export function ChatDrawer({
  booking,
  onClose,
}: {
  booking: Booking | null;
  onClose: () => void;
}) {
  const { user, subscribeRealtime } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!booking) return;
    setLoading(true);
    setError('');
    apiRequest<{ messages: ChatMessage[] }>(`/api/bookings/${booking.id}/messages`)
      .then((res) => setMessages(res.messages))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [booking]);

  useEffect(() => {
    if (!booking) return;
    return subscribeRealtime((evt) => {
      if (evt.type === 'chat:message' && evt.bookingId === booking.id && evt.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === evt.message.id)) return prev;
          return [...prev, evt.message];
        });
      }
    });
  }, [booking, subscribeRealtime]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!booking) return null;

  const counterpartName =
    user?.id === booking.customer_id ? booking.worker_name : booking.customer_name;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError('');
    try {
      const res = await apiRequest<{ message: ChatMessage }>(`/api/bookings/${booking.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: trimmed }),
      });
      setMessages((prev) => (prev.some((m) => m.id === res.message.id) ? prev : [...prev, res.message]));
      setBody('');
    } catch (err: any) {
      setError(err.message || 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[1px]">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl border-s border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-[#0B1F3A] text-white">
          <div className="min-w-0">
            <h3 className="font-display text-base font-semibold truncate">
              {counterpartName || 'Booking Chat'}
            </h3>
            <p className="text-xs text-slate-300 truncate">
              {booking.service_title} · {booking.city}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat"
            className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-slate-50">
          {loading && (
            <div className="space-y-3">
              <div className="h-12 w-3/4 rounded-lg bg-slate-200 animate-pulse" />
              <div className="h-12 w-2/3 ms-auto rounded-lg bg-slate-200 animate-pulse" />
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div className="py-12 text-center text-sm text-slate-500">
              No messages yet. Coordinate arrival time, tools, or location details directly here.
            </div>
          )}

          {messages.map((msg) => {
            const isMine = msg.sender_id === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[85%] ${isMine ? 'ms-auto items-end' : 'items-start'}`}
              >
                <div
                  className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                    isMine
                      ? 'bg-[#0B1F3A] text-white'
                      : 'bg-white border border-slate-200 text-slate-800'
                  }`}
                >
                  {msg.body}
                </div>
                <span className="mt-1 text-[11px] text-slate-400 tabular-nums">
                  {msg.sender_name} · {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="border-t border-red-200 bg-red-50 px-5 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-slate-200 bg-white p-4">
          <input
            type="text"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a message..."
            className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0D9488] focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !body.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0D9488] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0F766E] disabled:opacity-50 cursor-pointer"
          >
            <Send className="h-4 w-4" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
