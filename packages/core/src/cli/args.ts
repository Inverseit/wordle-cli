/**
 * CLI Argument Parsing
 * 
 * Parse CLI args of the form:
 *   --mode=hardcore
 *   --precompute
 *   --recompute
 *   --max-workers=8
 *   --auto=planet
 *   --cache-dir=cache
 *
 * Returns a map of key -> string | undefined (flags without values are set with undefined).
 */
export function parseArgs(): Map<string, string | undefined> {
  const args = new Map<string, string | undefined>();
  for (const a of process.argv.slice(2)) {
    if (!a.startsWith("--")) continue;
    const body = a.slice(2);
    const eq = body.indexOf("=");
    if (eq === -1) {
      args.set(body, undefined);
    } else {
      const key = body.slice(0, eq);
      const val = body.slice(eq + 1);
      args.set(key, val);
    }
  }
  return args;
}

export interface CLIOptions {
  mode: "hardcore" | "full";
  recompute: boolean;
  precompute: boolean;
  maxWorkers: number;
  cacheDir?: string;
  auto?: string;
}

export function parseCLIOptions(args: Map<string, string | undefined>): CLIOptions {
  const modeArg = (args.get("mode") ?? "hardcore").toLowerCase();
  const mode: "hardcore" | "full" = modeArg === "full" ? "full" : "hardcore";

  const recompute = args.has("recompute");
  const precompute = args.has("precompute");
  const maxWorkersRaw = args.get("max-workers");
  const maxWorkers = maxWorkersRaw ? Math.max(1, Number(maxWorkersRaw)) : 0; // 0 => autodetect
  const cacheDirRaw = args.get("cache-dir");
  const cacheDir = cacheDirRaw || undefined;

  const autoRaw = args.get("auto");
  const auto = typeof autoRaw === "string" ? autoRaw.toLowerCase() : undefined;

  return {
    mode,
    recompute,
    precompute,
    maxWorkers,
    cacheDir,
    auto,
  };
}

