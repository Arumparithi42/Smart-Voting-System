import { useEffect, useRef, useState } from 'react';
import { Bot, Loader2, Send, X } from 'lucide-react';
import axiosInstance from '../utils/axiosInstance';

const WELCOME = "Hello! I'm your Smart Voting Assistant. How can I help you?";
const SUGGESTIONS = [
  'How do I vote?',
  'When is my next election?',
  'How do I raise a complaint?',
  'When will results be published?',
];
const MAX_LENGTH = 500;
// Per-user key, so a different account in the same tab never sees it.
const storageKey = (userId) => `svs-chat-history:${userId}`;

const loadHistory = (userId) => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey(userId)) || 'null');
    if (Array.isArray(saved) && saved.length) return saved;
  } catch { /* storage unavailable */ }
  return [{ role: 'assistant', text: WELCOME }];
};

// Floating, read-only assistant. All answers come from the backend, which
// only uses data this user is allowed to see; no keys live in the browser.
export default function Chatbot({ userId }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => loadHistory(userId));
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const openChat = () => setOpen(true);
    window.addEventListener('open-chatbot', openChat);
    return () => window.removeEventListener('open-chatbot', openChat);
  }, []);

  useEffect(() => {
    try { sessionStorage.setItem(storageKey(userId), JSON.stringify(messages.slice(-30))); } catch { /* ignore */ }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open, userId]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = async (text) => {
    const question = text.trim();
    if (!question || sending) return;
    if (question.length > MAX_LENGTH) {
      setError(`Please keep questions under ${MAX_LENGTH} characters.`);
      return;
    }
    const history = messages.filter((m) => m.text !== WELCOME).slice(-6);
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setInput('');
    setError('');
    setSending(true);
    try {
      const res = await axiosInstance.post('/api/chatbot/message', { message: question, history });
      setMessages((m) => [...m, { role: 'assistant', text: res.data.reply }]);
    } catch (err) {
      setError(err.response?.data?.message || 'The assistant is unavailable right now. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const reset = () => setMessages([{ role: 'assistant', text: WELCOME }]);

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-[#1E3A8A] px-4 py-3 font-semibold text-white shadow-lg hover:bg-blue-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
          aria-label="Open Smart Voting Assistant"
        >
          <Bot className="h-6 w-6" aria-hidden="true" />
          <span className="hidden sm:inline">Need help?</span>
        </button>
      )}

      {open && (
        <section
          className="app-ui fixed inset-x-0 bottom-0 z-50 flex h-[85vh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl ring-1 ring-slate-200 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:h-[34rem] sm:w-96 sm:rounded-2xl"
          aria-label="Smart Voting Assistant"
        >
          <header className="flex items-center justify-between bg-gradient-to-r from-[#1E3A8A] to-blue-600 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <Bot className="h-6 w-6" aria-hidden="true" />
              <div>
                <p className="font-semibold leading-tight">Smart Voting Assistant</p>
                <p className="text-xs text-blue-100">Information only · never asks for OTPs</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={reset} className="rounded-md px-2 py-1 text-xs text-blue-100 hover:bg-white/15">Clear</button>
              <button onClick={() => setOpen(false)} className="rounded-md p-1 hover:bg-white/15" aria-label="Close assistant">
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <p className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm ${
                  m.role === 'user' ? 'rounded-br-sm bg-[#1E3A8A] text-white' : 'rounded-bl-sm bg-white text-slate-800 shadow-sm ring-1 ring-slate-200'
                }`}>
                  {m.text}
                </p>
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Thinking…</div>
            )}
            {messages.length <= 1 && !sending && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#1E3A8A] ring-1 ring-blue-200 hover:bg-blue-50">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700" role="alert">{error}</p>}

          <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-2 border-t bg-white p-3">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={MAX_LENGTH}
              placeholder="Ask about voting, elections, results…"
              aria-label="Your question"
              className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <button disabled={sending || !input.trim()} className="rounded-full bg-[#1E3A8A] p-2.5 text-white hover:bg-blue-800 disabled:bg-slate-300" aria-label="Send">
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </section>
      )}
    </>
  );
}
