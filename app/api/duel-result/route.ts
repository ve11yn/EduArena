import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { calculateEloRating } from "@/lib/elo"

export async function POST(request: NextRequest) {
  try {
    const { playerId, opponentId, result } = await request.json()

    // Validate input
    if (!playerId || !opponentId || typeof result !== "number") {
      return NextResponse.json({ error: "Missing required fields: playerId, opponentId, result" }, { status: 400 })
    }

    if (![0, 0.5, 1].includes(result)) {
      return NextResponse.json({ error: "Result must be 0 (loss), 0.5 (draw), or 1 (win)" }, { status: 400 })
    }

    const supabase = createServerClient()

    // Get current user session
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get both players' current ELO ratings
    const { data: players, error: playersError } = await supabase
      .from("users")
      .select("id, username, elo")
      .in("id", [playerId, opponentId])

    if (playersError || !players || players.length !== 2) {
      return NextResponse.json({ error: "Failed to fetch player data" }, { status: 400 })
    }

    const player = players.find((p) => p.id === playerId)
    const opponent = players.find((p) => p.id === opponentId)

    if (!player || !opponent) {
      return NextResponse.json({ error: "Player or opponent not found" }, { status: 404 })
    }

    // Calculate new ELO ratings
    const newPlayerElo = calculateEloRating(player.elo, opponent.elo, result)
    const newOpponentElo = calculateEloRating(opponent.elo, player.elo, 1 - result)

    // Update both players' ELO ratings
    const { error: updateError } = await supabase.from("users").upsert(
      [
        { id: playerId, elo: newPlayerElo },
        { id: opponentId, elo: newOpponentElo },
      ],
      {
        onConflict: "id",
        ignoreDuplicates: false,
      },
    )

    if (updateError) {
      return NextResponse.json({ error: "Failed to update ELO ratings" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        player: {
          id: playerId,
          username: player.username,
          oldElo: player.elo,
          newElo: newPlayerElo,
          change: newPlayerElo - player.elo,
        },
        opponent: {
          id: opponentId,
          username: opponent.username,
          oldElo: opponent.elo,
          newElo: newOpponentElo,
          change: newOpponentElo - opponent.elo,
        },
      },
    })
  } catch (error) {
    console.error("Duel result API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
