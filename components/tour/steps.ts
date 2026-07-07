import type { TourStep } from "@/components/tour/Tour";

// Per-role first-run tours. Each `target` matches a data-tour="<target>" on a
// real element; steps whose target isn't on screen are skipped automatically,
// so these are safe on empty dashboards and across mobile/desktop.

export const studentTour: TourStep[] = [
  { target: "hero", title: "Welcome to your portal 👋", body: "This is your learning home. Here's a 20-second tour of what's here." },
  { target: "stats", title: "Everything at a glance", body: "Your classes, pending tasks, average score, attendance, reward points and messages — always up to date." },
  { target: "classes", title: "Jump into class", body: "Your next live sessions show up here. When it's time, just tap Join." },
  { target: "refer", title: "Bring a friend 🎁", body: "Share your personal link — when a friend enrols through it, you get the credit." },
  { target: "rate", title: "Tell us how we're doing", body: "Drop a quick star rating any time. It goes straight to the team." },
  { target: "bell", title: "Never miss a thing", body: "New grades, messages and announcements land here — and on your phone if you turn on notifications." },
  { target: "tabs", title: "Get around fast", body: "Use the bottom bar to hop between Home, Classes, Assignments and more." },
];

export const adminTour: TourStep[] = [
  { target: "hero", title: "Welcome back 👋", body: "Your command centre. Here's a quick tour of where everything lives." },
  { target: "pending", title: "Approve new students", body: "Enrolments waiting for review show up here — tap to check the payment and approve." },
  { target: "stats", title: "Your key numbers", body: "Students, pending applications, upcoming classes and assignments — each tile opens its full page." },
  { target: "quick", title: "One-tap actions", body: "Shortcuts to review applications, schedule a class, post an assignment or make an announcement." },
  { target: "search", title: "Find anyone instantly", body: "Search any student by name or ID from anywhere in the admin area." },
  { target: "bell", title: "Stay in the loop", body: "New payments, messages and applications alert you here and on your device." },
];

export const parentTour: TourStep[] = [
  { target: "hero", title: "Welcome 👋", body: "A simple, read-only window into how your child is doing. Here's what to look for." },
  { target: "rings", title: "Grades & attendance", body: "These two rings show your child's average score and attendance at a glance." },
  { target: "behaviour", title: "Behaviour & rewards", body: "Rewards and sanctions logged by tutors appear here, newest first." },
  { target: "grades", title: "Latest grades", body: "Recent graded assignments and scores, so you can follow along and celebrate wins." },
];

export const assignmentsTour: TourStep[] = [
  { target: "assignments-intro", title: "Your assignments 📚", body: "Everything your tutor sets — homework, links and CBT tests — lives on this page." },
  { target: "assignments-filters", title: "Filter your list", body: "Switch between To do, Submitted and Graded to focus on what matters right now." },
  { target: "assignments-submit", title: "Hand in your work", body: "Snap a photo or paste a link, then tap submit — your tutor sees it instantly for grading." },
];

export const paymentsTour: TourStep[] = [
  { target: "payments-summary", title: "Money at a glance 💳", body: "Total received, this month's income, and how many successful payments — updated automatically from verified Paystack charges." },
  { target: "payments-search", title: "Find any transaction", body: "Search by reference, email or package to track down a specific payment fast." },
  { target: "payments-export", title: "Export for your records", body: "Download the current list as a CSV for your bookkeeping any time." },
];
