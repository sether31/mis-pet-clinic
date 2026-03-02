export const displayDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    // Strip time if it's a DATETIME string (e.g., "2024-02-28 14:30:00")
    const dateOnly = dateString.split(' ')[0]; 
    const [year, month, day] = dateOnly.split('-');
    
    return new Date(year, month - 1, day).toLocaleDateString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric' 
    });
  } catch (e) { 
    return dateString; 
  }
};