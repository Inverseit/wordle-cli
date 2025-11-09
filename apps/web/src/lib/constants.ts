export const WORDLE_MAX_ATTEMPTS = 6;

/** Full Kazakh Cyrillic alphabet ordered for keyboard grouping. */
const KAZAKH_ALPHABET = [
  "а",
  "ә",
  "б",
  "в",
  "г",
  "ғ",
  "д",
  "е",
  "ё",
  "ж",
  "з",
  "и",
  "й",
  "к",
  "қ",
  "л",
  "м",
  "н",
  "ң",
  "о",
  "ө",
  "п",
  "р",
  "с",
  "т",
  "у",
  "ұ",
  "ү",
  "ф",
  "х",
  "һ",
  "ц",
  "ч",
  "ш",
  "щ",
  "ы",
  "і",
  "ь",
  "ъ",
  "э",
  "ю",
  "я",
];

export type KeyboardKey = string | "enter" | "backspace";

export const KAZAKH_KEYBOARD_ROWS: KeyboardKey[][] = [
  KAZAKH_ALPHABET.slice(0, 14),
  KAZAKH_ALPHABET.slice(14, 28),
  ["enter", ...KAZAKH_ALPHABET.slice(28), "backspace"],
];

