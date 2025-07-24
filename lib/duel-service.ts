import { getDuelById, updateDuel, getUserById, updateUsersElo, getUserEloForSubject } from "@/lib/firebase/firestore"
import { calculateEloRating } from "@/lib/elo"
import { generateBotAnswer } from "@/lib/game-modes"
import type { Duel } from "@/lib/firebase/firestore"

export interface SubmitAnswerResult {
  success: boolean
  completed: boolean
  nextQuestion?: boolean
  waitingForBot?: boolean
  result?: DuelResult
  error?: string
}

export interface DuelResult {
  winnerId?: string
  player1Score: number
  player2Score: number
  player1Answers: boolean[]
  player2Answers: boolean[]
  totalQuestions: number
  eloChanges?: {
    player: {
      oldElo: number
      newElo: number
      change: number
    }
    opponent: {
      oldElo: number
      newElo: number
      change: number
    }
  }
  isTraining: boolean
}

export const submitAnswer = async (
  duelId: string,
  answer: string,
  timeElapsed: number,
  currentUserId: string,
): Promise<SubmitAnswerResult> => {
  try {
    if (!duelId || answer === undefined || timeElapsed === undefined) {
      return { success: false, completed: false, error: "Missing required fields" }
    }

    // Get current duel
    const duel = await getDuelById(duelId)
    if (!duel) {
      return { success: false, completed: false, error: "Duel not found" }
    }

    // Determine if user is player1 or player2
    const isPlayer1 = duel.player1Id === currentUserId
    const isPlayer2 = duel.player2Id === currentUserId

    if (!isPlayer1 && !isPlayer2) {
      return { success: false, completed: false, error: "Not authorized for this duel" }
    }

    // Update the appropriate player's answer and time
    const currentAnswers = isPlayer1 ? duel.player1Answers || [] : duel.player2Answers || []
    const currentTimes = isPlayer1 ? duel.player1Time || [] : duel.player2Time || []

    const newAnswers = [...currentAnswers]
    const newTimes = [...currentTimes]

    newAnswers[duel.currentQuestionIndex] = answer
    newTimes[duel.currentQuestionIndex] = timeElapsed

    const updateData = isPlayer1
      ? { player1Answers: newAnswers, player1Times: newTimes }
      : { player2Answers: newAnswers, player2Times: newTimes }

    await updateDuel(duelId, updateData)

    // Handle bot response for training mode
    if (duel.isTraining && isPlayer1) {
      // Generate bot answer after a delay
      const botResponseTime = Math.random() * 2000 + 1000 // 3-8 seconds

      setTimeout(async () => {
        try {
          const currentQuestion = duel.quizData![duel.currentQuestionIndex]
          const botAnswer = generateBotAnswer(currentQuestion.correct_answer, 0.75) // 75% accuracy

          const botAnswers = [...(duel.player2Answers || [])]
          const botTimes = [...(duel.player2Time || [])]

          botAnswers[duel.currentQuestionIndex] = botAnswer.toString()
          botTimes[duel.currentQuestionIndex] = botResponseTime

          await updateDuel(duelId, {
            player2Answers: botAnswers,
            player2Time: botTimes,
          })
        } catch (error) {
          console.error("Bot answer error:", error)
        //   await updateDuel(duelId, { botError: true });
        }
      }, botResponseTime)

      return {
        success: true,
        completed: false,
        waitingForBot: true,
      }
    }

    // Get updated duel to check if both players have answered current question
    const updatedDuel = await getDuelById(duelId)
    if (!updatedDuel) {
      return { success: false, completed: false, error: "Failed to fetch updated duel" }
    }

    const player1HasAnswered =
      updatedDuel.player1Answers && updatedDuel.player1Answers[updatedDuel.currentQuestionIndex] !== undefined
    const player2HasAnswered =
      updatedDuel.player2Answers && updatedDuel.player2Answers[updatedDuel.currentQuestionIndex] !== undefined

    // If both players have answered current question
    if (player1HasAnswered && player2HasAnswered) {
      return await processQuestionResult(updatedDuel)
    }

    return {
      success: true,
      completed: false,
    }
  } catch (error) {
    console.error("Submit answer error:", error)
    return {
      success: false,
      completed: false,
      error: error instanceof Error ? error.message : "Internal server error",
    }
  }
}

