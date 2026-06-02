export function formatMonthDisplay(reportMonthId) {
  if (!reportMonthId || typeof reportMonthId !== 'string') return reportMonthId;
  const parts = reportMonthId.split('-');
  if (parts.length !== 2) return reportMonthId;

  const year = parts[0];
  const monthNum = parseInt(parts[1], 10);

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  if (monthNum >= 1 && monthNum <= 12) {
    return `${months[monthNum - 1]} ${year}`;
  }

  return reportMonthId;
}
