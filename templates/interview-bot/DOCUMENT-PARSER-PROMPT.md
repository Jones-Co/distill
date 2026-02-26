# Document Parser Prompt Template

This prompt is designed to be used with any LLM (ChatGPT, Claude, etc.) to parse source documents into JSONL knowledge base entries. It's the first stage of the pipeline — before the interview bot runs.

## Usage

1. Copy the prompt below
2. Replace `[BRACKETED]` sections with your information
3. Paste your source documents after the prompt (or attach them)
4. The LLM will output JSONL entries you can save directly to your knowledge base file

## The Prompt

```
I need you to parse the following documents and extract structured knowledge base entries in JSONL format. Each entry should capture one discrete piece of knowledge about [PERSON_NAME].

OUTPUT FORMAT:
Output ONLY valid JSONL — one JSON object per line, no commentary, no markdown formatting, no code fences. Each line must be a complete, valid JSON object that could be appended directly to a .jsonl file.

ENTRY SCHEMA:
Every entry MUST have these fields:
- id: "rag-[TODAY'S DATE AS YYYY-MM-DD]-###" (sequential, starting at 001)
- type: one of "fact", "narrative", "qa_pair", "technical", "fit_assessment"
- topic: snake_case category (career_history, skills, services, achievements, about, project_[name], etc.)
- confidence: "verified" (directly stated in document) or "inferred" (logical conclusion)
- source: filename or description of the source document
- tags: array of snake_case keywords, include confidence level as a tag

TYPE-SPECIFIC FIELDS:
- fact: requires "content" (one verifiable claim, 1-2 sentences)
- narrative: requires "content" and "title" (a story or contextual explanation, 50-200 words)
- qa_pair: requires "question" and "answer" (natural question + direct answer)
- technical: requires "content" and "title" (specs, architecture, implementation details)
- fit_assessment: requires "fit_type" ("good_fit" or "not_ideal"), "criteria", and "explanation"

Optional field for all types:
- project: PascalCase project name if entry relates to a specific project

EXTRACTION GUIDELINES:

1. FACTS should be atomic — one claim per entry. If a sentence contains two distinct facts, split them.
   Good: "Jane has 15 years of experience in software engineering."
   Bad: "Jane has 15 years of experience in software engineering and specializes in distributed systems." (this is two facts)

2. NARRATIVES should be self-contained — a reader should understand the context without needing other entries. Add enough background that the entry makes sense on its own.

3. QA PAIRS should use natural language — write questions the way a real person would ask them, not how a search engine would phrase them.
   Good: "What's Jane's background in distributed systems?"
   Bad: "distributed systems experience summary"

4. TECHNICAL entries should include specifics — numbers, tools, frameworks, metrics. Vague technical descriptions aren't useful.

5. FIT ASSESSMENTS should be honest — include both good fits and poor fits if the documents contain that information.

6. SELF-CONTAINMENT is critical. The retrieval system may return any combination of entries. Never write entries that depend on other entries for context.

7. COVERAGE: Extract as many entries as the document supports. A typical resume produces 20-40 entries. A detailed project document might produce 10-20. Don't stretch — if the document doesn't contain information for a particular entry type, don't force it.

8. PRIORITIZE verified confidence. Only use "inferred" when you're making a logical conclusion that isn't directly stated in the document.

DOCUMENTS TO PARSE:

[PASTE OR ATTACH YOUR DOCUMENTS HERE]
```

## Tips for Better Results

**Batch by document type.** Parse your resume separately from project docs. This helps the LLM maintain consistent quality and avoids overwhelming its context.

**Review the output.** The parser is good but not perfect. Check for: duplicate information across entries, entries that aren't self-contained, inferred claims that should be verified, missing context that makes an entry confusing.

**Run it multiple times.** Different LLMs emphasize different things. Running the same documents through Claude and ChatGPT often produces complementary entries. Deduplicate afterward.

**Start date-aware.** Use today's date in the ID format. If you parse documents on different days, the IDs will naturally sort chronologically.

## Example Input → Output

**Input document excerpt:**
```
Jane Smith - Senior Staff Engineer at Acme Corp (2019-2024)
- Led migration of 50 microservices from EC2 to Kubernetes
- Reduced infrastructure costs by 40%
- Managed team of 12 engineers across 3 time zones
- Designed event-driven architecture handling 2M events/day
```

**Expected output:**
```
{"id":"rag-2026-02-26-001","type":"fact","topic":"career_history","project":"Career","content":"Jane Smith served as Senior Staff Engineer at Acme Corp from 2019 to 2024.","confidence":"verified","source":"resume_2026.pdf","tags":["acme_corp","career","senior_staff_engineer","verified"]}
{"id":"rag-2026-02-26-002","type":"fact","topic":"career_history","project":"AcmeCorp","content":"Jane led the migration of 50 microservices from EC2 to Kubernetes at Acme Corp.","confidence":"verified","source":"resume_2026.pdf","tags":["acme_corp","kubernetes","migration","verified"]}
{"id":"rag-2026-02-26-003","type":"fact","topic":"achievements","project":"AcmeCorp","content":"Jane's Kubernetes migration at Acme Corp reduced infrastructure costs by 40%.","confidence":"verified","source":"resume_2026.pdf","tags":["acme_corp","achievements","cost_reduction","kubernetes","verified"]}
{"id":"rag-2026-02-26-004","type":"fact","topic":"skills","project":"AcmeCorp","content":"Jane managed a team of 12 engineers distributed across 3 time zones at Acme Corp.","confidence":"verified","source":"resume_2026.pdf","tags":["acme_corp","leadership","remote_teams","verified"]}
{"id":"rag-2026-02-26-005","type":"technical","topic":"project_architecture","project":"AcmeCorp","title":"Event-Driven Architecture at Acme Corp","content":"Jane designed an event-driven architecture at Acme Corp that handles 2 million events per day. The system processes high-volume event streams as part of the company's core platform infrastructure.","confidence":"verified","source":"resume_2026.pdf","tags":["acme_corp","architecture","event_driven","technical","verified"]}
{"id":"rag-2026-02-26-006","type":"qa_pair","topic":"career_history","project":"AcmeCorp","question":"What did Jane do at Acme Corp?","answer":"Jane served as Senior Staff Engineer at Acme Corp from 2019 to 2024, where she led the migration of 50 microservices from EC2 to Kubernetes (reducing infrastructure costs by 40%), managed a distributed team of 12 engineers across 3 time zones, and designed an event-driven architecture handling 2 million events per day.","confidence":"verified","source":"resume_2026.pdf","tags":["acme_corp","career","overview","verified"]}
```

Notice how each entry stands alone, facts are atomic, and the qa_pair provides a comprehensive summary answer.
