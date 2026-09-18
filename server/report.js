const firstYear = 2020;
const lastYear = 2030;

function parseDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError('Dates must use YYYY-MM-DD.');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new RangeError('Invalid report date.');
  return date;
}

function monthIndex(date) {
  return (date.getUTCFullYear() - 2024) * 12 + date.getUTCMonth() - 1;
}

function hash(value) {
  let result = 0;
  for (const character of value) result = (result * 31 + character.charCodeAt(0)) >>> 0;
  return result;
}

function monthlyValue(node, date) {
  const index = monthIndex(date);
  if (index >= 0 && index < 12) return node.values[index];

  const anchor = index < 0 ? node.values[0] : node.values[11];
  const distance = index < 0 ? index : index - 11;
  const seasonal = Math.sin((index + hash(node.id) % 12) * Math.PI / 6) * Math.max(1, anchor * 0.02);
  return Math.max(0, Math.round(anchor * (1 + distance * 0.012) + seasonal));
}

function dailyValue(node, date) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const previous = monthlyValue(node, new Date(Date.UTC(year, month - 1, 1)));
  const current = monthlyValue(node, date);
  const progress = day / daysInMonth;
  const variation = Math.sin((day + hash(node.id) % 7) * 1.7) * Math.sin(Math.PI * progress) * Math.max(1, current * 0.006);
  return Math.max(0, Math.round(previous + (current - previous) * progress + variation));
}

function projectNode(node, dates, detail) {
  return {
    ...node,
    values: dates.map(date => detail === 'day' ? dailyValue(node, date) : monthlyValue(node, date)),
    ...(node.branches && { branches: node.branches.map(child => projectNode(child, dates, detail)) }),
    ...(node.employees && { employees: node.employees.map(child => projectNode(child, dates, detail)) }),
    ...(node.channels && { channels: node.channels.map(child => projectNode(child, dates, detail)) }),
  };
}

export function createReport(root, fromValue, toValue, detail) {
  const from = parseDate(fromValue);
  const to = parseDate(toValue);
  if (!['year', 'month', 'day'].includes(detail)) throw new RangeError('Detail must be year, month, or day.');
  if (from > to || from.getUTCFullYear() < firstYear || to.getUTCFullYear() > lastYear) throw new RangeError('Report range must be within 2020–2030.');

  const dates = [];
  if (detail === 'day') {
    for (let time = from.getTime(); time <= to.getTime(); time += 86400000) dates.push(new Date(time));
  } else if (detail === 'month') {
    for (let year = from.getUTCFullYear(), month = from.getUTCMonth(); year < to.getUTCFullYear() || year === to.getUTCFullYear() && month <= to.getUTCMonth(); month++) {
      if (month === 12) { year++; month = 0; }
      dates.push(new Date(Date.UTC(year, month, 1)));
    }
  } else {
    for (let year = from.getUTCFullYear(); year <= to.getUTCFullYear(); year++) {
      const lastIncludedMonth = year === to.getUTCFullYear() ? to.getUTCMonth() : 11;
      dates.push(new Date(Date.UTC(year, lastIncludedMonth, 1)));
    }
  }

  const labels = dates.map(date => detail === 'year' ? String(date.getUTCFullYear())
    : new Intl.DateTimeFormat('en-US', { month: 'short', ...(detail === 'day' ? { day: 'numeric' } : { year: '2-digit' }), timeZone: 'UTC' }).format(date));
  return {
    root: projectNode(root, dates, detail),
    labels,
    generated: detail === 'day' || dates.some(date => monthIndex(date) < 0 || monthIndex(date) >= 12),
  };
}
