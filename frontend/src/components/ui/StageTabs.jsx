import { useSearchParams } from 'react-router-dom';
import { STAGE_FILTERS, filterByStage } from '../../utils/stageFilters';

// Filter tabs bound to ?stage=..., with a count per tab.
export function useStageFilter(allowed, fallback = 'all') {
  const [params, setParams] = useSearchParams();
  const requested = params.get('stage');
  const stage = allowed.includes(requested) ? requested : fallback;
  const setStage = (key) => {
    const next = new URLSearchParams(params);
    if (key === fallback) next.delete('stage'); else next.set('stage', key);
    setParams(next, { replace: true });
  };
  return [stage, setStage];
}

export default function StageTabs({ elections, allowed, value, onChange }) {
  return (
    <div className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Filter elections">
      {allowed.map((key) => {
        const active = value === key;
        const count = filterByStage(elections, key).length;
        return (
          <button
            key={key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(key)}
            className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              active ? 'bg-[#1E3A8A] text-white shadow-sm' : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
            }`}
          >
            {STAGE_FILTERS[key].label}
            <span className={`rounded-full px-1.5 text-xs ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}
