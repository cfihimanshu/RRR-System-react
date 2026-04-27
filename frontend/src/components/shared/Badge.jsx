import React from 'react';

export const Badge = ({ status }) => {
  if (!status) return null;
  const s = status.toLowerCase();
  let badgeClass = 'badge-open';
  if (s === 'closed') badgeClass = 'badge-closed';
  else if (s === 'pending') badgeClass = 'badge-pending';
  else if (s === 'high') badgeClass = 'badge-high';
  else if (s === 'medium') badgeClass = 'badge-medium';
  else if (s === 'low') badgeClass = 'badge-low';
  else if (s === 'settled') badgeClass = 'badge-settled';
  
  return <span className={`badge ${badgeClass}`}>{status}</span>;
};
