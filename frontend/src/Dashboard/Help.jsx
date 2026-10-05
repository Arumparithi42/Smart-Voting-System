import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, MessageSquareWarning, Search } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/States';

const faqData = [
  { question: 'How do I vote?', answer: 'Complete voter verification first (Voter Login → Voter ID + registered email → OTP to your registered phone). Then open an election marked "Voting Open" from Elections, choose a candidate, press "Submit Your Vote" and confirm.' },
  { question: 'How do I complete voter verification?', answer: 'Sign in, open "Voter Login", enter your Voter ID and registered email, then type the 6-digit OTP sent to your registered phone. The OTP is valid for 5 minutes; after 3 wrong attempts verification is locked for 30 minutes.' },
  { question: 'How do I know my vote was counted?', answer: 'After voting you receive a receipt ID. Use "Verify Receipt" to confirm a vote with that receipt was recorded. The receipt never reveals which candidate you chose.' },
  { question: 'Is my vote secret?', answer: 'Yes. The system records that you voted (to stop double voting) but never links your account to your choice. Results, notifications and result emails only contain aggregate totals.' },
  { question: 'When will results be published?', answer: 'After voting closes, an Election Officer reviews the final count and the Admin publishes the official results. You get a notification, and if you voted you also receive the results by email.' },
  { question: 'Why can\'t I vote right now?', answer: 'Usually because verification isn\'t complete, the election hasn\'t started or has already ended, or you have already voted. The countdown on each election shows when voting opens and closes - the server makes the final decision.' },
  { question: 'How do I raise a complaint?', answer: 'Open "My Complaints", choose the election and a category, describe the problem and submit. You get a reference ID like CMP-2026-00124. Complaints go directly to the Admin and you are notified when the status changes.' },
  { question: 'What is an Election Officer?', answer: 'Election Officers propose elections to the Admin and monitor approved elections. They cannot create official elections, publish results, see how anyone voted, or access Aadhaar data.' },
  { question: 'Can I change my Voter ID, email or phone?', answer: 'No - these come from the verified college voter registry. You can update your display name, bio and profile photo on the Profile page. If your registry details are wrong, raise a complaint.' },
];

export default function HelpSupportPage() {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const visible = faqData.filter((f) => !q || `${f.question} ${f.answer}`.toLowerCase().includes(q));

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Help & Support" subtitle="Answers to common questions about voting in the Smart Voting System." />
        <div className="relative mb-6">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for help…"
            aria-label="Search help topics"
            className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div className="space-y-3">
          {visible.length === 0 ? <EmptyState title="No matching help topics." message="Try different words, or ask the assistant." /> : visible.map((faq) => (
            <details key={faq.question} className="group rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <summary className="cursor-pointer list-none font-semibold text-slate-900 marker:hidden">
                <span className="flex items-center justify-between gap-3">{faq.question}<span className="text-slate-400 transition group-open:rotate-45">+</span></span>
              </summary>
              <p className="mt-2 text-sm text-slate-600">{faq.answer}</p>
            </details>
          ))}
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <button onClick={() => window.dispatchEvent(new Event('open-chatbot'))} className="flex items-center gap-3 rounded-xl bg-white p-4 text-left font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 hover:ring-blue-300">
            <Bot className="h-6 w-6 text-[#1E3A8A]" aria-hidden="true" /> Ask the Smart Voting Assistant
          </button>
          <Link to="/dashboard/complaints" className="flex items-center gap-3 rounded-xl bg-white p-4 font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 hover:ring-blue-300">
            <MessageSquareWarning className="h-6 w-6 text-[#1E3A8A]" aria-hidden="true" /> Raise a complaint
          </Link>
        </div>
      </div>
    </div>
  );
}
