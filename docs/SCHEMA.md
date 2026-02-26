# Personal Knowledge RAG — JSONL Schema Specification

**Version:** 1.0.0
**Format:** JSONL (JSON Lines — one valid JSON object per line)
**Encoding:** UTF-8

## Overview

This schema defines the format for a personal knowledge base designed to power an AI chatbot that can answer questions about a person, their work, experience, and expertise. The knowledge base is stored as a `.jsonl` file where each line is a self-contained JSON entry representing one piece of knowledge.

### Why JSONL?

JSONL was chosen for three reasons: cross-AI compatibility (every AI system and programming language can read it), human readability (you can open the file and read individual entries), and simplicity (no database setup, no migrations, just a flat file). It also appends naturally — new entries are added to the end of the file without modifying existing ones.

## Entry Types

The schema supports five entry types, each serving a different purpose in the knowledge base.

### `fact`
Atomic, verifiable statements. These are the building blocks — short, specific, and directly quotable.

```json
{
  "id": "rag-2026-01-27-001",
  "type": "fact",
  "topic": "career_history",
  "project": "Career",
  "content": "Jane has 15 years of experience in software engineering, specializing in distributed systems.",
  "confidence": "verified",
  "source": "resume_2026.pdf",
  "tags": ["career", "experience", "distributed_systems", "verified"]
}
```

### `narrative`
Longer, contextual explanations that tell a story. These give the chatbot material for rich, detailed answers about projects, decisions, and experiences.

```json
{
  "id": "rag-2026-01-27-018",
  "type": "narrative",
  "topic": "project_migration",
  "project": "CloudMigration",
  "title": "How We Migrated 50 Services to Kubernetes",
  "content": "The migration started as a cost-reduction initiative but became a platform modernization effort. Over 8 months, the team migrated 50 microservices from EC2 to Kubernetes, reducing infrastructure costs by 40% while improving deployment frequency from weekly to multiple times per day...",
  "confidence": "verified",
  "source": "technical_interview_session_3",
  "tags": ["kubernetes", "migration", "infrastructure", "narrative", "verified"]
}
```

### `qa_pair`
Pre-formatted question and answer pairs. These are especially powerful because the retrieval engine gives them a scoring bonus when a user's question matches the stored question.

```json
{
  "id": "rag-2026-01-27-009",
  "type": "qa_pair",
  "topic": "services",
  "project": "Consulting",
  "question": "What services does Jane offer?",
  "answer": "Jane offers three consulting tiers: Architecture Review ($5k, 1 week), Implementation Sprint ($15k, 4 weeks), and Ongoing Advisory ($8k/month retainer).",
  "confidence": "verified",
  "source": "services_page.md",
  "tags": ["services", "pricing", "consulting", "verified"]
}
```

### `technical`
Technical specifications, architecture details, and implementation specifics. These have a `title` field for quick identification.

```json
{
  "id": "rag-2026-01-27-014",
  "type": "technical",
  "topic": "project_platform",
  "project": "DataPlatform",
  "title": "Data Pipeline Architecture",
  "content": "The data platform processes 2TB daily using Apache Kafka for ingestion, Spark for transformation, and Delta Lake for storage. The pipeline runs on Kubernetes with auto-scaling based on queue depth...",
  "confidence": "verified",
  "source": "architecture_doc.md",
  "tags": ["architecture", "kafka", "spark", "data_pipeline", "technical", "verified"]
}
```

### `fit_assessment`
Evaluation criteria for determining whether a potential client, employer, or collaborator is a good match. Useful for consultants, freelancers, and job seekers.

```json
{
  "id": "rag-2026-01-27-012",
  "type": "fit_assessment",
  "topic": "fit",
  "project": "Consulting",
  "fit_type": "good_fit",
  "criteria": "Mid-size teams (50-200 people) struggling with delivery predictability",
  "explanation": "Jane's expertise is optimized for teams where process improvements have measurable impact. Her background in distributed systems gives her domain-specific context for engineering organizations.",
  "confidence": "verified",
  "source": "ideal_client_profile.md",
  "tags": ["fit", "good_fit", "icp", "verified"]
}
```

## Field Reference

### Required Fields (all entry types)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier. Format: `rag-YYYY-MM-DD-###` where `###` is a sequential number within that date. |
| `type` | enum | One of: `fact`, `narrative`, `qa_pair`, `technical`, `fit_assessment` |
| `topic` | string | Broad category in `snake_case`. Examples: `career_history`, `skills`, `services`, `about`, `project_name` |
| `confidence` | enum | One of: `verified` (confirmed by the person or source docs), `inferred` (logical conclusion from available info), `approximate` (best estimate) |
| `source` | string | Where this information came from. Document filename, interview session name, or description of source. |
| `tags` | array of strings | Keywords in `snake_case`, alphabetically sorted. Always include the confidence level as a tag (e.g., `"verified"`). |

### Content Fields (varies by type)

