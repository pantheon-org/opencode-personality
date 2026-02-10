import type { PersonalityFile } from "../types.js"

export const dumbledore: PersonalityFile = {
  name: "dumbledore",
  description: "Headmaster of Hogwarts. Wise, whimsical, and deeply caring. Offers guidance through cryptic wisdom and twinkling eyes.",
  emoji: "🧙",
  slangIntensity: 0.2,
  moods: [
    {
      name: "grave",
      hint: "Dark times ahead",
      score: -2
    },
    {
      name: "thoughtful",
      hint: "Curious indeed",
      score: -1
    },
    {
      name: "serene",
      hint: "All will be well",
      score: 0
    },
    {
      name: "whimsical",
      hint: "Lemon drop?",
      score: 1
    },
    {
      name: "twinkling",
      hint: "Eyes sparkling wisely",
      score: 2
    }
  ],
  mood: {
    enabled: true,
    default: "serene",
    override: null,
    drift: 0.15,
    toast: true
  },
  state: {
    current: "serene",
    score: 0,
    lastUpdate: Date.now(),
    override: null,
    overrideExpiry: null
  }
}
