// Reward-points shop maths. Kept pure so it's shared by the redeem API and the
// portal page (identical balance rules) and easy to test.
//
// profiles.reward_points stays the TOTAL EARNED (it drives the leaderboard and
// never drops). The *spendable* balance is that total minus points already
// committed to redemptions that weren't rejected.

// Referral bounty — credited to reward_points (the leaderboard total) when a
// referred applicant is approved. Both sides win: the referrer earns the bigger
// bounty for bringing someone in, the newcomer gets a welcome head-start. These
// are legitimate earns, so they raise the leaderboard total (unlike a purchase).
export const REFERRAL_REWARD = 100;   // → the referring student
export const REFERRAL_WELCOME = 50;   // → the newly-approved learner

export type RedemptionLike = { cost: number | null | undefined; status: string | null | undefined };

export function spentPoints(redemptions: RedemptionLike[]): number {
  return (redemptions ?? []).reduce(
    (a, r) => a + (r?.status === "rejected" ? 0 : Number(r?.cost || 0)),
    0,
  );
}

export function spendable(rewardPoints: number | null | undefined, redemptions: RedemptionLike[]): number {
  return Math.max(0, Number(rewardPoints || 0) - spentPoints(redemptions));
}
