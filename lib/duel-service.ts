import { getDuelById, updateDuel, getUserById, updateUsersElo, getUserEloForSubject } from "@/lib/firebase/firestore";
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

    // Generate bot response immediately
    const currentQuestion = duel.quizData![duel.currentQuestionIndex];
    const botAnswer = generateBotAnswer(currentQuestion.correct_answer, 0.75);
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

  // Use raw answers and compute correctness
  const player1Answer = Number.parseInt(duel.player1Answers![duel.currentQuestionIndex] || "0");
  const player2Answer = Number.parseInt(duel.player2Answers![duel.currentQuestionIndex] || "0");

  const player1Correct = player1Answer === correctAnswer;
  const player2Correct = player2Answer === correctAnswer;

  let newPlayer1Score = duel.player1Score || 0;
  let newPlayer2Score = duel.player2Score || 0;

  if (player1Correct) newPlayer1Score++;
  if (player2Correct) newPlayer2Score++;

  const isLastQuestion = duel.currentQuestionIndex + 1 >= (duel.maxQuestions || 10); // Default to 10 if undefined
  const shouldContinue = player1Correct && player2Correct && !isLastQuestion;

  if (shouldContinue) {
    await updateDuel(duel.id, {
      currentQuestionIndex: duel.currentQuestionIndex + 1,
      player1Score: newPlayer1Score,
      player2Score: newPlayer2Score,
    });

    return {
      success: true,
      completed: false,
      nextQuestion: true,
    };
  } else {
    let winnerId = undefined;

    if (newPlayer1Score > newPlayer2Score) {
      winnerId = duel.player1Id;
    } else if (newPlayer2Score > newPlayer1Score) {
      winnerId = duel.player2Id;
    }

    await updateDuel(duel.id, {
      winnerId,
      player1Score: newPlayer1Score,
      player2Score: newPlayer2Score,
      status: "completed",
      completedAt: new Date(),
    });

    const result = await calculateFinalResult(duel, newPlayer1Score, newPlayer2Score, winnerId);

    return {
      success: true,
      completed: true,
      result,
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
      player1Answers.push(Number.parseInt(duel.player1Answers![i] || "0") === correctAnswer);
      player2Answers.push(Number.parseInt(duel.player2Answers![i] || "0") === correctAnswer);
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