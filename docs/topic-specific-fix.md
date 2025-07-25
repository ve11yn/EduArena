## Topic-Specific Question Generation Fix

### Problem
When you selected "Basic Addition" in training mode, the system was generating questions with different operations (like division) instead of only addition questions.

### Root Cause
The AI question generation was using `getSpecificTopic()` function which randomly selected a topic from a predefined list, ignoring the specific level you chose in the UI.

### Solution Applied

1. **Updated Game Flow**: Now when you select "Basic Addition", the specific level name is passed through the entire question generation pipeline:
   - Play Page → Game Service → API Route → Quiz Generator → Gemini Service

2. **Modified Functions**:
   - `generateQuizQuestionsViaAPI()` - Now accepts `specificTopic` parameter
   - `generateQuizQuestions()` - Passes specific topic to AI
   - `generateGeminiQuizQuestions()` - Uses provided topic instead of random selection
   - `generateStaticQuestions()` - Filters questions by specific topic

3. **Enhanced Validation**: The topic validation is now stricter and logs when using override topics vs auto-selected ones.

### Testing Steps

1. **Go to Training Mode** and select "Basic Addition"
2. **Start the level** and observe the questions generated
3. **All questions should be addition only** (e.g., "What is 5 + 3?")
4. **Check browser console** for logs showing "Topic: Basic Addition (override)"

### Fallback Behavior

- **AI Available**: Gemini will generate only addition questions based on the specific topic
- **AI Unavailable**: Static question bank will provide pre-made addition questions
- **Invalid Topic**: Falls back to general difficulty-based questions

### Console Logs to Look For

When working correctly, you should see:
```
🎯 Focusing on specific topic: Basic Addition (override)
🤖 Attempting Gemini AI generation: 15 questions for math (beginner) - Topic: Basic Addition
```

Instead of:
```
🎯 Focusing on specific topic: Simple Division (auto-selected)
```

The fix ensures that when you choose "Basic Addition", you get **only addition questions**, not a random mix of mathematical operations.
