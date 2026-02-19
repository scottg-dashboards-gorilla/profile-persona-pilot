import { Question } from "@/types/assessment";

export const questions: Question[] = [
  // Emotional Openness (Guarded ↔ Transparent)
  { id: "eo-1", dimensionId: "emotional-awareness", text: "When something at work genuinely upsets me, my colleagues can usually tell right away", reverseScored: false },
  { id: "eo-2", dimensionId: "emotional-awareness", text: "I've been told I'm hard to read — people often can't tell what I'm really feeling", reverseScored: true },
  { id: "eo-3", dimensionId: "emotional-awareness", text: "If I'm going through a tough time personally, it affects my energy and engagement at work in ways others can see", reverseScored: false },
  { id: "eo-4", dimensionId: "emotional-awareness", text: "I believe showing vulnerability at work is a sign of strength, not weakness", reverseScored: false },
  { id: "eo-5", dimensionId: "emotional-awareness", text: "I prefer to fully resolve my feelings on my own before talking about them with anyone at work", reverseScored: true },

  // Trust Pattern (Earned ↔ Extended)
  { id: "tr-1", dimensionId: "trust-building", text: "When I join a new team, I assume everyone is competent and well-intentioned until proven otherwise", reverseScored: false },
  { id: "tr-2", dimensionId: "trust-building", text: "I need to see someone deliver several times before I'm comfortable relying on them for something important", reverseScored: true },
  { id: "tr-3", dimensionId: "trust-building", text: "I'd rather delegate a task and risk it being done differently than hover over someone to make sure it's perfect", reverseScored: false },
  { id: "tr-4", dimensionId: "trust-building", text: "When a colleague makes a mistake that affects me, it takes me a while to fully trust their work again", reverseScored: true },
  { id: "tr-5", dimensionId: "trust-building", text: "I'll share sensitive or personal information with a coworker relatively early in the relationship", reverseScored: false },

  // Focus & Attention (Deep Focus ↔ Multi-Tracker)
  { id: "fo-1", dimensionId: "focus-style", text: "I do my best thinking when I can close everything else out and go deep on one thing for hours", reverseScored: true },
  { id: "fo-2", dimensionId: "focus-style", text: "Switching between multiple projects in a single day energizes me rather than drains me", reverseScored: false },
  { id: "fo-3", dimensionId: "focus-style", text: "An unexpected interruption in the middle of focused work can derail my productivity for the rest of the hour", reverseScored: true },
  { id: "fo-4", dimensionId: "focus-style", text: "I naturally keep a mental map of 5+ active projects and can jump between them without losing context", reverseScored: false },
  { id: "fo-5", dimensionId: "focus-style", text: "I produce my highest-quality work when I have large, protected blocks of uninterrupted time", reverseScored: true },

  // Feedback Style (Direct ↔ Contextual/Supportive)
  { id: "fb-1", dimensionId: "feedback-reception", text: "I'd rather someone tell me exactly what I did wrong without softening it — just give it to me straight", reverseScored: true },
  { id: "fb-2", dimensionId: "feedback-reception", text: "When I receive critical feedback, I need time to sit with it before I can respond constructively", reverseScored: false },
  { id: "fb-3", dimensionId: "feedback-reception", text: "I don't need praise before criticism — in fact, the 'compliment sandwich' feels manipulative to me", reverseScored: true },
  { id: "fb-4", dimensionId: "feedback-reception", text: "Harsh feedback, even when accurate, can affect my confidence for days", reverseScored: false },
  { id: "fb-5", dimensionId: "feedback-reception", text: "I appreciate it when someone explains the bigger picture and their intent before giving me tough feedback", reverseScored: false },

  // Conflict Approach (Harmony-Seeking ↔ Direct Engagement)
  { id: "cf-1", dimensionId: "conflict-response", text: "When I disagree with someone in a meeting, I usually speak up immediately rather than waiting", reverseScored: false },
  { id: "cf-2", dimensionId: "conflict-response", text: "I sometimes let small issues slide to avoid tension, even when I know I should address them", reverseScored: true },
  { id: "cf-3", dimensionId: "conflict-response", text: "I believe most teams don't have enough healthy conflict — too many things go unsaid", reverseScored: false },
  { id: "cf-4", dimensionId: "conflict-response", text: "After a heated disagreement at work, I feel drained and anxious, even if it was resolved", reverseScored: true },
  { id: "cf-5", dimensionId: "conflict-response", text: "I'd rather have an uncomfortable conversation now than let resentment build up over weeks", reverseScored: false },

  // Autonomy & Oversight (Guided ↔ Self-Directed)
  { id: "au-1", dimensionId: "autonomy-need", text: "I do my best work when my manager sets the goal and leaves me to figure out how to get there", reverseScored: false },
  { id: "au-2", dimensionId: "autonomy-need", text: "Regular check-ins with my manager help me stay on track and feel confident I'm heading in the right direction", reverseScored: true },
  { id: "au-3", dimensionId: "autonomy-need", text: "When someone closely monitors my progress, it feels more like a lack of trust than support", reverseScored: false },
  { id: "au-4", dimensionId: "autonomy-need", text: "I appreciate when my manager proactively suggests how to approach a problem rather than waiting for me to figure it out", reverseScored: true },
  { id: "au-5", dimensionId: "autonomy-need", text: "I've turned down or left roles because there was too much oversight and not enough freedom", reverseScored: false },

  // Stress Processing (Internalizer ↔ Mobilizer)
  { id: "sp-1", dimensionId: "stress-response", text: "When I'm overwhelmed, I tend to go quiet and withdraw rather than talk about it", reverseScored: true },
  { id: "sp-2", dimensionId: "stress-response", text: "High-pressure deadlines bring out a focused intensity in me that I actually enjoy", reverseScored: false },
  { id: "sp-3", dimensionId: "stress-response", text: "When I'm stressed, I need time completely alone before I can think clearly again", reverseScored: true },
  { id: "sp-4", dimensionId: "stress-response", text: "Under pressure, I naturally start organizing people and tasks — stress makes me more action-oriented", reverseScored: false },
  { id: "sp-5", dimensionId: "stress-response", text: "I've had moments where I didn't realize how stressed I was until I hit a breaking point", reverseScored: true },

  // Organizational Belonging (Role-Centered ↔ Culture-Centered)
  { id: "bl-1", dimensionId: "belonging", text: "I could do the same role at a company with completely different values and still feel satisfied, as long as the work is good", reverseScored: true },
  { id: "bl-2", dimensionId: "belonging", text: "Feeling like I belong to a team and community matters more to me than the specific tasks I'm doing", reverseScored: false },
  { id: "bl-3", dimensionId: "belonging", text: "I've stayed at a job longer than I should have because I loved the people and the culture", reverseScored: false },
  { id: "bl-4", dimensionId: "belonging", text: "If the work stopped being intellectually stimulating, no amount of culture or perks would keep me engaged", reverseScored: true },
  { id: "bl-5", dimensionId: "belonging", text: "I need to feel that my company's mission aligns with my personal values to do my best work", reverseScored: false },
];
