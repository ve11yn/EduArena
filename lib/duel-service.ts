import { getDuelById, updateDuel, getUserById, updateUsersElo, getUserEloForSubject, updateUserLives, updateTrainingProgress } from "@/lib/firebase/firestore";
import { calculateEloRating } from "@/lib/elo";
import { generateBotAnswer } from "@/lib/game-modes";
import type { Duel } from "@/lib/firebase/firestore";

export interface DuelUpdateData {
  player1AnswersRaw?: string[];
  player1Times?: number[];
  player2AnswersRaw?: string[];
  player2Time?: number[]; // Changed to singular to match updateDuel usage
  currentQuestionIndex?: number;
  player1Score?: number;
  player2Score?: number;
  winnerId?: string;
  status?: string;
  completedAt?: Date;
  botError?: boolean;
}

export interface SubmitAnswerResult {
  success: boolean;
  completed: boolean;
  nextQuestion?: boolean;
  waitingForBot?: boolean;
  result?: DuelResult;
  error?: string;
  // Immediate feedback for current question
  questionFeedback?: {
    correct: boolean;
    correctAnswer: number;
    userAnswer: number;
    explanation?: string;
    questionIndex: number;
    questionText: string;
    options: string[];
  };
}

export interface DuelResult {
  winnerId?: string;
  player1Score: number;
  player2Score: number;
  player1Answers: boolean[];
  player2Answers: boolean[];
  totalQuestions: number;
  eloChanges?: {
    player: {
      oldElo: number;
      newElo: number;
      change: number;
    };
    opponent: {
      oldElo: number;
      newElo: number;
      change: number;
    };
  };
  isTraining: boolean;
}

export const submitAnswer = async (
  duelId: string,
  answer: string,
  timeElapsed: number,
  currentUserId: string,
): Promise<SubmitAnswerResult> => {
  try {
    if (!duelId || answer === undefined || timeElapsed === undefined) {
      return { success: false, completed: false, error: "Missing required fields" };
    }

    const duel = await getDuelById(duelId);
    if (!duel) {
      return { success: false, completed: false, error: "Duel not found" };
    }

    const isPlayer1 = duel.player1Id === currentUserId;
    if (!isPlayer1) {
      return { success: false, completed: false, error: "Only player1 can submit in training mode" };
    }

    // Update player1's raw answer and time
    const player1AnswersRaw = [...(duel.player1Answers || Array(duel.currentQuestionIndex + 1).fill(undefined))];
    const player1Times = [...(duel.player1Time || Array(duel.currentQuestionIndex + 1).fill(0))];

    player1AnswersRaw[duel.currentQuestionIndex] = answer;
    player1Times[duel.currentQuestionIndex] = timeElapsed;

    const updateData = {
      player1Answers: player1AnswersRaw,
      player1Time : player1Times,
    };

    const cleanUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    );
    await updateDuel(duelId, cleanUpdateData);

    // Generate bot response immediately with difficulty-appropriate accuracy
    const currentQuestion = duel.quizData![duel.currentQuestionIndex];
    
    // Determine bot accuracy based on difficulty
    let botAccuracy = 0.75; // default
    if (duel.difficulty === 'beginner') {
      botAccuracy = 0.6; // Bot makes more mistakes for beginners
    } else if (duel.difficulty === 'intermediate') {
      botAccuracy = 0.75; // Moderate challenge
    } else if (duel.difficulty === 'advanced') {
      botAccuracy = 0.9; // Bot is very good for advanced players
    }
    
    console.log(`🤖 Bot generating answer with ${(botAccuracy * 100)}% accuracy for ${duel.difficulty} difficulty`);
    const botAnswer = generateBotAnswer(currentQuestion.correct_answer, botAccuracy);
    const botResponseTime = Math.random() * 2000 + 1000;

    const player2AnswersRaw = [...(duel.player2Answers || Array(duel.currentQuestionIndex + 1).fill(undefined))];
    const player2Times = [...(duel.player2Time || Array(duel.currentQuestionIndex + 1).fill(0))];

    player2AnswersRaw[duel.currentQuestionIndex] = botAnswer.toString();
    player2Times[duel.currentQuestionIndex] = botResponseTime;

    await updateDuel(duelId, {
      player2Answers: player2AnswersRaw,
      player2Time: player2Times,
    });

    const updatedDuel = await getDuelById(duelId);
    if (!updatedDuel) {
      return { success: false, completed: false, error: "Failed to fetch updated duel" };
    }

    const player1HasAnswered = updatedDuel.player1Answers && updatedDuel.player1Answers[updatedDuel.currentQuestionIndex] !== undefined;
    const player2HasAnswered = updatedDuel.player2Answers && updatedDuel.player2Answers[updatedDuel.currentQuestionIndex] !== undefined;

    if (player1HasAnswered && player2HasAnswered) {
      return await processQuestionResult(updatedDuel);
    }

    return {
      success: true,
      completed: false,
    };
  } catch (error) {
    console.error("Submit answer error:", error);
    return {
      success: false,
      completed: false,
      error: error instanceof Error ? error.message : "Internal server error",
    };
  }
};

