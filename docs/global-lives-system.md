# Global Lives System Implementation Summary

## Overview
Successfully refactored the lives system from per-level/training session to a global user-level system. Users now have 3 global lives and only lose a life when they are completely defeated by the bot in training mode.

## Key Changes Made

### 1. Data Structure Updates

**User Interface (lib/types.ts & lib/firebase/auth.ts & lib/firebase/firestore.ts)**
- Added `lives: number` field to User interface
- Default value: 3 lives for new users
- Updated getUserById() to handle lives field with fallback to 3

**Training Level Data (lib/game-modes.ts)**
- Removed `currentLives` and `maxLives` from TrainingLevelData interface
- Simplified to just levelId, levelName, and totalQuestions

**Duel Interface (lib/firebase/firestore.ts)**
- Removed `player1Lives` field from Duel interface
- No longer tracking lives per training session

### 2. Game Logic Changes

**Duel Service (lib/duel-service.ts)**
- **BEFORE**: Lives were deducted per wrong answer during training
- **AFTER**: Lives are only deducted when the player is completely defeated by the bot
- Removed per-question lives checking
- Added global lives deduction when bot wins overall training session
- Training continues until all 15 questions are completed
- Win condition: Player score >= Bot score (no lives lost)
- Loss condition: Bot score > Player score (1 global life lost)

**Game Service (lib/game-service.ts)**
- Removed player1Lives initialization from duel creation
- Training mode no longer initializes with session-specific lives

### 3. UI Updates

**Play Page (app/play/page.tsx)**
- Removed per-level lives display from training levels
- Added global lives display in training path header
- Updated game mode descriptions to reflect "Global Lives System"
- Added lives check before starting training (must have at least 1 life)
- Updated level setup display to show global lives instead of session lives

**Profile Page (app/profile/page.tsx)**
- Added lives display to overall stats section
- Shows lives as hearts with count (e.g., "2/3")
- Adjusted grid layout to accommodate new stats

**Dashboard Page (app/dashboard/page.tsx)**
- Added global lives indicator in welcome section
- Shows current lives with visual hearts indicator

### 4. Database Functions

**Firestore Service (lib/firebase/firestore.ts)**
- Added `updateUserLives(uid, newLives)` function
- Added `regenerateUserLife(uid)` function for future life regeneration
- Updated user creation to include lives: 3

### 5. Migration Support

**Migration Script (scripts/migrate-add-lives.js)**
- Created script to add lives field to existing users
- Can be used to update existing database records

## New Game Flow

### Training Mode:
1. **Start**: User must have at least 1 global life
2. **During Play**: User answers questions, no lives deducted for wrong answers
3. **End Condition**: Complete all 15 questions
4. **Win**: Player score >= Bot score → No lives lost
5. **Loss**: Bot score > Player score → Lose 1 global life

### PvP Mode:
- Unchanged, no lives system involved

## Benefits of New System

1. **Less Frustrating**: Players don't lose lives on individual wrong answers
2. **Global Progression**: Lives are shared across all subjects/levels
3. **Strategic**: Players must consider when to attempt training based on their remaining lives
4. **Clearer**: Only one lives count to track, simpler UI
5. **Scalable**: Easy to add life regeneration features later

## Files Modified

- `lib/types.ts` - Updated User interface
- `lib/game-modes.ts` - Simplified TrainingLevelData
- `lib/firebase/auth.ts` - Updated UserProfile interface and user creation
- `lib/firebase/firestore.ts` - Updated User interface, added lives functions
- `lib/duel-service.ts` - Completely refactored lives logic
- `lib/game-service.ts` - Removed per-session lives initialization
- `app/play/page.tsx` - Updated UI to show global lives
- `app/profile/page.tsx` - Added lives to stats display
- `app/dashboard/page.tsx` - Added lives indicator to welcome section

## Testing Recommendations

1. **Create new user** - Verify they start with 3 lives
2. **Start training mode** - Verify global lives are displayed
3. **Complete training (win)** - Verify no lives are lost
4. **Complete training (lose to bot)** - Verify 1 life is deducted from global count
5. **Try training with 0 lives** - Verify it's blocked with appropriate message
6. **Check all UI displays** - Verify lives show consistently across pages

## Future Enhancements

1. **Life Regeneration**: Implement time-based or achievement-based life regeneration
2. **Life Purchases**: Allow users to buy additional lives
3. **Life Rewards**: Give lives for completing achievements or daily quests
4. **Life Notifications**: Alert users when lives are lost or regenerated
