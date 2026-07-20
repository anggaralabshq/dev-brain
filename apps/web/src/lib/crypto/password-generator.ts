export type PasswordOpts = {
  length: number;
  upper: boolean;
  lower: boolean;
  numbers: boolean;
  symbols: boolean;
};

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I/O — avoid visual ambiguity
const LOWER = "abcdefghijkmnpqrstuvwxyz"; // no l
const NUMBERS = "23456789"; // no 0/1
const SYMBOLS = "!@#$%^&*-_=+?";

/** Draw an unbiased random index in [0, max) using rejection sampling — never Math.random(). */
function randomIndex(max: number): number {
  const range = Math.floor(0x100000000 / max) * max; // largest multiple of max <= 2^32
  let x: number;
  do {
    x = crypto.getRandomValues(new Uint32Array(1))[0];
  } while (x >= range);
  return x % max;
}

export function generatePassword(opts: PasswordOpts): string {
  let pool = "";
  if (opts.upper) pool += UPPER;
  if (opts.lower) pool += LOWER;
  if (opts.numbers) pool += NUMBERS;
  if (opts.symbols) pool += SYMBOLS;
  if (!pool) pool = LOWER + NUMBERS; // fallback so generation never produces an empty string

  const length = Math.max(4, opts.length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += pool[randomIndex(pool.length)];
  }
  return out;
}
