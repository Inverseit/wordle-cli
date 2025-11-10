import {
  existsSync,
  openSync,
  readFileSync,
  readSync,
  writeSync,
  closeSync,
} from "node:fs";
import path from "node:path";
import { ensureDir, writeAtomic, sha256 } from "./utils/node.js";
import { DEFAULT_PATTERN_DIR } from "./config.js";
import { feedbackCode } from "./feedback.js";

const INDEX_VERSION = 1;
const CHUNK_PREFIX_LENGTH = 2;
const INDEX_FLUSH_INTERVAL = 32;

interface LookupEntry {
  chunk: string;
  position: number;
}

interface ChunkHandle {
  fd: number;
  count: number;
  path: string;
}

interface PatternIndexData {
  version: number;
  rowBytes: number;
  counts: Record<string, number>;
  entries: Record<string, [string, number]>;
}

export class PatternCache {
  private readonly patternDir: string;
  private readonly dictionaryDir: string;
  private readonly chunkDir: string;
  private readonly indexPath: string;
  private readonly answerCount: number;
  private readonly rowBytes: number;
  private readonly guessHashes = new Map<string, string>();
  private readonly lookup = new Map<string, LookupEntry>();
  private readonly chunkCounts = new Map<string, number>();
  private readonly chunkHandles = new Map<string, ChunkHandle>();
  private indexDirty = false;
  private dirtyWrites = 0;

  constructor(
    private readonly answerWords: string[],
    private readonly dictionaryHash: string,
    patternDir: string = DEFAULT_PATTERN_DIR
  ) {
    this.patternDir = patternDir;
    this.answerCount = answerWords.length;
    this.rowBytes = this.answerCount * Uint16Array.BYTES_PER_ELEMENT;

    const baseDir = path.join(
      this.patternDir,
      this.dictionaryHash.slice(0, 2),
      this.dictionaryHash
    );
    this.dictionaryDir = baseDir;
    this.chunkDir = path.join(baseDir, "chunks");
    this.indexPath = path.join(baseDir, "index.json");

    ensureDir(this.chunkDir);
    this.loadIndex();
  }

  private loadIndex() {
    if (!existsSync(this.indexPath)) {
      return;
    }
    try {
      const raw = readFileSync(this.indexPath, "utf8");
      const data: PatternIndexData = JSON.parse(raw);
      if (data.version !== INDEX_VERSION || data.rowBytes !== this.rowBytes) {
        return;
      }
      for (const [guess, [chunk, position]] of Object.entries(
        data.entries ?? {}
      )) {
        this.lookup.set(guess, { chunk, position });
        const current = this.chunkCounts.get(chunk) ?? 0;
        if (position + 1 > current) {
          this.chunkCounts.set(chunk, position + 1);
        }
      }
      for (const [chunk, count] of Object.entries(data.counts ?? {})) {
        const current = this.chunkCounts.get(chunk) ?? 0;
        if (count > current) {
          this.chunkCounts.set(chunk, count);
        }
      }
    } catch (err) {
      console.warn("[PatternCache] Failed to load pattern index:", err);
    }
  }

  private guessHash(guess: string): string {
    let hash = this.guessHashes.get(guess);
    if (!hash) {
      hash = sha256(`guess:${guess}`);
      this.guessHashes.set(guess, hash);
    }
    return hash;
  }

  private ensureChunkHandle(chunk: string): ChunkHandle {
    let handle = this.chunkHandles.get(chunk);
    if (handle) {
      return handle;
    }
    const filePath = path.join(this.chunkDir, `${chunk}.bin`);
    const exists = existsSync(filePath);
    const fd = openSync(filePath, exists ? "r+" : "w+");
    const count = this.chunkCounts.get(chunk) ?? 0;
    handle = { fd, path: filePath, count };
    this.chunkHandles.set(chunk, handle);
    this.chunkCounts.set(chunk, count);
    return handle;
  }

