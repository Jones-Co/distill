# Interview Bot Framework

This document describes the methodology and prompts for the interview bot — the component that turns a basic knowledge base into a rich, authentic one by conducting structured conversations with the knowledge base owner.

## Recommended AI Model

**Use Claude (Anthropic) for the interview bot and knowledge base generation.** Claude is significantly more reliable at producing consistent, well-formatted JSONL output and following complex schema instructions. In real-world testing, ChatGPT frequently outputs incorrect JSONL formats despite detailed instructions, requiring post-processing through another LLM to correct entries. Claude handles the structured output correctly the first time.

For the deployed chatbot that serves responses to visitors, OpenAI's GPT-3.5-turbo or GPT-4o is recommended — it's cost-effective for high-volume retrieval-augmented responses where the knowledge base does the heavy lifting. See the backend template's `ai-integration.js` for provider configuration.

## Why an Interview Bot?

Documents capture what you've done. Interviews capture *why* you did it, *how* you thought about it, and *what you learned*. The gap between a resume and a real conversation is enormous — that's exactly the gap this bot fills.

A document parser might produce entries like:
> "Jane led a migration of 50 services to Kubernetes."

After an interview, you get entries like:
> "The Kubernetes migration started as a cost-reduction initiative but turned into a platform modernization effort. The hardest part wasn't the technical migration — it was getting 8 teams to agree on a shared deployment pipeline. Jane solved this by building a prototype with one willing team, then letting the results speak for themselves. Within 3 months, every team had adopted it voluntarily."

That second version is what makes a chatbot sound like it actually knows the person.

## Interview Process Overview

The interview runs in three phases:

### Phase 1: Document Review
Before the interview starts, the bot reads all existing RAG entries (produced by the document parser). This gives it context about what's already known and, more importantly, where the gaps are.

### Phase 2: Structured Interview
The bot conducts a conversation organized around domains — career history, specific projects, skills, services, values. Within each domain, it follows a depth pattern: start with overview questions, then drill into specifics based on the answers.

### Phase 3: Entry Generation
After the interview (or after each section), the bot produces new JSONL entries — primarily narratives and qa_pairs — that capture the tacit knowledge surfaced during conversation.

## System Prompt

The following is the core system prompt for the interview bot. Customize the `[BRACKETED]` sections for your use case.

```
You are an interview bot conducting a structured knowledge-building conversation. Your purpose is to extract the tacit knowledge, stories, decision-making processes, and context that documents alone can't capture.

You are interviewing [PERSON_NAME] to build a comprehensive knowledge base about their [DOMAIN: career/expertise/projects/business].

EXISTING KNOWLEDGE:
The following entries have already been extracted from documents. Use these as your starting point — don't re-ask about information you already have. Instead, dig deeper into the stories and reasoning behind these facts.

---
[EXISTING_RAG_ENTRIES]
---

YOUR INTERVIEW APPROACH:

1. CONVERSATIONAL, NOT INTERROGATIVE
   - This should feel like a conversation with a thoughtful colleague, not a job interview
   - Follow up on interesting threads — if something sounds like there's a story behind it, ask
   - Use what you already know to ask informed questions ("I see you worked on X — what led to that decision?")

2. DEPTH OVER BREADTH
   - Don't try to cover everything in one session
   - When you find something rich, stay with it
   - A single well-explored story produces 5-10 high-quality entries
   - It's better to deeply explore 3 topics than superficially cover 10

3. WHAT TO LISTEN FOR
   - Decision moments: "We had to choose between..." → Ask what drove the choice
   - Challenges: "That was really hard because..." → Ask what they tried, what worked
   - Metrics and results: "We improved X by Y" → Ask what the baseline was, how they measured
   - Turning points: "That's when I realized..." → Ask what changed after that realization
   - Relationships: "My team/manager/client..." → Ask how they worked together, what they learned

4. QUESTION PATTERNS

   For career stories:
   - "What's the story behind how you got into [X]?"
   - "Walk me through what happened when [event from resume]"
   - "What did you learn from that experience that you still use today?"

   For projects:
   - "What problem were you actually trying to solve?"
   - "What was the hardest part that wouldn't be obvious from the outside?"
   - "If you were explaining this to someone technical, what would you want them to understand about the architecture decisions?"
   - "What would you do differently if you did it again?"

   For skills and expertise:
   - "How would you explain your approach to [skill] to someone who does it differently?"
   - "Can you give me a specific example where [skill] made a real difference?"
   - "What's a common mistake you see others make in this area?"

   For values and motivation:
   - "What drives your approach to [topic]?"
   - "Why does [thing] matter to you?"
   - "How did you develop that perspective?"

5. SESSION MANAGEMENT
   - Start each session by briefly reviewing what you know and identifying gaps
   - Focus each session on 2-3 related topics
   - At natural breaks, summarize what you've learned and confirm accuracy
   - End each session by noting what topics remain for future sessions

6. ENTRY GENERATION
   After the interview (or after each major topic), generate JSONL entries that capture:
   - Narratives: The stories, with enough context to be self-contained
   - QA Pairs: Natural questions a visitor might ask, with authentic answers
   - Facts: Any new verifiable claims surfaced during conversation
   - Technical: Architecture or implementation details discussed

   Format entries according to the schema specification (see docs/SCHEMA.md).
   Set confidence to "verified" (the person told you directly).
   Set source to the interview session identifier.

   CRITICAL: Every entry must be self-contained. A reader should understand the full context from a single entry without needing to read others.

OUTPUT FORMAT:
After each interview section, output the new entries as valid JSONL — one JSON object per line, ready to append to the knowledge base file.
```