async function processQuestionResult(duel: Duel): Promise<SubmitAnswerResult> {
  const currentQuestion = duel.quizData![duel.currentQuestionIndex];
  const correctAnswer = currentQuestion.correct_answer;

  console.log(`🎯 Processing question ${duel.currentQuestionIndex + 1}:`);
  console.log(`   Question: ${currentQuestion.question.substring(0, 50)}...`);
  console.log(`   Correct answer index: ${correctAnswer}`);
  console.log(`   Correct option: "${currentQuestion.options[correctAnswer]}"`);

  // Use raw answers and compute correctness
  const player1AnswerRaw = duel.player1Answers![duel.currentQuestionIndex];
  const player2AnswerRaw = duel.player2Answers![duel.currentQuestionIndex];
  
  // Parse answers - treat invalid/timeout answers as -1 (always wrong)
  const player1Answer = player1AnswerRaw ? Number.parseInt(player1AnswerRaw) : -1;
  const player2Answer = player2AnswerRaw ? Number.parseInt(player2AnswerRaw) : -1;
  
  // If the parsed answer is NaN or negative, treat as wrong (-1)
  const player1FinalAnswer = (isNaN(player1Answer) || player1Answer < 0) ? -1 : player1Answer;
  const player2FinalAnswer = (isNaN(player2Answer) || player2Answer < 0) ? -1 : player2Answer;

  console.log(`   Player 1 answered: ${player1FinalAnswer} ("${player1FinalAnswer >= 0 ? currentQuestion.options[player1FinalAnswer] || 'Invalid' : 'TIMEOUT/NO ANSWER'}")`);
  console.log(`   Player 2 answered: ${player2FinalAnswer} ("${player2FinalAnswer >= 0 ? currentQuestion.options[player2FinalAnswer] || 'Invalid' : 'TIMEOUT/NO ANSWER'}")`);

  const player1Correct = player1FinalAnswer === correctAnswer;
  const player2Correct = player2FinalAnswer === correctAnswer;

  console.log(`   Player 1 correct: ${player1Correct} (answered ${player1FinalAnswer}, correct is ${correctAnswer})`);
  console.log(`   Player 2 correct: ${player2Correct} (answered ${player2FinalAnswer}, correct is ${correctAnswer})`);

  console.log(`   Player 1 correct: ${player1Correct}`);
  console.log(`   Player 2 correct: ${player2Correct}`);

  let newPlayer1Score = duel.player1Score || 0;
  let newPlayer2Score = duel.player2Score || 0;

  // Update scores for correct answers
  if (player1Correct) {
    newPlayer1Score++;
    console.log(`   ✅ Player 1 score increased to ${newPlayer1Score}`);
  } else {
    console.log(`   ❌ Player 1 answered incorrectly`);
  }
  
  if (player2Correct) {
    newPlayer2Score++;
    console.log(`   ✅ Player 2 score increased to ${newPlayer2Score}`);
  } else {
    console.log(`   ❌ Player 2 answered incorrectly`);
  }

  const isLastQuestion = duel.currentQuestionIndex + 1 >= (duel.maxQuestions || 15); // Default to 15 for training
  console.log(`   Question ${duel.currentQuestionIndex + 1} of ${duel.maxQuestions || 15}`);
  
  // Different continuation logic for training vs PvP
  let shouldContinue: boolean;
  if (duel.isTraining) {
    // In training mode, continue until the last question (no lives check here)
    shouldContinue = !isLastQuestion;
    console.log(`   Training mode: shouldContinue = ${shouldContinue} (isLastQuestion: ${isLastQuestion})`);
  } else {
    // In PvP mode, continue if it's not the last question
    shouldContinue = !isLastQuestion;
    console.log(`   PvP mode: shouldContinue = ${shouldContinue} (isLastQuestion: ${isLastQuestion})`);
  }

  if (shouldContinue) {
    console.log(`   ▶️ Moving to next question (${duel.currentQuestionIndex + 2})`);
    
    const updateData: any = {
      currentQuestionIndex: duel.currentQuestionIndex + 1,
      player1Score: newPlayer1Score,
      player2Score: newPlayer2Score,
    };

    await updateDuel(duel.id, updateData);

    return {
      success: true,
      completed: false,
      nextQuestion: true,
      questionFeedback: {
        correct: player1Correct,
        correctAnswer: correctAnswer,
        userAnswer: player1FinalAnswer,
        explanation: currentQuestion.explanation,
        questionIndex: duel.currentQuestionIndex,
        questionText: currentQuestion.question,
        options: currentQuestion.options,
      },
    };
  } else {
    console.log(`   🏁 Game ending...`);
    
    let winnerId = undefined;

    if (duel.isTraining) {
      // In training mode:
      // - Player wins if they complete all questions
      // - Bot wins if bot has better score (player only loses a global life then)
      // - This is determined at the end, not per question
      if (newPlayer1Score >= newPlayer2Score) {
        winnerId = duel.player1Id;
        console.log(`   🎉 Player 1 wins training mode! Score: ${newPlayer1Score} vs Bot ${newPlayer2Score}`);
        
        // Update training progress for the completed level
        if (duel.trainingLevel) {
          try {
            console.log(`   📈 Updating training progress for ${duel.subject} level ${duel.trainingLevel.levelId}...`);
            const progressResult = await updateTrainingProgress(
              duel.player1Id,
              duel.subject,
              duel.trainingLevel.levelId,
              duel.trainingLevel.totalQuestions, // Complete the entire level
              duel.trainingLevel.totalQuestions
            );
            
            if (progressResult.success) {
              console.log(`   ✅ Training progress updated successfully!`);
              if (progressResult.levelCompleted) {
                console.log(`   🏆 Level ${duel.trainingLevel.levelId} completed!`);
              }
              if (progressResult.nextLevelUnlocked) {
                console.log(`   🔓 Next level unlocked!`);
              }
            } else {
              console.error(`   ❌ Failed to update training progress:`, progressResult.error);
            }
          } catch (error) {
            console.error("   ❌ Error updating training progress:", error);
          }
        }
      } else {
        winnerId = duel.player2Id; // Bot wins
        console.log(`   🤖 Bot wins training mode! Score: Bot ${newPlayer2Score} vs Player ${newPlayer1Score}`);
        console.log(`   💔 Player will lose a global life for being defeated by the bot`);
        
        // Deduct a global life from the player for being defeated by the bot
        try {
          const player = await getUserById(duel.player1Id);
          if (player && player.lives > 0) {
            const newGlobalLives = Math.max(0, player.lives - 1);
            await updateUserLives(duel.player1Id, newGlobalLives);
            console.log(`   � Player's global lives updated: ${player.lives} → ${newGlobalLives}`);
          }
        } catch (error) {
          console.error("   ❌ Error updating player's global lives:", error);
        }
      }
    } else {
      // In PvP mode, determine winner by score
      if (newPlayer1Score > newPlayer2Score) {
        winnerId = duel.player1Id;
        console.log(`   🎉 Player 1 wins PvP! Score: ${newPlayer1Score} vs ${newPlayer2Score}`);
      } else if (newPlayer2Score > newPlayer1Score) {
        winnerId = duel.player2Id;
        console.log(`   🎉 Player 2 wins PvP! Score: ${newPlayer2Score} vs ${newPlayer1Score}`);
      } else {
        console.log(`   🤝 PvP ends in a draw! Score: ${newPlayer1Score} vs ${newPlayer2Score}`);
      }
    }

    const updateData: any = {
      winnerId,
      player1Score: newPlayer1Score,
      player2Score: newPlayer2Score,
      status: "completed",
      completedAt: new Date(),
    };

    console.log(`   💾 Saving final game state...`);
    await updateDuel(duel.id, updateData);

    const result = await calculateFinalResult(duel, newPlayer1Score, newPlayer2Score, winnerId);

    return {
      success: true,
      completed: true,
      result,
      questionFeedback: {
        correct: player1Correct,
        correctAnswer: correctAnswer,
        userAnswer: player1FinalAnswer,
        explanation: currentQuestion.explanation,
        questionIndex: duel.currentQuestionIndex,
        questionText: currentQuestion.question,
        options: currentQuestion.options,
      },
    };
  }
}

