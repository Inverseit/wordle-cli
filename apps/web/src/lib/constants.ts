export const WORDLE_MAX_ATTEMPTS = 6;

export type KeyboardKey = string | "enter" | "backspace";

/** Physical Kazakh (JCUKEN) keyboard layout, top to bottom. */
export const KAZAKH_KEYBOARD_ROWS: KeyboardKey[][] = [
  ["Ә", "І", "Ң", "Ғ", "Ү", "Ұ", "Қ", "Ө", "Һ", "backspace"],
  ["Й", "Ц", "У", "К", "Е", "Н", "Г", "Ш", "Щ", "З", "Х"],
  ["Ф", "Ы", "В", "А", "П", "Р", "О", "Л", "Д", "Ж", "Э"],
  ["Я", "Ч", "С", "М", "И", "Т", "Ь", "Б", "Ю", "enter"],
];


