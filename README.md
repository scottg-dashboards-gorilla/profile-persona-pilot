# Datapath Performance Management

Create a React app called "Workplace Personality Profile" for onboarding new employees. It's a personality assessment with 40 Likert-scale questions (Strongly Disagree to Strongly Agree) across 8 dimensions. The dimensions are: Decision-Making Style (Analytical ↔ Intuitive), Leadership Approach (Directive ↔ Collaborative), Change Adaptability (Stabilizer ↔ Pioneer), Drive & Motivation (Purpose-Driven ↔ Achievement-Driven), Communication Style (Reflective ↔ Expressive), Work Structure (Structured ↔ Flexible), Values Orientation (Individual Excellence ↔ Collective Success), and Resilience Pattern (Processor ↔ Charger). Each dimension has 5 questions. Some questions are reverse-scored. Store all question data, dimension metadata, and user answers in state. Don't build the UI yet beyond a placeholder — just set up the data model, types, and scoring logic. Scores should normalize to 0-100 per dimension where 0 = fully "low" end and 100 = fully "high" end.



Now populate the question bank with these 40 questions. For Decision-Making: (1) "I prefer to analyze all available data before making an important decision" [reverse], (2) "I often make good decisions based on gut feeling, even without complete information", (3) "I feel uncomfortable committing to a course of action without thorough research" [reverse], (4) "When faced with ambiguity, I trust my experience and instincts to guide me", (5) "I would rather take more time to decide correctly than decide quickly and risk being wrong" [reverse]. For Leadership: (1) "I believe the best outcomes come from getting everyone's input before moving forward", (2) "When a team needs direction, I'm comfortable stepping up and making the call" [reverse], (3) "I prefer to distribute authority rather than centralize decision-making", (4) "A clear chain of command helps teams execute more effectively" [reverse], (5) "I get the best work from people by giving them ownership rather than detailed instructions". For Change: (1) "I get excited when our team tries something that's never been done before", (2) "I'd rather improve an existing process than start from scratch with a new one" [reverse], (3) "Frequent changes in priorities energize me rather than frustrate me", (4) "I believe proven methods should be the foundation before introducing innovations" [reverse], (5) "I often volunteer for projects that involve exploring uncharted territory". For Drive: (1) "Hitting ambitious targets gives me more satisfaction than anything else at work", (2) "I need to feel that my work contributes to something larger than quarterly results" [reverse], (3) "I'm energized by competition and measuring myself against clear benchmarks", (4) "The mission and values of an organization matter more to me than compensation or rank" [reverse], (5) "I'd choose a role with bigger challenges and visible metrics over one with deeper purpose but vague outcomes". For Communication: (1) "I tend to think out loud and share ideas as they come to me", (2) "I prefer to fully formulate my thoughts before speaking up in a meeting" [reverse], (3) "People describe me as energetic and open in conversations", (4) "I communicate better in writing, where I can carefully choose my words" [reverse], (5) "In brainstorming sessions, I'm usually one of the first to share an idea". For Structure: (1) "I work best when I can set my own schedule and approach tasks in my own way", (2) "I find detailed project plans and checklists help me do my best work" [reverse], (3) "Too many rules and processes slow me down more than they help", (4) "I like knowing exactly what's expected of me and when things are due" [reverse], (5) "I thrive in environments where I can pivot quickly without formal approval". For Values: (1) "I'd rather be recognized for a team accomplishment than an individual one", (2) "I take pride in being the go-to expert in my area of specialization" [reverse], (3) "Building strong relationships at work is as important to me as delivering results", (4) "I set personal performance standards that are often higher than what's required" [reverse], (5) "I measure a good day at work by how well the team performed, not just my own output". For Resilience: (1) "When I'm under pressure, I feel a surge of energy and focus that improves my work", (2) "After a stressful period, I need quiet time alone to recharge before I'm effective again" [reverse], (3) "Tight deadlines bring out my best performance", (4) "I process setbacks internally and need space before I can discuss them productively" [reverse], (5) "I tend to work harder and faster when the stakes are high".

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://profile-persona-pilot.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a8d10725-2e5a-47ec-9cac-cf6b39306c54).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
