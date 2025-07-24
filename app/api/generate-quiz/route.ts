import { type NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase/admin"

export async function POST(request: NextRequest) {
  try {
    const { topic, difficulty } = await request.json()

    // Validate input
    if (!topic || !difficulty) {
      return NextResponse.json({ error: "Missing required fields: topic, difficulty" }, { status: 400 })
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
    const quizQuestion = await generateMockQuiz(topic, difficulty)

    return NextResponse.json({
      success: true,
      data: quizQuestion,
    })
  } catch (error) {
    console.error("Quiz generation error:", error)
    return NextResponse.json({ error: "Failed to generate quiz" }, { status: 500 })
  }
}

async function generateMockQuiz(topic: string, difficulty: string) {
  // Mock quiz questions for different topics and difficulties
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
    science: {
      beginner: [
        {
          question: "What planet is closest to the Sun?",
          options: ["Venus", "Mercury", "Earth", "Mars"],
          correct_answer: 1,
          explanation: "Mercury is the closest planet to the Sun",
        },
      ],
      intermediate: [
        {
          question: "What is the chemical symbol for gold?",
          options: ["Go", "Gd", "Au", "Ag"],
          correct_answer: 2,
          explanation: "Au is the chemical symbol for gold, from the Latin 'aurum'",
        },
      ],
      advanced: [
        {
          question: "What is the speed of light in a vacuum?",
          options: ["299,792,458 m/s", "300,000,000 m/s", "299,000,000 m/s", "301,000,000 m/s"],
          correct_answer: 0,
          explanation: "The speed of light in a vacuum is exactly 299,792,458 m/s",
        },
      ],
    },
    history: {
      beginner: [
        {
          question: "In which year did World War II end?",
          options: ["1944", "1945", "1946", "1947"],
          correct_answer: 1,
          explanation: "World War II ended in 1945",
        },
      ],
      intermediate: [
        {
          question: "Who was the first President of the United States?",
          options: ["Thomas Jefferson", "John Adams", "George Washington", "Benjamin Franklin"],
          correct_answer: 2,
          explanation: "George Washington was the first President of the United States",
        },
      ],
      advanced: [
        {
          question: "The Treaty of Westphalia was signed in which year?",
          options: ["1648", "1649", "1650", "1651"],
          correct_answer: 0,
          explanation: "The Treaty of Westphalia was signed in 1648, ending the Thirty Years' War",
        },
      ],
    },
  }

  const topicQuestions = quizBank[topic as keyof typeof quizBank]
  if (!topicQuestions) {
    throw new Error(`Topic ${topic} not supported`)
  }

  const difficultyQuestions = topicQuestions[difficulty as keyof typeof topicQuestions]
  if (!difficultyQuestions) {
    throw new Error(`Difficulty ${difficulty} not supported for topic ${topic}`)
  }

  // Return a random question from the available ones
  const randomIndex = Math.floor(Math.random() * difficultyQuestions.length)
  return difficultyQuestions[randomIndex]
}
