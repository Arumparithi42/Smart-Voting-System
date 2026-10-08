import { Link, Navigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import {
  BarChart3, Bell, ClipboardCheck, FileText, IdCard, LogIn, MessageSquareWarning, Receipt, ShieldCheck, Trophy, UserPlus, Users,
} from 'lucide-react';
import Hero from '../components/Hero';
import HomeElections from '../components/HomeElections';
import ElectionSpotlight from '../components/ElectionSpotlight';

// What the Smart Voting System actually provides (each item is an existing
// feature of this application).
const FEATURES = [
  { icon: ShieldCheck, title: 'Secure voting', text: 'Voters are verified against the voter registry with an OTP. Each voter can vote once per election, and every vote is recorded atomically.' },
  { icon: ClipboardCheck, title: 'Election management', text: 'Election Officers propose elections; the Admin reviews, approves and schedules them from draft to voting to results.' },
  { icon: FileText, title: 'Candidate information', text: 'Candidate profiles with party, background, promises and manifesto documents. Students can apply to stand as a candidate.' },
  { icon: Bell, title: 'Election notifications', text: 'Live countdowns and reminders before an election starts, when voting opens and before it closes.' },
  { icon: Receipt, title: 'Vote receipt', text: 'Every vote gets a receipt ID and a downloadable PDF to confirm it was counted - without ever revealing your choice.' },
  { icon: Trophy, title: 'Official results', text: 'Results are published by the Admin after voting closes, and emailed to the voters who took part.' },
  { icon: BarChart3, title: 'Election Officer monitoring', text: 'Officers monitor turnout and live totals while voting is open, and review results before they are published.' },
  { icon: MessageSquareWarning, title: 'Complaints & feedback', text: 'Raise a complaint or send feedback straight to the Admin, with a reference ID and status you can track.' },
];

const STEPS = [
  { icon: UserPlus, title: 'Create your account', text: 'Sign up and complete voter verification with your voter ID and OTP.' },
  { icon: Users, title: 'Explore elections', text: 'See upcoming and ongoing elections and read about every candidate.' },
  { icon: IdCard, title: 'Cast your vote', text: 'Vote securely while the election is open and keep your receipt.' },
  { icon: Trophy, title: 'See the results', text: 'View the official results as soon as the Admin publishes them.' },
];

// Public landing page - only for visitors who are not signed in. Signed-in
// users go straight to their Dashboard.
const Home = () => {
  const { isLoaded, isSignedIn } = useUser();
  if (isLoaded && isSignedIn) return <Navigate to="/dashboard" replace />;

  return (
    <div>
      {/* Running ticker of featured upcoming / ongoing elections */}
      <HomeElections />
      <Hero />

      <section className="bg-white py-14 sm:py-20" aria-labelledby="features-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="features-heading" className="text-3xl font-bold text-blue-900 sm:text-4xl">Everything an election needs, in one place</h2>
            <p className="mt-3 text-gray-600">From the first proposal to the published result - secure, transparent and easy to use for voters, Election Officers and Admins.</p>
          </div>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-2xl bg-yellow-50/60 p-6 ring-1 ring-yellow-200/70 transition hover:-translate-y-0.5 hover:shadow-md">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-900 text-white">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-lg font-bold text-blue-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-gradient-to-r from-yellow-100 via-yellow-50 to-white py-14 sm:py-20" aria-labelledby="how-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 id="how-heading" className="text-center text-3xl font-bold text-blue-900 sm:text-4xl">How it works</h2>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="relative rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <span className="absolute -top-3 left-6 rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-bold text-white">Step {i + 1}</span>
                <Icon className="h-8 w-8 text-blue-900" aria-hidden="true" />
                <h3 className="mt-3 font-bold text-blue-900">{title}</h3>
                <p className="mt-1 text-sm text-gray-600">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-blue-900 py-12 text-white" aria-labelledby="cta-heading">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 text-center sm:px-6 md:flex-row md:text-left">
          <div>
            <h2 id="cta-heading" className="text-2xl font-bold sm:text-3xl">Ready to make your voice heard?</h2>
            <p className="mt-2 text-blue-100">Sign in to see your elections, vote and track your receipts.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/sign-in" className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-6 py-3 font-semibold text-white hover:bg-amber-600">
              <LogIn className="h-5 w-5" aria-hidden="true" /> Login
            </Link>
            <Link to="/sign-up" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-blue-900 hover:bg-blue-50">
              <UserPlus className="h-5 w-5" aria-hidden="true" /> Create account
            </Link>
          </div>
        </div>
      </section>

      {/* Bottom-right box: the same featured elections, one at a time */}
      <ElectionSpotlight />
    </div>
  );
};

export default Home;
