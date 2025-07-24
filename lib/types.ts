export interface SubjectElo {
  math: number
  bahasa: number
  english: number
}

export interface User {
  id: string
  username: string
  elo: SubjectElo
  preferredSubject?: keyof SubjectElo
  placementTestCompleted: boolean
  createdAt: Date
}

export interface QuizQuestion {
  question: string
  options: string[]
  correct_answer: number // index of correct option
  explanation?: string
}

export interface Duel {
  id: string
  player1_id: string
  player2_id: string | undefined
  subject: keyof SubjectElo
  difficulty: string
  quiz_data: QuizQuestion | null
  player1_answer: string | null
  player2_answer: string | null
  player1_time: number | null
  player2_time: number | null
  winner_id: string | null
  status: "waiting" | "in_progress" | "completed" | "cancelled"
  created_at: string
  started_at: string | null
  completed_at: string | null
}

export interface DuelWithUsers extends Duel {
  player1: User
  player2: User | null
}
