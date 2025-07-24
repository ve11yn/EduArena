import { type NextRequest, NextResponse } from "next/server"
import { getDuelById, updateDuel, getUserById, updateUsersElo, getUserEloForSubject } from "@/lib/firebase/firestore"
import { calculateEloRating } from "@/lib/elo"
import { generateBotAnswer } from "@/lib/game-modes"


export async function POST(request: NextRequest) {
  try {
    const { duelId, answer, timeElapsed } = await request.json()

    if (!duelId || answer === undefined || timeElapsed === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get user ID from header
    const userId = request.headers.get("x-user-id")
    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 401 })
    }

    // Get current duel
    const duel = await getDuelById(duelId)
    if (!duel) {
      return NextResponse.json({ error: "Duel not found" }, { status: 404 })
    }

    // Determine if user is player1 or player2
    const isPlayer1 = duel.player1Id === userId
    const isPlayer2 = duel.player2Id === userId

    if (!isPlayer1 && !isPlayer2) {
      return NextResponse.json({ error: "Not authorized for this duel" }, { status: 403 })
    }

    // Update the appropriate player's answer and time
    const updateData = isPlayer1
      ? { player1Answer: answer, player1Time: timeElapsed }
      : { player2Answer: answer, player2Time: timeElapsed }

   
    await updateDuel(duelId, updateData)

    // Handle bot response for training mode
    if (duel.isTraining && isPlayer1) {
      // Generate bot answer after a delay
      const botResponseTime = Math.random() * 5000 + 3000 // 3-8 seconds

      setTimeout(async () => {
        if(!duel.quizData){
          throw new Error("error")
        }
        const currentQuestion = duel.quizData[duel.currentQuestionIndex];
        const botAnswer = generateBotAnswer(currentQuestion.correct_answer, 0.75) // 75% accuracy
        await updateDuel(duelId, {
          player2Answers: [botAnswer.toString()],
          player2Time: [botResponseTime],
        })
      }, botResponseTime)

      return NextResponse.json({
        success: true,
        completed: false,
        waitingForBot: true,
      })
    }

    // Get updated duel to check if both players have answered
    const updatedDuel = await getDuelById(duelId)
    if (!updatedDuel) {
      return NextResponse.json({ error: "Failed to fetch updated duel" }, { status: 500 })
    }

    // If both players have answered, determine winner and update ELO
    if (updatedDuel.player1Answers !== undefined && updatedDuel.player2Answers !== undefined) {
      const result = await processDuelResult(updatedDuel)
      return NextResponse.json({
        success: true,
        completed: true,
        result,
      })
    }

    return NextResponse.json({
      success: true,
      completed: false,
    })
  } catch (error) {
    console.error("Submit answer error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function processDuelResult(duel: any) {
  const quizData = duel.quizData
  const correctAnswer = quizData.correct_answer

  // Check correctness
  const player1Correct = Number.parseInt(duel.player1Answer) === correctAnswer
  const player2Correct = Number.parseInt(duel.player2Answer) === correctAnswer

  let winnerId = null
  let player1Result = 0 // loss
  let player2Result = 0 // loss

  if (player1Correct && !player2Correct) {
    winnerId = duel.player1Id
    player1Result = 1 // win
    player2Result = 0 // loss
  } else if (!player1Correct && player2Correct) {
    winnerId = duel.player2Id
    player1Result = 0 // loss
    player2Result = 1 // win
  } else if (player1Correct && player2Correct) {
    // Both correct, winner determined by speed
    if (duel.player1Time < duel.player2Time) {
      winnerId = duel.player1Id
      player1Result = 1
      player2Result = 0
    } else if (duel.player2Time < duel.player1Time) {
      winnerId = duel.player2Id
      player1Result = 0
      player2Result = 1
    } else {
      // Tie - both get draw
      player1Result = 0.5
      player2Result = 0.5
    }
  }

  // Update duel status
  await updateDuel(duel.id, {
    winnerId,
    status: "completed",
    completedAt: new Date(),
  })

  let eloChanges = null

  // Only update ELO for PvP matches
  if (!duel.isTraining && !duel.player2Id?.startsWith("bot_")) {
    const player1 = await getUserById(duel.player1Id)
    const player2 = await getUserById(duel.player2Id!)

    if (player1 && player2) {
      const subject = duel.subject
      const player1CurrentElo = getUserEloForSubject(player1.elo, subject)
      const player2CurrentElo = getUserEloForSubject(player2.elo, subject)

      // Calculate new ELO ratings
      const newPlayer1Elo = calculateEloRating(player1CurrentElo, player2CurrentElo, player1Result)
      const newPlayer2Elo = calculateEloRating(player2CurrentElo, player1CurrentElo, player2Result)

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
    player1Correct,
    player2Correct,
    correctAnswer,
    explanation: quizData.explanation,
    eloChanges,
    isTraining: duel.isTraining || false,
  }
}
