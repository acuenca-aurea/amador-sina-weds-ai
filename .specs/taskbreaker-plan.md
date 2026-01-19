# TaskBreaker Implementation Plan

## Overview

Build TaskBreaker, a single-page Next.js app with one API route that calls OpenAI to break tasks into subtasks. DB-free, Vercel-ready.

## Architecture

```mermaid
flowchart TB
    subgraph client [Client - React]
        Page[page.tsx]
        State[useState: task, subtasks, loading, error]
    end
    
    subgraph server [Server - Next.js API]
        Route[/api/breakdown/route.ts]
    end
    
    subgraph external [External]
        OpenAI[OpenAI API]
    end
    
    Page -->|POST task| Route
    Route -->|prompt| OpenAI
    OpenAI -->|JSON subtasks| Route
    Route -->|response| Page
    Page -->|render| State
```

## File Structure

```
taskbreaker/
├── app/
│   ├── page.tsx          # Main UI (input, button, checklist)
│   ├── layout.tsx        # Root layout with metadata
│   ├── globals.css       # Minimal styles
│   └── api/
│       └── breakdown/
│           └── route.ts  # OpenAI integration
├── .env.local            # OPENAI_API_KEY (local only)
├── package.json
└── README.md
```

## Implementation Steps

### Step 1: Project Setup
- Run `npx create-next-app@latest taskbreaker` with App Router, TypeScript, Tailwind CSS
- Install OpenAI SDK: `npm install openai`
- Create `.env.local` with `OPENAI_API_KEY` placeholder

### Step 2: API Route (`app/api/breakdown/route.ts`)
- Accept POST with `{ task: string }`
- Validate input (1-200 chars, non-empty)
- Call OpenAI `gpt-4o-mini` with structured output prompt
- Return `{ subtasks: string[] }` or `{ error: string }`
- Handle OpenAI errors gracefully

### Step 3: Main Page (`app/page.tsx`)
- State: `task`, `subtasks`, `checked`, `loading`, `error`
- Input field with 200 char limit
- "Break it down" button (disabled when empty or loading)
- Loading spinner during API call
- Subtask checklist with toggle functionality
- Error message with "Try again" button

### Step 4: Styling (`app/globals.css`)
- Clean, minimal design
- Distinctive typography (not generic)
- Focused color palette
- Subtle animations for loading and checkbox interactions

### Step 5: Local Testing
- Run `npm run dev`
- Test happy path: enter task, get subtasks, check items
- Test error path: disconnect network or use invalid key
- Test validation: empty input, very long input

### Step 6: Vercel Deployment
- Push to GitHub
- Connect to Vercel
- Add `OPENAI_API_KEY` environment variable in Vercel dashboard
- Deploy and test production URL

## Key Technical Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Next.js version | 14+ App Router | Modern, Vercel-native |
| OpenAI model | gpt-4o-mini | Fast, cheap, sufficient |
| Styling | Tailwind CSS | Rapid development |
| State management | useState only | No complexity needed |
| Response format | JSON mode | Reliable parsing |

## OpenAI Prompt Strategy

System prompt will instruct the model to:
- Return exactly 3-5 subtasks
- Make subtasks specific and actionable
- Output valid JSON array
- Keep each subtask under 100 characters

## Error Handling

| Error Type | User Message | Action |
|------------|--------------|--------|
| Empty input | "Please enter a task" | Prevent submission |
| API timeout | "Couldn't break down your task. Please try again." | Show retry button |
| OpenAI error | Same as above | Show retry button |
| Invalid response | Same as above | Show retry button |

## Locked PoC Spec Reference

- **Name**: TaskBreaker
- **Input**: Task string (1-200 chars)
- **Output**: 3-5 subtasks as checkable items
- **Demo**: Type "Prepare for job interview" → Click "Break it down" → See 5 subtasks
- **Error case**: OpenAI failure shows retry button
- **Out of scope**: Persistence, auth, multiple lists, editing, drag-drop, dates, priorities, dark mode, mobile polish, sharing, history, undo
