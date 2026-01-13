export function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}

export function shuffle<T>(arr: T[], rng = Math.random): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function splitEquals(a: { teamA: string[]; teamB: string[] }, b: { teamA: string[]; teamB: string[] }) {
  const norm = (x: string[]) => [...x].sort().join('|')
  const aA = norm(a.teamA)
  const aB = norm(a.teamB)
  const bA = norm(b.teamA)
  const bB = norm(b.teamB)
  // identical either as-is or swapped
  return (aA === bA && aB === bB) || (aA === bB && aB === bA)
}

export function textExport(opts: {
  teamAName: string
  teamBName: string
  teamA: string[]
  teamB: string[]
}) {
  const { teamAName, teamBName, teamA, teamB } = opts
  const lines: string[] = []
  lines.push(`${teamAName}`)
  lines.push(...teamA.map((n) => `- ${n}`))
  lines.push('')
  lines.push(`${teamBName}`)
  lines.push(...teamB.map((n) => `- ${n}`))
  return lines.join('\n')
}
