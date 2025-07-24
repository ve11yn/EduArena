import { type NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase/admin"

export async function POST(request: NextRequest) {
  try {
    const { subject, difficulty } = await request.json()

    // Validate input
    if (!subject || !difficulty) {
      return NextResponse.json({ error: "Missing required fields: subject, difficulty" }, { status: 400 })
    }

    // Verify Firebase Auth token
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
      const token = authHeader.split("Bearer ")[1]
      await adminAuth.verifyIdToken(token)
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Generate quiz question
    const quizQuestion = await generateMockQuiz(subject, difficulty)

    return NextResponse.json({
      success: true,
      data: quizQuestion,
    })
  } catch (error) {
    console.error("Quiz generation error:", error)
    return NextResponse.json({ error: "Failed to generate quiz" }, { status: 500 })
  }
}

async function generateMockQuiz(subject: string, difficulty: string) {
  // Mock quiz questions for different subjects and difficulties
  const quizBank = {
    math: {
      beginner: [
        {
          question: "What is 15 + 27?",
          options: ["40", "42", "44", "46"],
          correct_answer: 1,
          explanation: "15 + 27 = 42",
        },
        {
          question: "What is 8 × 7?",
          options: ["54", "56", "58", "60"],
          correct_answer: 1,
          explanation: "8 × 7 = 56",
        },
      ],
      intermediate: [
        {
          question: "What is the square root of 144?",
          options: ["10", "11", "12", "13"],
          correct_answer: 2,
          explanation: "√144 = 12 because 12² = 144",
        },
        {
          question: "If x + 5 = 12, what is x?",
          options: ["5", "6", "7", "8"],
          correct_answer: 2,
          explanation: "x + 5 = 12, so x = 12 - 5 = 7",
        },
      ],
      advanced: [
        {
          question: "What is the derivative of x³?",
          options: ["2x²", "3x²", "x²", "3x³"],
          correct_answer: 1,
          explanation: "The derivative of x³ is 3x² using the power rule",
        },
      ],
    },
    english: {
      beginner: [
        {
          question: "Which word is a noun?",
          options: ["Run", "Beautiful", "House", "Quickly"],
          correct_answer: 2,
          explanation: "House is a noun - it names a thing",
        },
      ],
      intermediate: [
        {
          question: "What is the past tense of 'go'?",
          options: ["Goes", "Gone", "Went", "Going"],
          correct_answer: 2,
          explanation: "The past tense of 'go' is 'went'",
        },
      ],
      advanced: [
        {
          question: "Which sentence uses correct subject-verb agreement?",
          options: ["The team are playing well", "The team is playing well", "The teams is playing well", "The teams are play well"],
          correct_answer: 1,
          explanation: "Team is a collective noun that takes a singular verb: 'The team is playing well'",
        },
      ],
    },
    bahasa: {
      beginner: [
        {
          question: "Apa arti kata 'rumah' dalam bahasa Indonesia?",
          options: ["Car", "House", "School", "Book"],
          correct_answer: 1,
          explanation: "Rumah artinya house dalam bahasa Inggris",
        },
      ],
      intermediate: [
        {
          question: "Manakah yang merupakan kata kerja?",
          options: ["Meja", "Berlari", "Biru", "Besar"],
          correct_answer: 1,
          explanation: "Berlari adalah kata kerja yang menunjukkan tindakan",
        },
      ],
      advanced: [
        {
          question: "Apa bentuk pasif dari kalimat 'Saya membaca buku'?",
          options: ["Buku saya baca", "Buku dibaca oleh saya", "Saya baca buku", "Membaca buku saya"],
          correct_answer: 1,
          explanation: "Bentuk pasif yang benar adalah 'Buku dibaca oleh saya'",
        },
      ],
    },
  }

  const subjectQuestions = quizBank[subject as keyof typeof quizBank]
  if (!subjectQuestions) {
    throw new Error(`Subject ${subject} not supported`)
  }

  const difficultyQuestions = subjectQuestions[difficulty as keyof typeof subjectQuestions]
  if (!difficultyQuestions) {
    throw new Error(`Difficulty ${difficulty} not supported for subject ${subject}`)
  }

  // Return a random question from the available ones
  const randomIndex = Math.floor(Math.random() * difficultyQuestions.length)
  return difficultyQuestions[randomIndex]
}