## Interview Domains

These are the recommended topic areas to cover. Not every domain applies to every person — skip what's not relevant, and add domains specific to the interviewee's situation.

### Domain 1: Origin & Background
**Goal:** Capture the person's path — how they got to where they are, what drives them.
- How they entered their field
- Key turning points in their career
- What motivates their work
- The through-line that connects their experiences

### Domain 2: Career History (Deep Dive)
**Goal:** Turn resume bullet points into rich stories.
- For each significant role: What was the situation when you arrived? What did you actually do? What was the result?
- Key decisions and their reasoning
- Challenges faced and how they were overcome
- Relationships and collaborations that mattered
- What they learned that they carry forward

### Domain 3: Projects & Technical Work
**Goal:** Capture architecture decisions, technical tradeoffs, and implementation stories.
- What problem each project solves and why it matters
- Technology choices and their rationale
- Architecture decisions and tradeoffs
- Performance characteristics (honest assessment)
- What worked well, what didn't
- Lessons learned

### Domain 4: Skills & Methodology
**Goal:** Document how they think and work, not just what they know.
- Their approach to problem-solving
- Methodologies they've developed or adapted
- Tools and frameworks they rely on
- How they lead teams or collaborate
- What they think they're uniquely good at

### Domain 5: Services & Offerings (for consultants/freelancers)
**Goal:** Capture what they offer, who they serve, and how they deliver value.
- Service tiers and what each includes
- Ideal client profile (and who they're NOT a fit for)
- How engagements typically unfold
- Results they've delivered
- Their pricing philosophy

### Domain 6: Values & Vision
**Goal:** Capture what the person cares about beyond the work itself.
- What they're building toward
- What they believe about their field
- How they want to contribute
- What they'd want someone to know about them

## Running an Interview Session

### Preparation
1. Run the document parser first to create the initial knowledge base
2. Load all existing entries into the interview bot's context
3. Identify the 2-3 domains you want to cover in this session

### During the Interview
- Let the conversation flow naturally — the domain structure is a guide, not a script
- When you hear something that sounds like a good narrative entry, note it
- Don't interrupt stories to ask clarifying questions — wait for natural pauses
- If the person gives a short answer, try: "Can you walk me through that?" or "What's the story behind that?"

### After the Interview
1. Generate JSONL entries from the conversation
2. Review entries for self-containment (can each one stand alone?)
3. Validate entries against the schema
4. Append to the knowledge base file
5. Note topics that need follow-up in a future session

## Multi-Session Strategy

For a comprehensive knowledge base, plan 3-5 interview sessions:

**Session 1: Overview & Origin** — Background, career arc, what drives them. Produces 15-25 entries (mostly narratives and facts).

**Session 2: Career Deep Dive** — 2-3 most significant roles explored in depth. Produces 15-30 entries (narratives, qa_pairs).

**Session 3: Projects & Technical** — Deep dive into key projects. Produces 10-20 entries per project (technical, narratives).

**Session 4: Skills, Services & Fit** — How they work, what they offer, who they serve. Produces 10-15 entries (qa_pairs, fit_assessments).

**Session 5: Gap Filling** — Review the knowledge base, identify thin areas, conduct targeted follow-ups. Produces 10-20 entries.

After 3-5 sessions, a typical knowledge base grows from 60-80 entries (document parsing only) to 150-200+ entries with significantly richer narrative content.

## Adapting for Different Domains

The framework above is optimized for career/professional knowledge bases, but it adapts to other contexts:

**For a business/product:** Replace career domains with product history, customer stories, market positioning, technical architecture, and roadmap vision.

**For a creative portfolio:** Focus on creative process, inspiration, project stories, client relationships, and artistic philosophy.

**For academic/research:** Cover research questions, methodology, findings, collaborations, teaching philosophy, and field perspectives.

**For a personal brand/thought leader:** Emphasize ideas, frameworks, publications, speaking topics, and the evolution of their thinking.

The core principle stays the same: documents tell you *what*, interviews tell you *why* and *how*.
