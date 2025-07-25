import { createDuel, findWaitingDuel, updateDuel, getUserEloForSubject } from "@/lib/firebase/firestore"
import { createBotOpponent } from "@/lib/game-modes"
import type { GameConfig } from "@/lib/game-modes"
import type { User } from "@/lib/firebase/firestore"

export interface GameStartResult {
  success: boolean
  duelId?: string
  mode?: "pvp" | "training"
  opponent?: any
  matched?: boolean
  error?: string
}

// Client-side function to generate questions via API
async function generateQuizQuestionsViaAPI(
  subject: string, 
  difficulty: string, 
  count: number,
  userToken: string,
  specificTopic?: string // Add optional specific topic parameter
) {
  console.log('🤖 Calling AI question generation API:', { subject, difficulty, count, specificTopic })
  
  const response = await fetch('/api/generate-quiz', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({
      subject,
      difficulty,
      count,
      specificTopic // Pass the specific topic to the API
    })
  });

  console.log('📡 API Response status:', response.status)

  if (!response.ok) {
    const error = await response.json();
    console.error('❌ API Error:', error)
    throw new Error(error.error || 'Failed to generate questions');
  }

  const data = await response.json();
  console.log('✅ API Success:', data.metadata || 'No metadata')
  return data.data; // Return the questions array
}

export const startGame = async (config: GameConfig, currentUser: User, userToken: string): Promise<GameStartResult> => {
  try {
    const { mode, subject, difficulty } = config

    // Validate input
    if (!mode || !subject) {
      return { success: false, error: "Missing required fields: mode, subject" }
    }

    if (!["pvp", "training"].includes(mode)) {
      return { success: false, error: "Invalid mode. Must be 'pvp' or 'training'" }
    }

    const maxQuestions = mode === "training" ? 15 : 5 // 15 questions for training, 5 for PvP

    if (mode === "training") {
      // Training mode - create game with bot (requires difficulty)
      if (!difficulty) {
        return { success: false, error: "Difficulty required for training mode" }
      }

      const botOpponent = createBotOpponent(difficulty)
      
      // For training mode, use the specific level name if available
      const specificTopic = config.trainingLevel?.levelName
      const quizQuestions = await generateQuizQuestionsViaAPI(subject, difficulty, maxQuestions, userToken, specificTopic)

      const duelId = await createDuel({
        player1Id: currentUser.id,
        player2Id: botOpponent.id,
        subject: subject as any,
        difficulty,
        quizData: quizQuestions,
        currentQuestionIndex: 0,
        player1Answers: [],
        player2Answers: [],
        player1Time: [],
        player2Time: [],
        player1Score: 0,
        player2Score: 0,
        status: "in_progress",
        isTraining: true,
        maxQuestions,
        trainingLevel: config.trainingLevel, // Pass training level data
        startedAt: new Date(),
      })

      return {
        success: true,
        duelId,
        mode: "training",
        opponent: botOpponent,
        matched: true,
      }
    } else {
      // PvP mode - find or create match (no difficulty needed)
      const userElo = getUserEloForSubject(currentUser.elo, subject as any)
      const waitingDuel = await findWaitingDuel(subject as any, currentUser.id, userElo)

      if (waitingDuel) {
        // Join existing duel
        const quizQuestions = await generateQuizQuestionsViaAPI(subject, "intermediate", maxQuestions, userToken)

        await updateDuel(waitingDuel.id, {
          player2Id: currentUser.id,
          status: "in_progress",
          quizData: quizQuestions,
          startedAt: new Date(),
        })

        return {
          success: true,
          duelId: waitingDuel.id,
          mode: "pvp",
          matched: true,
        }
      } else {
        // Create new duel and wait for opponent
        const duelId = await createDuel({
          player1Id: currentUser.id,
          subject: subject as any,
          currentQuestionIndex: 0,
          player1Answers: [],
          player2Answers: [],
          player1Time: [],
          player2Time: [],
          player1Score: 0,
          player2Score: 0,
          status: "waiting",
          isTraining: false,
          maxQuestions,
        })

        return {
          success: true,
          duelId,
          mode: "pvp",
          matched: false,
        }
      }
    }
  } catch (error) {
    console.error("Start game error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    }
  }
}
