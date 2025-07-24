import { type NextRequest, NextResponse } from "next/server"
import { adminAuth } from "@/lib/firebase/admin"
import { getUserById, findWaitingDuel, createDuel, updateDuel } from "@/lib/firebase/firestore"

export async function POST(request: NextRequest) {
  try {
    const { topic, difficulty } = await request.json()

    if (!topic || !difficulty) {
      return NextResponse.json({ error: "Missing required fields: topic, difficulty" }, { status: 400 })
    }

    // Verify Firebase Auth token
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let currentUserId: string
    try {
      const token = authHeader.split("Bearer ")[1]
      const decodedToken = await adminAuth.verifyIdToken(token)
      currentUserId = decodedToken.uid
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Get current user's ELO
    const currentUser = await getUserById(currentUserId)
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Look for existing waiting duels with similar ELO (±100)
    const waitingDuel = await findWaitingDuel(topic, difficulty, currentUserId, currentUser.elo)

    if (waitingDuel) {
      // Join existing duel
      await updateDuel(waitingDuel.id, {
        player2Id: currentUserId,
        status: "in_progress",
        startedAt: new Date(),
      })

      // Generate quiz question
      const quizResponse = await fetch(`${request.nextUrl.origin}/api/generate-quiz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({ topic, difficulty }),
      })

      if (!quizResponse.ok) {
        return NextResponse.json({ error: "Failed to generate quiz" }, { status: 500 })
      }

      const { data: quizData } = await quizResponse.json()

      // Update duel with quiz data
      await updateDuel(waitingDuel.id, { quizData })

      return NextResponse.json({
        success: true,
        duelId: waitingDuel.id,
        matched: true,
      })
    } else {
      // Create new duel and wait for opponent
      const duelId = await createDuel({
        player1Id: currentUserId,
        topic,
        difficulty,
        status: "waiting",
      })

      return NextResponse.json({
        success: true,
        duelId,
        matched: false,
      })
    }
  } catch (error) {
    console.error("Matchmaking error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
