# Demo & Screenshot Guide

What to capture for the README and project documentation. Your live site (MikeJones.online) is the best demo — it shows the real thing, not a mockup.

## Screenshots for the README

Capture these 4-5 images and save them in a `/docs/images/` folder:

### 1. Widget Closed State
**What:** The chat bubble sitting in the bottom-right corner of your site
**Why:** Shows how unobtrusive the widget is — visitors see it but it doesn't interrupt
**How:** Take a screenshot of your homepage with the chat bubble visible. Crop to show the bubble in context (don't need the full page).

### 2. Widget Open — First Impression
**What:** The chat window open, showing the greeting and suggested questions
**Why:** This is the "aha moment" — people see immediately what this does
**How:** Click the bubble, screenshot before typing anything. The greeting + suggestion buttons tell the story.

### 3. Conversation in Action
**What:** A 2-3 turn conversation showing a real question and answer
**Why:** Proves the chatbot actually works and gives good answers
**How:** Ask something like "What's Mike's experience with AI?" — get a response, maybe a follow-up. Screenshot the conversation.
**Tip:** Pick a question that shows depth. A response that references specific projects, years, or achievements demonstrates the knowledge base is working.

### 4. Mobile View
**What:** The widget on a phone-sized screen
**Why:** Many visitors will be on mobile — show it works
**How:** Use browser dev tools to simulate a phone viewport (iPhone 14 or similar), open the widget, take a screenshot.

### 5. (Optional) The Knowledge Base
**What:** A snippet of the JSONL file showing 3-4 entries
**Why:** Shows what's under the hood — makes it tangible for developers
**How:** Open `knowledge.jsonl` in VS Code or a text editor, screenshot a section showing different entry types (a fact, a qa_pair, a narrative).

## README Image Placement

Once you have the screenshots, they go in the README like this:

```markdown
## What It Looks Like

![Chat widget on a live site](docs/images/widget-closed.png)
*The widget sits unobtrusively on your site*

![Conversation example](docs/images/conversation.png)
*Visitors ask questions and get answers grounded in your knowledge base*
```

## Live Demo Option

Instead of (or in addition to) screenshots, you can point people to the live version:

```markdown
## Live Demo

See it in action on [MikeJones.online](https://mikejones.online) —
click the chat bubble in the bottom-right corner.
```

This is the most compelling demo possible — it's real, it's live, and it proves the system works. People can try it themselves.

## Video Walkthrough (Future)

If you want to do a screen recording later, here's the flow that tells the best story:

1. **Start on your site** — show the bubble, click it open (5 seconds)
2. **Ask a question** — something specific like "What projects has Mike worked on?" (10 seconds)
3. **Show the answer** — let it stream in, pause so people can read (10 seconds)
4. **Ask a follow-up** — show it handles conversation context (10 seconds)
5. **Quick peek at the knowledge base** — switch to the JSONL file, scroll through a few entries (10 seconds)
6. **Close** — "This is built with Distill. It's open source." (5 seconds)

Total: ~50 seconds. Short enough for a GIF, long enough to be compelling.
