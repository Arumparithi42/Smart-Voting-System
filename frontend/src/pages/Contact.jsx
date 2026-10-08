import { useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { toast } from 'react-toastify';
import axiosInstance from '../utils/axiosInstance';
import Req, { RequiredNote } from '../components/ui/Req';

const empty = { name: '', email: '', subject: '', message: '', website: '' };

// Public "Contact Us": the message is emailed to the site owner (the
// address configured on the server), with the sender's email as Reply-To.
const Contact = () => {
  const [form, setForm] = useState(empty);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await axiosInstance.post('/api/contact', form);
      setSent(true);
      setForm(empty);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Your message could not be sent. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const input = 'w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-[#1E3A8A]';

  return (
    <div className="min-h-screen bg-gradient-to-r from-yellow-100 via-yellow-100 to-white">
      <section className="px-4 py-12">
        <div className="mx-auto max-w-3xl rounded-xl bg-white p-6 shadow-lg sm:p-8">
          <h2 className="mb-4 text-center text-3xl font-bold text-[#1E3A8A]">Contact Us</h2>
          <p className="mb-8 text-center text-gray-600">Got any issue? Want to reach us? Let us know - we&apos;ll reply to your email.</p>

          {sent ? (
            <div className="space-y-4 text-center" role="status">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" aria-hidden="true" />
              <p className="text-lg font-semibold text-slate-900">Thank you! Your message has been sent.</p>
              <p className="text-gray-600">We&apos;ll get back to you at the email address you provided.</p>
              <button type="button" onClick={() => setSent(false)} className="rounded-lg px-4 py-2 font-semibold text-[#1E3A8A] ring-1 ring-slate-300 hover:bg-slate-50">Send another message</button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-6">
              <RequiredNote />
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">Your Name</label>
                  <input id="name" value={form.name} onChange={set('name')} maxLength={100} placeholder="Your name" className={input} />
                </div>
                <div>
                  <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">Your Email<Req /></label>
                  <input type="email" id="email" value={form.email} onChange={set('email')} required maxLength={200} placeholder="example@email.com" className={input} />
                </div>
              </div>
              <div>
                <label htmlFor="subject" className="mb-1 block text-sm font-medium text-gray-700">Subject<Req /></label>
                <input id="subject" value={form.subject} onChange={set('subject')} required maxLength={200} placeholder="Let us know how we can help you" className={input} />
              </div>
              <div>
                <label htmlFor="message" className="mb-1 block text-sm font-medium text-gray-700">Your Message<Req /></label>
                <textarea id="message" rows={6} value={form.message} onChange={set('message')} required minLength={5} maxLength={5000} placeholder="Leave a message..." className={input} />
              </div>
              {/* Spam trap - hidden from people, filled in by bots. */}
              <div className="hidden" aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input id="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
              </div>
              <p className="text-xs text-gray-500">Please don&apos;t include passwords, OTPs or your Aadhaar number.</p>
              <button disabled={sending} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1E3A8A] px-4 py-2.5 font-semibold text-white transition-colors hover:bg-[#2B4BA8] disabled:bg-gray-400">
                <Send className="h-4 w-4" aria-hidden="true" /> {sending ? 'Sending…' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
};

export default Contact;