  private lookupOrAssign(guess: string): LookupEntry {
    let entry = this.lookup.get(guess);
    if (entry) {
      return entry;
    }
    const chunk = this.guessHash(guess).slice(0, CHUNK_PREFIX_LENGTH);
    const handle = this.ensureChunkHandle(chunk);
    const position = handle.count;
    entry = { chunk, position };
    this.lookup.set(guess, entry);
    handle.count = position + 1;
    this.chunkCounts.set(chunk, handle.count);
    this.markIndexDirty();
    return entry;
  }

  private readRow(entry: LookupEntry): Uint16Array | undefined {
    try {
      const handle = this.ensureChunkHandle(entry.chunk);
      const buffer = Buffer.allocUnsafe(this.rowBytes);
      const offset = entry.position * this.rowBytes;
      const bytesRead = readSync(handle.fd, buffer, 0, this.rowBytes, offset);
      if (bytesRead !== this.rowBytes) {
        return undefined;
      }
      return new Uint16Array(
        buffer.buffer,
        buffer.byteOffset,
        buffer.byteLength / Uint16Array.BYTES_PER_ELEMENT
      );
    } catch {
      return undefined;
    }
  }

  private writeRow(entry: LookupEntry, row: Uint16Array) {
    const handle = this.ensureChunkHandle(entry.chunk);
    const buffer = Buffer.from(row.buffer, row.byteOffset, row.byteLength);
    const offset = entry.position * this.rowBytes;
    writeSync(handle.fd, buffer, 0, buffer.length, offset);
    if (entry.position >= handle.count) {
      handle.count = entry.position + 1;
      this.chunkCounts.set(entry.chunk, handle.count);
    }
    this.markIndexDirty();
  }

  private markIndexDirty() {
    this.indexDirty = true;
    this.dirtyWrites++;
    if (this.dirtyWrites >= INDEX_FLUSH_INTERVAL) {
      this.writeIndex(false);
    }
  }

  private writeIndex(force: boolean) {
    if (!this.indexDirty && !force) {
      return;
    }
    const counts: Record<string, number> = {};
    for (const [chunk, count] of this.chunkCounts.entries()) {
      counts[chunk] = count;
    }
    const entries: Record<string, [string, number]> = {};
    for (const [guess, entry] of this.lookup.entries()) {
      entries[guess] = [entry.chunk, entry.position];
    }
    const payload: PatternIndexData = {
      version: INDEX_VERSION,
      rowBytes: this.rowBytes,
      counts,
      entries,
    };
    const encoded = Buffer.from(JSON.stringify(payload, null, 2), "utf8");
    writeAtomic(this.indexPath, encoded);
    this.indexDirty = false;
    this.dirtyWrites = 0;
  }

  private computeRow(guess: string): Uint16Array {
    const row = new Uint16Array(this.answerCount);
    for (let i = 0; i < this.answerCount; i++) {
      row[i] = feedbackCode(guess, this.answerWords[i]);
    }
    return row;
  }

  /** Load precomputed matrix row for a guess (codes per target index) or undefined. */
  tryLoad(guess: string): Uint16Array | undefined {
    const entry = this.lookup.get(guess);
    if (!entry) {
      return undefined;
    }
    return this.readRow(entry);
  }

  /** Generate and persist matrix row for guess. */
  generate(guess: string): Uint16Array {
    const entry = this.lookupOrAssign(guess);
    const row = this.computeRow(guess);
    this.writeRow(entry, row);
    return row;
  }

  /** Get codes row, regenerating if missing or forced. */
  getRow(guess: string, force: boolean): Uint16Array {
    if (!force) {
      const row = this.tryLoad(guess);
      if (row) return row;
    }
    return this.generate(guess);
  }

  /** Flush index metadata and close open file handles. */
  flush(): void {
    this.writeIndex(true);
    for (const handle of this.chunkHandles.values()) {
      closeSync(handle.fd);
    }
    this.chunkHandles.clear();
  }
}