# AI-Generated Friendly Task Title

## Overview

When a user creates a task and it gets divided into subtasks, the main task currently retains the original user input as its title. This feature will use AI to generate a concise, friendly title for the main task instead of using the raw user input.

## Problem Statement

Currently, when a user enters a task like:
> "I need to prepare for my job interview at Google next week and make sure I'm ready for technical questions"

The main task is saved with this exact text as the title. This creates several UX issues:

1. **Long, unwieldy titles** - User inputs are often verbose and conversational
2. **Inconsistent formatting** - Some users write short titles, others write full sentences
3. **Poor scannability** - Long titles make the task list harder to scan quickly
4. **Redundant information** - The subtasks already contain the actionable details

## Proposed Solution

Enhance the task creation flow to generate a short, friendly title using AI. The AI will analyze the user's input and create a concise title (2-5 words) that captures the essence of the task.

### Example Transformations

| User Input | AI-Generated Title |
|------------|-------------------|
| "I need to prepare for my job interview at Google next week" | "Google Interview Prep" |
| "Plan my daughter's 5th birthday party for Saturday" | "Birthday Party Planning" |
| "Clean up my garage and organize all the tools" | "Garage Cleanup" |
| "Learn how to cook Italian food from scratch" | "Italian Cooking Basics" |
| "Set up the new home office in the spare bedroom" | "Home Office Setup" |

## Technical Implementation

### Architecture

```mermaid
flowchart TB
    subgraph client [Client - React]
        Input[User enters task description]
        Display[Display task with friendly title]
    end
    
    subgraph server [Server - Next.js API]
        Route[/api/tasks POST]
        OpenAI1[OpenAI: Generate friendly title]
        OpenAI2[OpenAI: Generate subtasks]
        DB[Supabase: Save task]
    end
    
    Input -->|POST task| Route
    Route -->|prompt| OpenAI1
    Route -->|prompt| OpenAI2
    OpenAI1 -->|friendly title| Route
    OpenAI2 -->|subtasks array| Route
    Route -->|save| DB
    DB -->|response| Route
    Route -->|task with title & subtasks| Display
```

### API Changes

#### Modified Endpoint: `POST /api/tasks`

The existing endpoint will be modified to include title generation.

**Request Body (unchanged):**
```typescript
{
  task: string; // User's original input (1-200 chars)
}
```

**Response Body (unchanged structure, different title value):**
```typescript
{
  task: {
    id: string;
    title: string;      // NOW: AI-generated friendly title
    created_at: string;
    subtasks: Array<{
      id: string;
      text: string;
      checked: boolean;
      position: number;
    }>;
  }
}
```

### OpenAI Integration

#### Option A: Single Combined Prompt (Recommended)

Make one OpenAI call that returns both the friendly title and subtasks. This reduces latency and API costs.

**System Prompt:**
```
You are a task organization assistant. Given a task description, you will:
1. Generate a short, friendly title (2-5 words) that captures the essence of the task
2. Break down the task into 3-5 specific, actionable subtasks

Rules for title:
- Keep it between 2-5 words
- Use title case (capitalize major words)
- Make it scannable and memorable
- Avoid articles (a, an, the) when possible
- No punctuation at the end

Rules for subtasks:
- Each subtask should be a clear action item
- Keep each subtask under 100 characters
- Return between 3 and 5 subtasks

Return a JSON object with this exact structure:
{
  "title": "Friendly Title Here",
  "subtasks": ["Subtask 1", "Subtask 2", "Subtask 3"]
}
```

**Example Input:**
```
Plan my daughter's 5th birthday party for Saturday
```

**Example Output:**
```json
{
  "title": "Birthday Party Planning",
  "subtasks": [
    "Send party invitations to friends",
    "Order birthday cake and decorations",
    "Plan age-appropriate party games",
    "Prepare goody bags for guests",
    "Set up party area and decorations"
  ]
}
```

#### Option B: Parallel Prompts

Make two parallel OpenAI calls - one for the title, one for subtasks. Higher cost but allows independent optimization of each prompt.

### Schema Changes

#### Zod Schema Update

Update `lib/schemas/index.ts` to validate the new response format:

```typescript
// Response schema for OpenAI combined output
export const aiTaskResponseSchema = z.object({
  title: z.string().min(2).max(50),
  subtasks: z.array(z.string().min(1).max(100)).min(3).max(5),
});
```

### Database Schema

No changes required. The `tasks` table already has a `title` column that will now store the AI-generated title instead of the raw user input.

