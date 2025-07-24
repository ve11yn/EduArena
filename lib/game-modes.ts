export type GameMode = "pvp" | "training"

export interface GameConfig {
  mode: GameMode
  subject: "math" | "bahasa" | "english"
  difficulty: "beginner" | "intermediate" | "advanced"
}

export interface BotOpponent {
  id: string
  username: string
  elo: number
  difficulty: "beginner" | "intermediate" | "advanced"
  responseTime: number // milliseconds
  accuracy: number // 0-1
}

export const createBotOpponent = (difficulty: "beginner" | "intermediate" | "advanced"): BotOpponent => {
  const bots = {
    beginner: {
      username: "ROOKIE_BOT",
      elo: 450,
      responseTime: 15000, // 15 seconds
      accuracy: 0.6,
    },
    intermediate: {
      username: "WARRIOR_BOT",
      elo: 650,
      responseTime: 10000, // 10 seconds
      accuracy: 0.75,
    },
    advanced: {
      username: "MASTER_BOT",
      elo: 850,
      responseTime: 7000, // 7 seconds
      accuracy: 0.9,
    },
  }

  const botConfig = bots[difficulty]
  return {
    id: `bot_${difficulty}`,
    username: botConfig.username,
    elo: botConfig.elo,
    difficulty,
    responseTime: botConfig.responseTime,
    accuracy: botConfig.accuracy,
  }
}

export const generateBotAnswer = (correctAnswer: number, accuracy: number): number => {
  const random = Math.random()
  if (random < accuracy) {
    return correctAnswer // Correct answer
  } else {
    // Generate wrong answer
    const wrongOptions = [0, 1, 2, 3].filter((i) => i !== correctAnswer)
    return wrongOptions[Math.floor(Math.random() * wrongOptions.length)]
  }
}
