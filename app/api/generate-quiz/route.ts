import { type NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase/admin"
import { generateQuizQuestions } from "@/lib/quiz-generator"

export async function POST(request: NextRequest) {
  console.log('🎯 API Route: generate-quiz called')
  
  try {
    const { subject, difficulty, count } = await request.json()
    console.log('📋 Request params:', { subject, difficulty, count })

    // Validate input
    if (!subject) {
      return NextResponse.json({ error: "Missing required field: subject" }, { status: 400 })
    }

    // In development mode with mock Firebase, skip token verification
    const isDevelopment = process.env.NODE_ENV === 'development' && 
                         process.env.FIREBASE_PROJECT_ID === 'development-project'

    if (!isDevelopment) {
      // Verify Firebase Auth token in production
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
    } else {
      console.log('🔧 Development mode: Skipping token verification')
    }

    // Generate quiz questions using AI or fallback to static
    const questionCount = count || 5
    const quizDifficulty = difficulty || "intermediate"
    
    console.log(`🚀 SERVER: Starting quiz generation for ${subject} (${quizDifficulty}) - ${questionCount} questions`)
    
    const questions = await generateQuizQuestions(subject, quizDifficulty, questionCount)
    
    console.log(`🎯 SERVER: Generated ${questions.length} questions total`)
    console.log(`📋 SERVER: First question preview:`, questions[0]?.question?.substring(0, 50) + '...')

    return NextResponse.json({
      success: true,
      data: questions,
      metadata: {
        subject,
        difficulty: quizDifficulty,
        count: questions.length,
        generatedWith: 'AI-powered generator',
        generatedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error("Quiz generation error:", error)
    return NextResponse.json({ 
      error: "Failed to generate quiz",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
