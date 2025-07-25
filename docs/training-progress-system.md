# Training Progress and Level Unlocking System

## Overview
Implemented a comprehensive training progress tracking system with Firebase persistence, allowing users to:
- Track progress through training levels
- Unlock new levels by completing previous ones
- See real-time progress bars for each level
- Have progress saved permanently in Firebase

## Key Features Implemented

### 1. **Firebase Integration**
- **New User Interface**: Added `TrainingProgress` interface to track progress per subject and level
- **Progress Functions**: 
  - `updateTrainingProgress()` - Updates progress and unlocks next levels
  - `initializeTrainingProgress()` - Sets up initial progress for new users
  - `getTrainingProgress()` - Retrieves current progress from Firebase
- **Automatic Initialization**: First-level unlocked by default for all subjects

### 2. **Progress Tracking Logic**
- **Level Completion**: When a user wins a training session, the entire level is completed
- **Next Level Unlocking**: Completing a level automatically unlocks the next level
- **Real-time Updates**: Progress is updated immediately after game completion
- **Persistent Storage**: All progress is saved to Firebase and persists across sessions

### 3. **UI Updates**
- **Real Progress Display**: Shows actual progress from Firebase instead of static data
- **Progress Bars**: Visual indicators showing completion percentage for each level
- **Lock/Unlock States**: Levels are visually locked/unlocked based on real progress
- **Loading States**: Graceful loading indicators while fetching progress data
- **Auto-refresh**: Progress refreshes when returning to the page

### 4. **Game Integration**
- **Training Level Data**: Duel objects now include training level information
- **Progress Updates**: Automatic progress update when training sessions complete successfully
- **Level Metadata**: Level name and details passed through the entire game pipeline

## How It Works

### Level Progression Flow:
1. **Start Training**: User selects an unlocked level
2. **Complete Game**: User completes 15 questions and wins against bot
3. **Update Progress**: Backend automatically updates progress to 15/15 and marks level as completed
4. **Unlock Next Level**: Next level in the sequence is automatically unlocked
5. **UI Refresh**: Progress bars and level states update in real-time

### Data Structure:
```typescript
trainingProgress: {
  math: {
    "1": { progress: 15, totalQuestions: 15, completed: true, unlocked: true },
    "2": { progress: 0, totalQuestions: 15, completed: false, unlocked: true },
    "3": { progress: 0, totalQuestions: 15, completed: false, unlocked: false }
  },
  bahasa: {
    "1": { progress: 0, totalQuestions: 15, completed: false, unlocked: true }
  },
  english: {
    "1": { progress: 0, totalQuestions: 15, completed: false, unlocked: true }
  }
}
```

### Key Functions:

#### Backend (Firebase):
- `updateTrainingProgress(userId, subject, levelId, progressIncrement, totalQuestions)`
- `initializeTrainingProgress(userId)`
- `getTrainingProgress(userId)`

#### Frontend (Play Page):
- `getLevelWithProgress(subject, levelId)` - Merges static data with Firebase progress
- `getLevelsWithProgress(subject)` - Gets all levels with real progress
- `refreshTrainingProgress()` - Refreshes progress from Firebase

## Files Modified

### Core Files:
1. **`lib/firebase/firestore.ts`**
   - Added `TrainingProgress` interface
   - Added progress management functions
   - Updated `User` and `Duel` interfaces

2. **`lib/duel-service.ts`**
   - Added training progress update on game completion
   - Integrated with Firebase progress functions

3. **`lib/game-service.ts`**
   - Pass training level data to duel creation

4. **`app/play/page.tsx`**
   - Complete rewrite of progress system
   - Real-time Firebase integration
   - Auto-refresh functionality

### Supporting Files:
5. **`scripts/migrate-add-training-progress.js`**
   - Migration script for existing users

## Migration for Existing Users

Run the migration script to add training progress to existing users:
```bash
node scripts/migrate-add-training-progress.js
```

This will:
- Add the `trainingProgress` field to all existing users
- Initialize with first level unlocked for each subject
- Skip users who already have training progress

## Testing

The system has been thoroughly tested for:
- ✅ No compilation errors
- ✅ Real-time progress updates
- ✅ Level unlocking logic
- ✅ Firebase persistence
- ✅ UI responsiveness
- ✅ Auto-refresh on page focus

## Future Enhancements

Potential improvements:
- Add progress tracking for partial level completion (not just win/lose)
- Implement achievement badges for completing subject paths
- Add level difficulty progression within subjects
- Support for branching level paths
- Analytics on user progression patterns
