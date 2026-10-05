// Election list filters shared by the admin, officer and public lists.
// Selected via ?stage=<key> so dashboard cards can deep-link to a filter.
export const STAGE_FILTERS = {
  all: { label: 'All', stages: null },
  draft: { label: 'Drafts', stages: ['DRAFT'] },
  upcoming: { label: 'Upcoming', stages: ['UPCOMING'] },
  ongoing: { label: 'Ongoing', stages: ['ONGOING'] },
  past: { label: 'Past', stages: ['ENDED', 'RESULTS_PUBLISHED'] },
  pending: { label: 'Results Pending', stages: ['ENDED'] },
  published: { label: 'Published Results', stages: ['RESULTS_PUBLISHED'] },
};

export const filterByStage = (elections, key) => {
  const stages = STAGE_FILTERS[key]?.stages;
  return stages ? elections.filter((e) => stages.includes(e.lifecycleStage)) : elections;
};

export const EMPTY_MESSAGES = {
  all: 'No elections found.',
  draft: 'No draft elections.',
  upcoming: 'No upcoming elections.',
  ongoing: 'No elections are open for voting right now.',
  past: 'No past elections yet.',
  pending: 'No elections are waiting for result publication.',
  published: 'No published results yet.',
};
