export const getEffectiveElectionStatus = (election) => {
  // Drafts are never open for voting (or visible to voters), whatever their
  // start/end times say, until an admin schedules them.
  if (election.status === 'draft') {
    return 'draft';
  }

  // Graceful fallback for legacy elections created before startTime/endTime existed.
  if (!election.startTime || !election.endTime) {
    return election.status || 'upcoming';
  }

  const now = new Date();
  
  if (now < election.startTime) {
    return 'upcoming';
  } else if (now >= election.startTime && now < election.endTime) {
    return 'ongoing';
  } else {
    return 'completed';
  }
};

// Full lifecycle: DRAFT -> UPCOMING -> ONGOING -> ENDED -> RESULTS_PUBLISHED.
// ENDED vs RESULTS_PUBLISHED is the only distinction effectiveStatus
// doesn't make (both are 'completed' there).
export const getElectionLifecycleStage = (election) => {
  const status = getEffectiveElectionStatus(election);
  switch (status) {
    case 'draft':
      return 'DRAFT';
    case 'upcoming':
      return 'UPCOMING';
    case 'ongoing':
      return 'ONGOING';
    default:
      return election.resultsPublished ? 'RESULTS_PUBLISHED' : 'ENDED';
  }
};
