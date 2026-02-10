import type { PersonalityFile } from "../types.js"
import { rick } from "./rick.js"
import { yoda } from "./yoda.js"
import { deadpool } from "./deadpool.js"
import { data } from "./data.js"
import { sherlock } from "./sherlock.js"
import { gandalf } from "./gandalf.js"
import { glados } from "./glados.js"
import { bender } from "./bender.js"
import { q } from "./q.js"
import { dumbledore } from "./dumbledore.js"
import { splinter } from "./splinter.js"
import { spock } from "./spock.js"

/**
 * Default personality with its filename identifier
 */
export type DefaultPersonality = {
  /** Filename identifier (lowercase, no extension) */
  filename: string
  /** Personality configuration */
  config: PersonalityFile
}

/**
 * All default personalities bundled with the plugin.
 * These are installed to user's personalities directory on first run.
 */
export const DEFAULT_PERSONALITIES: DefaultPersonality[] = [
  { filename: "rick", config: rick },
  { filename: "yoda", config: yoda },
  { filename: "deadpool", config: deadpool },
  { filename: "data", config: data },
  { filename: "sherlock", config: sherlock },
  { filename: "gandalf", config: gandalf },
  { filename: "glados", config: glados },
  { filename: "bender", config: bender },
  { filename: "q", config: q },
  { filename: "dumbledore", config: dumbledore },
  { filename: "splinter", config: splinter },
  { filename: "spock", config: spock },
]

// Also export individually for direct access
export { rick, yoda, deadpool, data, sherlock, gandalf, glados, bender, q, dumbledore, splinter, spock }
