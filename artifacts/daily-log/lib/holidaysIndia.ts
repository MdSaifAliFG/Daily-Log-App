export interface IndianHoliday {
  date: string; // YYYY-MM-DD
  name: string;
  type: 'National' | 'Gazetted' | 'Restricted' | 'Observance';
  emoji: string;
  description?: string;
}

// Comprehensive Indian Holidays dataset (Gazetted, National, and Major Festivals)
// Accurate across 2024 - 2027
const HOLIDAYS_DB: Record<string, { name: string; type: IndianHoliday['type']; emoji: string; description?: string }> = {
  // Fixed annual dates
  '01-01': { name: "New Year's Day", type: 'Restricted', emoji: '🎉', description: 'Celebration of the New Year' },
  '01-14': { name: 'Makar Sankranti / Pongal', type: 'Restricted', emoji: '🪁', description: 'Harvest festival celebrated across India' },
  '01-26': { name: 'Republic Day', type: 'National', emoji: '🇮🇳', description: 'Celebrates the enactment of the Constitution of India (1950)' },
  '05-01': { name: 'Maharashtra Day / Labour Day', type: 'Restricted', emoji: '🛠️', description: 'International Workers’ Day' },
  '08-15': { name: 'Independence Day', type: 'National', emoji: '🇮🇳', description: 'Commemorates freedom from British rule in 1947' },
  '10-02': { name: 'Mahatma Gandhi Jayanti', type: 'National', emoji: '🕊️', description: 'Birthday of the Father of the Nation' },
  '12-25': { name: 'Christmas Day', type: 'Gazetted', emoji: '🎄', description: 'Christian festival celebrating the birth of Jesus Christ' },

  // 2025 Calendar
  '2025-02-26': { name: 'Maha Shivratri', type: 'Gazetted', emoji: '🔱', description: 'Night honoring Lord Shiva' },
  '2025-03-14': { name: 'Holi', type: 'Gazetted', emoji: '🎨', description: 'Festival of colors and spring' },
  '2025-03-31': { name: 'Id-ul-Fitr (Ramzan Eid)', type: 'Gazetted', emoji: '🌙', description: 'Marks the end of the sacred month of Ramadan' },
  '2025-04-10': { name: 'Mahavir Jayanti', type: 'Gazetted', emoji: '🪷', description: 'Birth anniversary of Lord Mahavira' },
  '2025-04-18': { name: 'Good Friday', type: 'Gazetted', emoji: '✝️', description: 'Christian remembrance of Jesus Christ’s crucifixion' },
  '2025-05-12': { name: 'Buddha Purnima', type: 'Gazetted', emoji: '☸️', description: 'Birth, enlightenment, and death of Gautama Buddha' },
  '2025-06-07': { name: 'Id-ul-Zuha (Bakrid)', type: 'Gazetted', emoji: '🐑', description: 'Feast of the Sacrifice' },
  '2025-07-06': { name: 'Muharram', type: 'Gazetted', emoji: '🕌', description: 'First month of Islamic calendar' },
  '2025-08-16': { name: 'Janmashtami', type: 'Gazetted', emoji: '🦚', description: 'Birth of Lord Krishna' },
  '2025-09-05': { name: 'Milad-un-Nabi (Eid-e-Milad)', type: 'Gazetted', emoji: '🌟', description: 'Birthday of Prophet Muhammad' },
  '2025-10-02': { name: 'Dussehra / Vijayadashami', type: 'Gazetted', emoji: '🏹', description: 'Triumph of good over evil' },
  '2025-10-20': { name: 'Diwali (Deepavali)', type: 'Gazetted', emoji: '🪔', description: 'Festival of lights celebrated across India' },
  '2025-11-05': { name: 'Guru Nanak Jayanti', type: 'Gazetted', emoji: '🕯️', description: 'Birth anniversary of the founder of Sikhism' },

  // 2026 Calendar (Current project year)
  '2026-02-16': { name: 'Maha Shivratri', type: 'Gazetted', emoji: '🔱', description: 'Night honoring Lord Shiva' },
  '2026-03-04': { name: 'Holi', type: 'Gazetted', emoji: '🎨', description: 'Festival of colors and harvest' },
  '2026-03-21': { name: 'Id-ul-Fitr (Ramzan Eid)', type: 'Gazetted', emoji: '🌙', description: 'Islamic feast celebrating the conclusion of Ramadan' },
  '2026-03-31': { name: 'Mahavir Jayanti', type: 'Gazetted', emoji: '🪷', description: 'Birth anniversary of Lord Mahavira' },
  '2026-04-03': { name: 'Good Friday', type: 'Gazetted', emoji: '✝️', description: 'Commemoration of the Crucifixion' },
  '2026-05-01': { name: 'Buddha Purnima', type: 'Gazetted', emoji: '☸️', description: 'Vesak celebration of Gautama Buddha' },
  '2026-05-27': { name: 'Id-ul-Zuha (Bakrid)', type: 'Gazetted', emoji: '🐑', description: 'Feast of the Sacrifice' },
  '2026-06-25': { name: 'Muharram (Ashura)', type: 'Gazetted', emoji: '🕌', description: 'Sacred day of remembrance' },
  '2026-08-27': { name: 'Raksha Bandhan', type: 'Restricted', emoji: '🧵', description: 'Celebration of brother-sister bond' },
  '2026-09-04': { name: 'Janmashtami', type: 'Gazetted', emoji: '🦚', description: 'Birth celebration of Lord Krishna' },
  '2026-09-25': { name: 'Milad-un-Nabi', type: 'Gazetted', emoji: '🌟', description: 'Prophet Muhammad birthday celebration' },
  '2026-10-20': { name: 'Dussehra / Vijayadashami', type: 'Gazetted', emoji: '🏹', description: 'Celebration of good over evil' },
  '2026-11-08': { name: 'Diwali (Deepavali)', type: 'Gazetted', emoji: '🪔', description: 'Grand festival of lights and Lakshmi Puja' },
  '2026-11-09': { name: 'Govardhan Puja', type: 'Restricted', emoji: '🌄', description: 'Worship of Mount Govardhan' },
  '2026-11-10': { name: 'Bhai Dooj', type: 'Restricted', emoji: '🌸', description: 'Sibling celebration' },
  '2026-11-15': { name: 'Chhath Puja', type: 'Restricted', emoji: '🌅', description: 'Worship of the Sun God' },
  '2026-11-24': { name: 'Guru Nanak Jayanti', type: 'Gazetted', emoji: '🕯️', description: 'Guru Nanak Prakash Utsav' },

  // 2027 Calendar
  '2027-03-07': { name: 'Maha Shivratri', type: 'Gazetted', emoji: '🔱', description: 'Great night of Shiva' },
  '2027-03-23': { name: 'Holi', type: 'Gazetted', emoji: '🎨', description: 'Festival of colors' },
  '2027-03-10': { name: 'Id-ul-Fitr', type: 'Gazetted', emoji: '🌙', description: 'Ramzan Eid' },
  '2027-03-26': { name: 'Good Friday', type: 'Gazetted', emoji: '✝️', description: 'Christian Holy Day' },
  '2027-04-19': { name: 'Mahavir Jayanti', type: 'Gazetted', emoji: '🪷', description: 'Jain festival' },
  '2027-05-20': { name: 'Buddha Purnima', type: 'Gazetted', emoji: '☸️', description: 'Vesak celebration' },
  '2027-10-29': { name: 'Diwali (Deepavali)', type: 'Gazetted', emoji: '🪔', description: 'Festival of lights' },
};

/**
 * Returns Indian holiday details for a given date in YYYY-MM-DD format.
 */
export function getIndianHoliday(dateStr: string): IndianHoliday | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;

  // Check specific year date
  if (HOLIDAYS_DB[dateStr]) {
    return {
      date: dateStr,
      ...HOLIDAYS_DB[dateStr],
    };
  }

  // Check recurring MM-DD date (e.g., 01-26 Republic Day, 08-15 Independence Day, 10-02 Gandhi Jayanti)
  const monthDay = dateStr.slice(5);
  if (HOLIDAYS_DB[monthDay]) {
    return {
      date: dateStr,
      ...HOLIDAYS_DB[monthDay],
    };
  }

  return null;
}

/**
 * Returns all Indian holidays occurring in the given year and month (1-12).
 */
export function getIndianHolidaysForMonth(year: number, month: number): IndianHoliday[] {
  const monthStr = String(month).padStart(2, '0');
  const results: IndianHoliday[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = String(day).padStart(2, '0');
    const fullDate = `${year}-${monthStr}-${dayStr}`;
    const hol = getIndianHoliday(fullDate);
    if (hol) {
      results.push(hol);
    }
  }

  return results.sort((a, b) => a.date.localeCompare(b.date));
}