async function processQuestionResult(duel: Duel): Promise<SubmitAnswerResult> {
  const currentQuestion = duel.quizData![duel.currentQuestionIndex]
  const correctAnswer = currentQuestion.correct_answer

  // Check if current answers are correct
  const player1Answer = Number.parseInt(duel.player1Answers![duel.currentQuestionIndex])
  const player2Answer = Number.parseInt(duel.player2Answers![duel.currentQuestionIndex])

  const player1Correct = player1Answer === correctAnswer
  const player2Correct = player2Answer === correctAnswer

  // Update scores
  let newPlayer1Score = duel.player1Score
  let newPlayer2Score = duel.player2Score

  if (player1Correct) newPlayer1Score++
  if (player2Correct) newPlayer2Score++

  // Check if we should continue to next question or end the duel
  const shouldContinue = player1Correct && player2Correct && duel.currentQuestionIndex + 1 < duel.maxQuestions

  if (shouldContinue) {
    // Both correct, continue to next question
    await updateDuel(duel.id, {
      currentQuestionIndex: duel.currentQuestionIndex + 1,
      player1Score: newPlayer1Score,
      player2Score: newPlayer2Score,
    })

    return {
      success: true,
      completed: false,
      nextQuestion: true,
    }
  } else {
    // End the duel - either someone got it wrong or we've reached max questions
    let winnerId = undefined

    if (newPlayer1Score > newPlayer2Score) {
      winnerId = duel.player1Id
    } else if (newPlayer2Score > newPlayer1Score) {
      winnerId = duel.player2Id
    }
    // If scores are equal, it's a draw (winnerId remains undefined)

    // Update duel status
    await updateDuel(duel.id, {
      winnerId,
      player1Score: newPlayer1Score,
      player2Score: newPlayer2Score,
      status: "completed",
      completedAt: new Date(),
    })

    // Calculate final result
    const result = await calculateFinalResult(duel, newPlayer1Score, newPlayer2Score, winnerId)

    return {
      success: true,
      completed: true,
      result,
    }
  }
}

async function calculateFinalResult(
  duel: Duel,
  player1Score: number,
  player2Score: number,
  winnerId?: string,
): Promise<DuelResult> {
  // Calculate which answers were correct
  const player1Answers: boolean[] = []
  const player2Answers: boolean[] = []

  for (let i = 0; i <= duel.currentQuestionIndex; i++) {
    if (duel.quizData && duel.quizData[i]) {
      const correctAnswer = duel.quizData[i].correct_answer
      player1Answers.push(Number.parseInt(duel.player1Answers![i]) === correctAnswer)
      player2Answers.push(Number.parseInt(duel.player2Answers![i]) === correctAnswer)
    }
  }

  let eloChanges = undefined

  // Only update ELO for PvP matches
  if (!duel.isTraining && !duel.player2Id?.startsWith("bot_")) {
    const player1 = await getUserById(duel.player1Id)
    const player2 = await getUserById(duel.player2Id!)

    if (player1 && player2) {
      const subject = duel.subject
      const player1CurrentElo = getUserEloForSubject(player1.elo, subject)
      const player2CurrentElo = getUserEloForSubject(player2.elo, subject)

      // Determine result for ELO calculation
      let player1Result = 0.5 // draw
      let player2Result = 0.5 // draw

      if (winnerId === duel.player1Id) {
        player1Result = 1 // win
        player2Result = 0 // loss
      } else if (winnerId === duel.player2Id) {
        player1Result = 0 // loss
        player2Result = 1 // win
      }

      // Calculate new ELO ratings
      const newPlayer1Elo = calculateEloRating(player1CurrentElo, player2CurrentElo, player1Result)
      const newPlayer2Elo = calculateEloRating(player2CurrentElo, player1CurrentElo, player2Result)
      if (!duel.player1Id || !duel.player2Id || !subject) {
        throw new Error("Missing required duel data");
        }
      // Update ELO ratings
      await updateUsersElo(duel.player1Id, duel.player2Id, subject, newPlayer1Elo, newPlayer2Elo)

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
      }
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
  }
}
