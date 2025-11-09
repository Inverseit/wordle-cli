export function base3EncodePattern(pattern: number[]): number {
  let code = 0;
  for (let i = 0; i < pattern.length; i++) code = code * 3 + pattern[i];
  return code;
}

export function parsePatternString(s: string, L: number): number {
  if (s.length !== L) throw new Error(`Pattern must be length ${L}`);
  const arr = [...s].map(c => {
    if (c !== "0" && c !== "1" && c !== "2") {
      throw new Error("Pattern digits must be 0,1,2");
    }
    return Number(c);
  });
  return base3EncodePattern(arr);
}

export function decodeBase3(code: number, L: number): number[] {
  const out = new Array(L).fill(0);
  for (let i = L - 1; i >= 0; i--) {
    out[i] = code % 3;
    code = Math.floor(code / 3);
  }
  return out;
}

export function humanPattern(code: number, L: number): string {
  const d = decodeBase3(code, L);
  return d.map(x => (x === 2 ? "🟩" : x === 1 ? "🟨" : "⬜")).join("");
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

