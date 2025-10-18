
// Intervals in milliseconds
export const EBBINGHAUS_INTERVALS: number[] = [
  5 * 60 * 1000,        // Level 1: 5 minutes
  30 * 60 * 1000,       // Level 2: 30 minutes
  12 * 60 * 60 * 1000,  // Level 3: 12 hours
  24 * 60 * 60 * 1000,  // Level 4: 1 day
  2 * 24 * 60 * 60 * 1000, // Level 5: 2 days
  4 * 24 * 60 * 60 * 1000, // Level 6: 4 days
  7 * 24 * 60 * 60 * 1000, // Level 7: 7 days
  15 * 24 * 60 * 60 * 1000, // Level 8: 15 days
  30 * 24 * 60 * 60 * 1000, // Level 9: 30 days
  90 * 24 * 60 * 60 * 1000, // Level 10: 90 days - Considered Mastered
];
