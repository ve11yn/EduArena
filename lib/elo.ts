export function calculateEloRating(
  playerRating: number,
  opponentRating: number,
  result: number, // 0 = loss, 0.5 = draw, 1 = win
  kFactor = 32,
): number {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400))
  const newRating = playerRating + kFactor * (result - expectedScore)
  return Math.round(newRating)
}

export function calculateEloDelta(playerRating: number, opponentRating: number, result: number, kFactor = 32): number {
  const newRating = calculateEloRating(playerRating, opponentRating, result, kFactor)
  return newRating - playerRating
}