async function calculateFinalResult(
  duel: Duel,
  player1Score: number,
  player2Score: number,
  winnerId?: string,
): Promise<DuelResult> {
  const player1Answers: boolean[] = [];
  const player2Answers: boolean[] = [];

  for (let i = 0; i <= duel.currentQuestionIndex; i++) {
    if (duel.quizData && duel.quizData[i]) {
      const correctAnswer = duel.quizData[i].correct_answer;
      
      // Parse answers consistently - treat invalid/timeout as -1 (always wrong)
      const player1AnswerRaw = duel.player1Answers![i];
      const player2AnswerRaw = duel.player2Answers![i];
      
      const player1Answer = player1AnswerRaw ? Number.parseInt(player1AnswerRaw) : -1;
      const player2Answer = player2AnswerRaw ? Number.parseInt(player2AnswerRaw) : -1;
      
      const player1FinalAnswer = (isNaN(player1Answer) || player1Answer < 0) ? -1 : player1Answer;
      const player2FinalAnswer = (isNaN(player2Answer) || player2Answer < 0) ? -1 : player2Answer;
      
      player1Answers.push(player1FinalAnswer === correctAnswer);
      player2Answers.push(player2FinalAnswer === correctAnswer);
    }
  }

  let eloChanges = undefined;

  // No ELO updates for training mode (bot opponent)
  if (!duel.isTraining && !duel.player2Id?.startsWith("bot_")) {
    const player1 = await getUserById(duel.player1Id);
    const player2 = await getUserById(duel.player2Id!);

    if (player1 && player2) {
      const subject = duel.subject;
      const player1CurrentElo = getUserEloForSubject(player1.elo, subject) || 1500; // Default ELO if undefined
      const player2CurrentElo = getUserEloForSubject(player2.elo, subject) || 1500;

      let player1Result = 0.5; // draw
      let player2Result = 0.5; // draw

      if (winnerId === duel.player1Id) {
        player1Result = 1; // win
        player2Result = 0; // loss
      } else if (winnerId === duel.player2Id) {
        player1Result = 0; // loss
        player2Result = 1; // win
      }

      const newPlayer1Elo = calculateEloRating(player1CurrentElo, player2CurrentElo, player1Result);
      const newPlayer2Elo = calculateEloRating(player2CurrentElo, player1CurrentElo, player2Result);

      if (!duel.player2Id) throw new Error("Missing player2Id");

      await updateUsersElo(duel.player1Id, duel.player2Id, subject!, newPlayer1Elo, newPlayer2Elo);

      eloChanges = {
        player: {
          oldElo: player1CurrentElo,
          newElo: newPlayer1Elo,
          change: newPlayer1Elo - player1CurrentElo,
        },
        opponent: {
          oldElo: player2CurrentElo,
          newElo: newPlayer2Elo,
          change: newPlayer2Elo - player2CurrentElo,
        },
      };
    }
  }

  return {
    winnerId,
    player1Score,
    player2Score,
    player1Answers,
    player2Answers,
    totalQuestions: duel.currentQuestionIndex + 1,
    eloChanges,
    isTraining: duel.isTraining || false,
  };
}