export const getEffectiveElectionStatus = (election) => {
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
