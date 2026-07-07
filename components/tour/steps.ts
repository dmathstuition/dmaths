import type { TourStep } from "@/components/tour/Tour";

// Per-role first-run tours. Each `target` matches a data-tour="<target>" on a
// real element; steps whose target isn't on screen are skipped automatically,
// so these are safe on empty dashboards and across mobile/desktop.

export const studentTour: TourStep[] = [
  { target: "hero", title: "Welcome to your portal 👋", body: "This is your learning home. Here's a quick tour of the essentials — it takes 20 seconds." },
  { target: "stats", title: "Your progress at a glance", body: "Upcoming classes, pending tasks, average score, attendance, reward points and messages — all live." },
  { target: "classes", title: "Join classes here", body: "Your next live sessions appear here. Tap Join when it's time." },
  { target: "refer", title: "Refer a friend 🎁", body: "Share your personal link — when a friend enrols, it's credited to you." },
  { target: "rate", title: "Tell us how we're doing", body: "Leave a quick star rating any time. Your feedback goes straight to the team." },
  { target: "bell", title: "Notifications", body: "New grades, messages and announcements show up here — and on your device if you enable push." },
  { target: "tabs", title: "Get around fast", body: "Use the bottom bar to jump between Home, Classes, Assignments and more." },
];

export const adminTour: TourStep[] = [
  { target: "hero", title: "Welcome back 👋", body: "Your admin command centre. Here's a 20-second tour of the key areas." },
  { target: "pending", title: "Applications to review", body: "New enrolments waiting for approval surface right here — tap to review them." },
  { target: "stats", title: "Live totals", body: "Students, pending applications, upcoming classes and assignments — each links straight to its page." },
  { target: "quick", title: "Quick actions", body: "One-tap shortcuts to review applications, schedule a class, post an assignment or make an announcement." },
  { target: "search", title: "Find anyone fast", body: "Search students by name or ID from anywhere in the admin area." },
  { target: "bell", title: "Stay in the loop", body: "New payments, messages and applications alert you here and on your device." },
];

export const parentTour: TourStep[] = [
  { target: "hero", title: "Welcome to the parent portal 👋", body: "A read-only window into your child's progress. Here's what to look for." },
  { target: "rings", title: "Grades & attendance", body: "These rings show your child's average score and attendance at a glance." },
  { target: "behaviour", title: "Recent behaviour", body: "Rewards and sanctions logged by tutors appear here, most recent first." },
  { target: "grades", title: "Recent grades", body: "The latest graded assignments and scores, so you can follow along." },
];