If tracking the original user input is desired, consider adding:

```sql
-- Optional: Store original user input for reference
ALTER TABLE tasks ADD COLUMN original_input TEXT;
```

### Error Handling

| Scenario | Behavior |
|----------|----------|
| AI fails to generate title | Fall back to using the original user input as title |
| Title exceeds 50 characters | Truncate at last complete word + "..." |
| Title is empty | Use first 5 words of user input |
| Subtasks succeed but title fails | Use fallback title, proceed with subtask creation |
| Invalid JSON response | Retry once, then fall back to original behavior |

### Implementation Steps

#### Step 1: Update OpenAI Prompt
Modify the system prompt in `app/api/tasks/route.ts` to request both title and subtasks in a single call.

#### Step 2: Update Response Parsing
Add parsing logic to extract both `title` and `subtasks` from the AI response.

#### Step 3: Add Validation Schema
Create a Zod schema for validating the AI response structure.

#### Step 4: Add Fallback Logic
Implement graceful degradation if title generation fails.

#### Step 5: Update Tests
- Add unit tests for the new prompt format
- Add tests for fallback scenarios
- Update existing integration tests

#### Step 6: Update Logging
Add logging for title generation success/failure.

## Acceptance Criteria

1. **Title Generation**
   - [ ] AI generates a title for every new task
   - [ ] Title is between 2-5 words
   - [ ] Title uses title case formatting
   - [ ] Title accurately represents the task content

2. **Fallback Behavior**
   - [ ] If AI title generation fails, the original user input is used
   - [ ] Failure is logged but does not break task creation
   - [ ] User is not aware of fallback (seamless experience)

3. **Performance**
   - [ ] Single API call handles both title and subtasks
   - [ ] No noticeable increase in task creation latency
   - [ ] Response time remains under 5 seconds

4. **Data Integrity**
   - [ ] Title is stored correctly in database
   - [ ] Subtasks are still generated correctly
   - [ ] No regression in existing functionality

## Testing Strategy

### Unit Tests

```typescript
describe('AI Title Generation', () => {
  it('should generate a friendly title from verbose input', async () => {
    const input = "I need to prepare for my job interview at Google";
    const result = await generateTaskWithTitle(input);
    expect(result.title.split(' ').length).toBeLessThanOrEqual(5);
    expect(result.title).not.toBe(input);
  });

  it('should fall back to original input on AI failure', async () => {
    // Mock OpenAI to fail
    const input = "Test task";
    const result = await generateTaskWithTitle(input);
    expect(result.title).toBe(input);
  });

  it('should truncate extremely long generated titles', async () => {
    // Mock OpenAI to return a long title
    const result = await generateTaskWithTitle("test");
    expect(result.title.length).toBeLessThanOrEqual(50);
  });
});
```

### Integration Tests

```typescript
describe('POST /api/tasks', () => {
  it('should return a task with AI-generated title', async () => {
    const response = await fetch('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ task: 'Plan my vacation to Japan' }),
    });
    const data = await response.json();
    
    expect(data.task.title).not.toBe('Plan my vacation to Japan');
    expect(data.task.subtasks.length).toBeGreaterThanOrEqual(3);
  });
});
```

## UI Considerations

No changes required to the frontend. The `TaskCard` component already displays `task.title`, which will now contain the AI-generated friendly title.

### Optional Enhancement

Consider showing the original user input as a tooltip or expandable section if users want to see their original description:

```tsx
// Future enhancement - not part of this spec
<TaskCard
  title={task.title}           // AI-generated
  description={task.originalInput}  // User's original text (expandable)
/>
```

## Security Considerations

1. **Input Sanitization** - Continue to validate and sanitize user input before sending to OpenAI
2. **Output Sanitization** - Sanitize AI-generated title before storing/displaying
3. **Rate Limiting** - Existing rate limits apply; no change needed
4. **Cost Management** - Combined prompt reduces API calls from potentially 2 to 1

## Rollback Plan

If issues arise:
1. Revert to using `task` directly as `title` in the database insert
2. Remove the title parsing logic
3. Keep the combined prompt but ignore the title field

## Out of Scope

- User editing of AI-generated titles (future feature)
- Multiple title suggestions for user to choose from
- Retroactive title generation for existing tasks
- Custom title generation preferences/settings

## References

- Current implementation: `taskbreaker/app/api/tasks/route.ts`
- OpenAI prompt strategy: `.specs/taskbreaker-plan.md`
- Project rules: `.cursorrules`
