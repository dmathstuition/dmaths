// Achievements — a "trophy room" of milestones computed from a learner's stats.
// Pure so the unlock rules are unit-testable; the profile page gathers the stats
// and renders the result.

export type AchievementStat = {
  streak: number;     // current consecutive-day streak
  points: number;     // lifetime reward points earned
  avgScore: number;   // 0..100
  titles: number;     // owned premium titles
  referrals: number;  // friends referred
  mocks: number;      // mock exams sat
  practice: number;   // practice rounds sat
  cards: number;      // flashcard reviews done
};

export type AchievementDef = {
  id: string;
  name: string;
  desc: string;      // what it takes (shown locked)
  icon: string;
  target: number;    // threshold on `metric`
  metric: keyof AchievementStat;
  reward: number;    // one-time reward points for unlocking it
};

export type Achievement = AchievementDef & { current: number; unlocked: boolean };

// Ordered roughly easy → prestigious. `reward` is the one-time bonus paid when
// the achievement is claimed — bigger for the harder milestones.
export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_points", name: "First Steps",     desc: "Earn your first reward point", icon: "star",          target: 1,    metric: "points",    reward: 10 },
  { id: "points_100",   name: "Century",         desc: "Earn 100 reward points",       icon: "coins",         target: 100,  metric: "points",    reward: 25 },
  { id: "points_500",   name: "High Roller",     desc: "Earn 500 reward points",       icon: "gem",           target: 500,  metric: "points",    reward: 50 },
  { id: "points_1000",  name: "Legend",          desc: "Earn 1,000 reward points",     icon: "crown",         target: 1000, metric: "points",    reward: 100 },
  { id: "streak_3",     name: "On a Roll",       desc: "Reach a 3-day streak",         icon: "flame",         target: 3,    metric: "streak",    reward: 15 },
  { id: "streak_7",     name: "Week Warrior",    desc: "Reach a 7-day streak",         icon: "flame",         target: 7,    metric: "streak",    reward: 30 },
  { id: "streak_30",    name: "Unstoppable",     desc: "Reach a 30-day streak",        icon: "flame",         target: 30,   metric: "streak",    reward: 75 },
  { id: "scholar_70",   name: "Scholar",         desc: "Hold a 70%+ average",          icon: "graduationCap", target: 70,   metric: "avgScore",  reward: 40 },
  { id: "ace_85",       name: "Ace",             desc: "Hold an 85%+ average",         icon: "award",         target: 85,   metric: "avgScore",  reward: 60 },
  { id: "practice_10",  name: "Grinder",         desc: "Sit 10 practice rounds",       icon: "target",        target: 10,   metric: "practice",  reward: 25 },
  { id: "mock_1",       name: "Exam Ready",      desc: "Sit a mock exam",              icon: "graduationCap", target: 1,    metric: "mocks",     reward: 20 },
  { id: "cards_50",     name: "Memory Master",   desc: "Review 50 revision cards",     icon: "book",          target: 50,   metric: "cards",     reward: 30 },
  { id: "collector_3",  name: "Collector",       desc: "Own 3 titles",                 icon: "sparkles",      target: 3,    metric: "titles",    reward: 30 },
  { id: "ambassador",   name: "Ambassador",      desc: "Refer a friend who joins",     icon: "gift",          target: 1,    metric: "referrals", reward: 50 },
];

export function achievementById(id: string): AchievementDef | null {
  return ACHIEVEMENTS.find((a) => a.id === id) ?? null;
}

export function computeAchievements(stat: AchievementStat): Achievement[] {
  return ACHIEVEMENTS.map((a) => {
    const current = Math.max(0, Number(stat[a.metric]) || 0);
    return { ...a, current: Math.min(current, a.target), unlocked: current >= a.target };
  });
}

export function unlockedCount(list: Achievement[]): number {
  return list.filter((a) => a.unlocked).length;
}
