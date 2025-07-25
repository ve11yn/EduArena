# LCAS Jr - ELO Quiz Battle System

A Next.js-powered educational quiz platform with ELO ranking, Duolingo-style training mode, and AI-generated questions.

## Features

- **Multi-Subject ELO System**: Math, Bahasa Indonesia, and English
- **Duolingo-style Training Mode**: 15 questions per level, 3 lives system
- **PvP Ranked Battles**: Real-time matchmaking and competitions
- **AI-Powered Questions**: OpenAI integration for dynamic question generation
- **Real-time Updates**: Firebase Firestore for live game state
- **Placement Tests**: Skill assessment and initial ELO assignment

## AI Question Generation

The system uses Google's Gemini AI (FREE) to generate contextual, difficulty-appropriate questions for each subject:

### Setup Gemini Integration

1. Get a free API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Add to `.env.local`:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

### How It Works

- **Gemini First**: Tries to generate questions using Google's Gemini AI (free)
- **Fallback**: Uses static question bank if AI fails
- **Contextual**: Questions are tailored to subject and difficulty level
- **Quality Control**: Validates question format and structure

### Testing AI Questions

Visit `/debug-ai-quiz` when logged in to test the AI question generation with different subjects and difficulty levels.

### Question Types Generated

- **Math**: Arithmetic, algebra, geometry (difficulty-appropriate)
- **Bahasa Indonesia**: Grammar, vocabulary, reading comprehension
- **English**: Grammar, vocabulary, reading, writing skills

## Training Mode (3 Lives System)

- Players start with 3 lives per level
- Wrong answers deduct 1 life
- Game continues until lives reach 0 or all questions answered
- 15 questions per training level
- Progress persists between sessions

## Development

```bash
npm install
npm run dev
```

## Firebase Configuration

Update `.env.local` with your Firebase credentials for production use.