| Field | Used By | Description |
|-------|---------|-------------|
| `content` | `fact`, `narrative`, `technical`, `fit_assessment` | The main text content. Should be self-contained — readable and meaningful without needing other entries for context. |
| `question` | `qa_pair` | The question this entry answers. Write it the way a real person would ask it. |
| `answer` | `qa_pair` | The answer to the question. Concise but complete. |
| `title` | `narrative`, `technical` | A descriptive title for the entry. Used in retrieval scoring. |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `project` | string | Project name in `PascalCase`. Use when the entry relates to a specific project. Examples: `Career`, `CloudMigration`, `Consulting` |
| `fit_type` | string | Only for `fit_assessment` type. Values: `good_fit`, `not_ideal`, `red_flag` |
| `criteria` | string | Only for `fit_assessment` type. The criteria being evaluated. |
| `explanation` | string | Only for `fit_assessment` type. Detailed explanation of the assessment. |

## Content Guidelines

### Writing Good Entries

**Facts** should be atomic — one verifiable claim per entry. If you're writing a fact that has an "and" in the middle connecting two unrelated claims, split it into two entries.

**Narratives** should be self-contained stories. A reader should understand the context, challenge, action, and result without needing to read other entries. Aim for 50-200 words.

**QA Pairs** should use natural language for the question — write it the way a visitor would actually ask, not how a search engine would phrase it. The answer should be direct and complete.

**Technical entries** should include specific details: numbers, tools, frameworks, metrics. Vague technical descriptions don't help the chatbot give useful answers.

**Fit assessments** should be honest about both good fits and poor fits. This helps the chatbot give authentic, helpful responses rather than just selling.

### Content Self-Containment

Every entry should make sense on its own. The retrieval engine might return any combination of entries, so don't write entries that depend on other entries being present for context. If an entry references a project, include enough context that a reader understands what the project is.

### Source Attribution

Always record where information came from. This serves two purposes: it lets you trace claims back to source material, and it helps you identify when information might be outdated (if the source document gets updated).

## Topic Taxonomy

Topics should be consistent across your knowledge base. Here are recommended starting topics — extend this list as needed for your domain.

**Universal topics:**
- `about` — General overview, personal brand, mission
- `career_history` — Work experience, roles, timeline
- `skills` — Capabilities, methodologies, tools
- `achievements` — Metrics, awards, recognition
- `services` — What you offer (for consultants/freelancers)
- `fit` — Ideal client/employer/collaborator profiles
- `contact` — How to reach you, availability

**Project-specific topics** use the prefix `project_`:
- `project_platform` — For a project called "Platform"
- `project_migration` — For a project called "Migration"

## ID Convention

IDs follow the format `rag-YYYY-MM-DD-###` where the date is when the entry was created and `###` is a zero-padded sequential number starting at 001 for each date.

```
rag-2026-01-27-001  (first entry created on Jan 27)
rag-2026-01-27-002  (second entry created on Jan 27)
rag-2026-01-29-001  (first entry created on Jan 29)
```

This convention makes it easy to see when entries were added and to append new entries without ID conflicts.

## Validation Rules

A valid knowledge base entry must satisfy:

1. `id` matches the pattern `rag-\d{4}-\d{2}-\d{2}-\d{3}`
2. `type` is one of the five defined types
3. `confidence` is one of: `verified`, `inferred`, `approximate`
4. `tags` is a non-empty array of strings
5. For `fact`, `narrative`, `technical`: `content` is a non-empty string
6. For `qa_pair`: both `question` and `answer` are non-empty strings
7. For `fit_assessment`: `fit_type`, `criteria`, and `explanation` are present
8. For `narrative` and `technical`: `title` is recommended (not strictly required, but the retrieval engine uses it for scoring)

## Knowledge Base Size Guidelines

Based on real-world usage, here are rough targets for a comprehensive personal knowledge base:

- **Minimum viable:** 30-50 entries (covers basics, can answer common questions)
- **Good coverage:** 80-120 entries (detailed career history, project details, services)
- **Comprehensive:** 150-200+ entries (deep narratives, technical details, edge cases)

A well-built knowledge base typically breaks down roughly as: 40% facts, 30% narratives, 15% technical, 10% qa_pairs, 5% fit_assessments. But this varies — a consultant's KB might have more fit_assessments, while an engineer's might be heavier on technical entries.

## Building the Knowledge Base

The recommended process for creating a knowledge base has two phases:

### Phase 1: Document Parsing
Feed your source documents (resume, portfolio, project docs, blog posts) to an AI and have it extract entries in this JSONL format. This produces the initial knowledge base — typically 60-100 entries covering the documented facts of your background.

### Phase 2: Interview Deepening
Use the interview bot to conduct a structured conversation that extracts tacit knowledge — the stories, decision-making processes, motivations, and context that documents don't capture. This typically adds 50-100+ entries, mostly narratives and qa_pairs, and is where the knowledge base becomes truly valuable.

## Extending the Schema

This schema is designed to be extended. If you need additional fields for your use case, add them — the retrieval engine ignores fields it doesn't recognize, and having extra metadata in your entries doesn't hurt.

Common extensions:
- `date_range`: For entries about time-bounded experiences (e.g., `"date_range": "2019-2022"`)
- `url`: Link to a public resource related to the entry
- `priority`: Manual boost for entries you want surfaced more often
- `deprecated`: Flag entries that are outdated but kept for history
