
# Wordle(6) Entropy Solver — Bilingual README (English / Қазақша)

> Clean, type‑safe, high‑performance Wordle(6) solver in TypeScript (Node.js, ESM), featuring switchable strategies, multi‑core entropy evaluation, and a disk‑backed feedback pattern cache.

---

## Contents / Мазмұны

- [English](#english)
  - [Overview](#overview)
  - [Mathematical Foundations](#mathematical-foundations)
  - [Architecture](#architecture)
  - [Pattern Computation & Caching](#pattern-computation--caching)
  - [Solvers & Strategies](#solvers--strategies)
  - [CLI Usage](#cli-usage)
  - [Performance & Multicore](#performance--multicore)
  - [Extending to the Web](#extending-to-the-web)
  - [References](#references)
- [Қазақша](#қазақша)
  - [Шолу](#шолу)
  - [Математикалық Негіздеме](#математикалық-негіздеме)
  - [Архитектура](#архитектура)
  - [Үлгі (pattern) Есептеу және Кэштеу](#үлгі-pattern-есептеу-және-кэштеу)
  - [Шешушілер (Solver) және Стратегиялар](#шешушілер-solver-және-стратегиялар)
  - [CLI Қолданылуы](#cli-қолданылуы)
  - [Өнімділік және Көп‑ядролық өңдеу](#өнімділік-және-көп‑ядролық-өңдеу)
  - [Вебке Кеңейту](#вебке-кеңейту)
  - [Пайдаланылған Әдебиеттер](#пайдаланылған-әдебиеттер)

---

## English

### Overview

This repository implements an **information‑theoretic Wordle solver** for a **6‑letter** variant in **TypeScript** (Node.js, ESM). It provides:

- Two interchangeable solvers via a common interface:
  - **HardcoreSolver** — guesses only from the **remaining candidate** set.
  - **FullEntropySolver** — guesses from **all allowed words** to **maximize expected information gain** (entropy).
- A **multi‑core** entropy evaluation pipeline using `worker_threads`.
- A **disk‑backed pattern cache** (per‑guess, per‑dictionary) storing `{guess × target} → feedback` as compact `Uint16Array` rows.

Assumptions:
- You have a list of valid **6‑letter words** (lowercase). Put it in `src/wordlist.ts`.
- We run as a **CLI** (console) for now. Web UI comes later.

### Mathematical Foundations

We use **Shannon entropy** to pick guesses that reduce uncertainty the most on average.

- Let the secret word be a random variable \(X\) over the current **candidate set** \(C\), \(|C| = N\). If uniform, initial entropy is \(H(X) = \log_2 N\).  
  - Shannon, C. E. (1948). *A Mathematical Theory of Communication*. [Wikipedia](https://en.wikipedia.org/wiki/Information_theory)
- For a fixed guess \(g\), the Wordle feedback is a random variable \(Y\) over the set of **feedback patterns** (for 6 letters, at most \(3^6 = 729\)).  
  - Pattern digits: **0** = gray, **1** = yellow, **2** = green.
- The **expected information gain (EIG)** of \(g\) equals the **mutual information** \(I(X;Y) = H(Y)\):  
  \[
    H(Y) = -\sum_{p} P(p)\,\log_2 P(p), \quad
    P(p) = \frac{N_p}{N}
  \]
  where \(N_p\) is the number of candidates that would yield pattern \(p\) for guess \(g\).  
  - Entropy / Mutual information: [Wikipedia](https://en.wikipedia.org/wiki/Entropy_(information_theory)), [Mutual information](https://en.wikipedia.org/wiki/Mutual_information).
- Equivalent form via expected posterior entropy:  
  \[
    \mathrm{EIG}(g) = \log_2 N - \sum_{p} \frac{N_p}{N}\,\log_2 N_p
  \]

**Deterministic feedback rule**: two‑pass scoring (greens, then yellows) using remaining letter frequencies to handle duplicates correctly (same as Wordle). See [Mastermind](https://en.wikipedia.org/wiki/Mastermind_(board_game)) for related search principles.

### Architecture

```
src/
  index.ts                 # CLI entry (ESM); interactive loop or --auto
  config.ts                # constants (WORD_LENGTH, cache paths)
  types.ts                 # core types & solver interfaces
  wordlist.ts              # your 6-letter dictionary (string[])
  pattern.ts               # feedback logic + disk-backed pattern cache
  entropy.ts               # H(Y) for a guess against current candidates
  solvers/
    BaseSolver.ts          # shared multicore evaluation
    HardcoreSolver.ts      # guesses ∈ candidates
    FullEntropySolver.ts   # guesses ∈ allWords
  worker/
    entropyWorker.ts       # worker_threads: parallel entropy evaluation
  utils.ts                 # hashing, base-3 encode/decode, etc.
cache/
  patterns/                # *.bin rows: one file per guess per dictionary hash
```

**Key interfaces** (`src/types.ts`):
- `Solver` with `nextGuess(ctx): Promise<{ guessIndex, entropy }>`
- `SolverContext` provides word lists, candidate indices, cache hash, flags

### Pattern Computation & Caching

- **Feedback encoding**: base‑3 code over 6 digits (0/1/2) → integer in `[0, 728]`.
- **`feedbackCode(guess, target)`**:  
  1) Count `target` letter frequencies.  
  2) Mark greens; decrement freq.  
  3) Mark yellows where freq>0; decrement.  
  4) Encode `[d0..d5]` in base‑3.
- **Cache format**: **per‑guess row**: `Uint16Array` of length `|allWords|`, stored in `cache/patterns/<guess>.<dictHash>.bin`. This yields **O(1)** lookup for `pattern = row[targetIndex]` and enables **fast entropy** computation via counting.

**Why per‑guess rows?**
- Memory locality and simplicity: entropy for a guess touches its row linearly over candidate indices.
- Disk cost: for `N` words, each row ~ `2N` bytes. Total worst‑case ~ `2N^2` bytes if you precompute all rows; usually generated **on demand** or via `--precompute` once.

### Solvers & Strategies

- **HardcoreSolver** (candidate‑only):  
  - Guess universe \(G = C\).  
  - Pros: every guess can be the answer.  
  - Cons: can be slightly worse on average (less info early).

- **FullEntropySolver** (all‑words):  
  - Guess universe \(G = \text{allWords}\).  
  - Pros: maximal expected information; reduces branching in “trap” clusters.  
  - Cons: some guesses cannot be the answer (pure probes).

**Strategy notes**:
- Entropy optimizes expected case. Minimax (worst‑case bucket size) is another criterion; both are classic in Mastermind/Wordle research.
- Hybrid: entropy while \(|C|\) is large, then candidate‑only when small, or a weighted score `α·entropy + β·isCandidate`.

### CLI Usage

Install & run (Node 18+ recommended):

```bash
pnpm i           # or npm i / yarn
pnpm build       # emit dist (optional for dev with ts-node/esm)
```

Dev / ESM loader (example scripts):
```bash
# Precompute all pattern rows (optional but speeds up first runs)
node --loader ts-node/esm src/index.ts --precompute

# Interactive solving (you type feedback as 6 digits 0/1/2)
node --loader ts-node/esm src/index.ts --mode=full
node --loader ts-node/esm src/index.ts --mode=hardcore

# Simulate vs a known secret (must exist in wordlist)
node --loader ts-node/esm src/index.ts --mode=hardcore --auto=planet
```

Flags:
- `--mode=hardcore|full` — choose solver
- `--precompute` — generate all rows and exit
- `--recompute` — force regenerate rows even if present
- `--max-workers=8` — override auto worker count
- `--auto=<word>` — simulate; feedback auto‑computed

**Entering feedback manually**: input a 6‑digit string (e.g., `120012`) where `0=⬜`, `1=🟨`, `2=🟩`.

### Performance & Multicore

- Entropy for one guess is a histogram over patterns for all candidates: \(O(|C|)\) with precomputed row.
- Choosing a best guess over a set \(G\) is \(O(|G|\cdot|C|)\) per turn; we **parallelize** across guesses with `worker_threads`:
  - Main splits `G` into chunks, each worker computes local best.
  - Workers use the same **PatternCache** lazily; rows are loaded/generated per guess.
- Micro‑optimizations:
  - Heuristic prefilter (e.g., letter frequency) to shrink \(G\) when large.
  - Early‑exit if an entropy approaches a theoretical ceiling.
  - Persist rows once; reuse across sessions by dictionary hash.

### Extending to the Web

- Replace `worker_threads` with **Web Workers** + Rollup/Vite build.
- Shared logic stays: `feedbackCode`, row format, entropy, solver interfaces.
- Add a small UI for feedback input (buttons) and candidates display.

### References

- Shannon entropy & information theory:  
  - https://en.wikipedia.org/wiki/Information_theory  
  - https://en.wikipedia.org/wiki/Entropy_(information_theory)  
  - https://en.wikipedia.org/wiki/Mutual_information
- Mastermind/Wordle analysis (background):  
  - https://en.wikipedia.org/wiki/Mastermind_(board_game)  
  - Knuth’s algorithm for Mastermind (minimax): https://doi.org/10.1145/361604.361612
- Wordle specifics (feedback logic, duplicates):  
  - https://en.wikipedia.org/wiki/Wordle

---

## Қазақша

### Шолу

Бұл репозиторий **6 әріпті Wordle** ойынына арналған **ақпараттық‑теориялық шешушіні** (solver) **TypeScript** (Node.js, ESM) тілінде іске асырады. Негізгі мүмкіндіктер:

- Жалпы интерфейс арқылы ауыстырылатын екі шешуші:
  - **HardcoreSolver** — тек **қалған кандидаттар** ішінен жорамалдайды.
  - **FullEntropySolver** — **барлық рұқсат етілген сөздерден** таңдап, **ақпараттың күтілетін ұтысын** (энтропия) максимизациялайды.
- `worker_threads` негізінде **көп‑ядролы** энтропия есептеу.
- `{guess × target} → feedback` нәтижелерін **Uint16Array** қатарлары ретінде сақтайтын **дискте кэш** (әр болжамға бір файл, сөздік хэшіне байланған).

Алғышарттар:
- Сізде **6 әріпті** дұрыс сөздердің (lowercase) тізімі бар — `src/wordlist.ts` файлына орналастырыңыз.
- Қазіргі нұсқа — **CLI** (консоль). Веб UI кейін қосылады.

### Математикалық Негіздеме

Біздің мақсат — орташа есеппен белгісіздікті ең көп азайтатын жорамалдарды таңдау. Ол үшін **Шеннон энтропиясы** қолданылады.

- Құпия сөз \(X\) — ағымдағы **кандидат** жиынындағы кездейсоқ айнымалы, \(|C| = N\). Біртекті жағдайда бастапқы энтропия \(H(X) = \log_2 N\).  
  - Шеннон ақпарт теориясы: [Wikipedia](https://kk.wikipedia.org/wiki/%D0%90%D2%9B%D0%BF%D0%B0%D1%80%D0%B0%D1%82_%D1%82%D0%B5%D0%BE%D1%80%D0%B8%D1%8F%D1%81%D1%8B) / [EN](https://en.wikipedia.org/wiki/Information_theory)
- Белгілі бір жорамал \(g\) үшін Wordle‑дің кері байланысы \(Y\) — **үлгілер** жиынына таралған айнымалы (6 әріп → максимум \(3^6 = 729\) үлгі).  
  - Цифрлар: **0** = сұр, **1** = сары, **2** = жасыл.
- **Күтілетін ақпарат ұтысы** \(I(X;Y) = H(Y)\):  
  \[
    H(Y) = -\sum_{p} P(p)\,\log_2 P(p), \quad
    P(p) = \frac{N_p}{N}
  \]
  мұндағы \(N_p\) — \(g\) жорамалы үшін үлгінің \(p\) шығуына себеп болатын кандидаттар саны.  
  - Энтропия, өзара ақпарат: [EN](https://en.wikipedia.org/wiki/Entropy_(information_theory)), [Mutual information](https://en.wikipedia.org/wiki/Mutual_information).
- Баламалы түрі:  
  \[
    \mathrm{EIG}(g) = \log_2 N - \sum_{p} \frac{N_p}{N}\,\log_2 N_p
  \]

**Детерминистік бағалау ережесі**: екі өтімді әдіс (алдымен жасыл, кейін сары), қайталанатын әріптерге арналған жиілік азайту логикасымен. [Mastermind](https://kk.wikipedia.org/wiki/Mastermind_(%D0%BE%D0%B9%D1%8B%D0%BD)) ойынындағы ұқсас қағидалармен байланысты.

### Архитектура

```
src/
  index.ts                 # CLI (ESM); интерактивті цикл немесе --auto
  config.ts                # константалар (WORD_LENGTH, кэш жолдары)
  types.ts                 # типтер және интерфейстер
  wordlist.ts              # 6 әріпті сөздік (string[])
  pattern.ts               # feedback логикасы + дисктегі кэш
  entropy.ts               # H(Y) есептеу (энтропия)
  solvers/
    BaseSolver.ts          # ортақ көп‑ядролық бағалау
    HardcoreSolver.ts      # жорамал ∈ кандидаттар
    FullEntropySolver.ts   # жорамал ∈ барлық сөздер
  worker/
    entropyWorker.ts       # worker_threads: параллель энтропия
  utils.ts                 # хэш, 3‑тік кодтау, т.б.
cache/
  patterns/                # *.bin қатарлар: әр жорамалға, сөздік хэшіне байланған
```

**Негізгі интерфейстер** (`src/types.ts`):
- `Solver` (`nextGuess(ctx)` → `{ guessIndex, entropy }`)
- `SolverContext` — сөз тізімдері, кандидат индекстері, кэш хэші, т.б.

### Үлгі (pattern) Есептеу және Кэштеу

- **Кодтау**: 6 цифрдан тұратын 3‑тік код (0/1/2) → `[0..728]` бүтін.
- **`feedbackCode(guess, target)`**:  
  1) `target` әріп жиіліктерін санау;  
  2) жасылдарды белгілеу, жиілікті азайту;  
  3) сарыны freq>0 болса белгілеу; жиілікті азайту;  
  4) `[d0..d5]` 3‑тікке жинақтау.
- **Кэш форматы**: **жорамал‑қатары**: ұзындығы `|allWords|` болатын `Uint16Array`, `cache/patterns/<guess>.<dictHash>.bin` файлында. Бұл O(1) қолжетімділік береді және энтропияны санауды жылдамдатады (жиілік гистограммасы).

**Неліктен жорамал бойынша қатарлар?**
- Жады локальдығы және қарапайымдылық: энтропия \(g\) үшін кандидат индекстері бойынша тікелей бір қатарды оқиды.
- Диск құны: әр қатар ~ `2N` байт; толық алдын‑ала есептеу `~2N^2` байтқа дейін барады — сондықтан **сұраныс бойынша** немесе бір рет `--precompute` арқылы жасау ұсынылады.

### Шешушілер (Solver) және Стратегиялар

- **HardcoreSolver** (тек кандидаттар):  
  - Жорамал жиыны \(G = C\).  
  - Артықшылығы: кез келген жорамал — жауап болуы мүмкін.  
  - Кемшілігі: бастапқы айналымдарда ақпарат аздау болуы мүмкін.

- **FullEntropySolver** (барлық сөздер):  
  - Жорамал жиыны \(G = \text{allWords}\).  
  - Артықшылығы: күтілетін ақпарат максимум; “ұқсас сөздер тұзағын” тез бұзады.  
  - Кемшілігі: кейбір жорамалдар ешқашан жауап болмайды (таза ақпарат жинау).

**Стратегия ескертпелері**:
- Энтропия — орташа жағдайды оңтайландырады. Минимакс — ең жаман бөлік өлшемін азайтуға бағытталған альтернатива.
- Гибрид: \(|C|\) үлкен кезде энтропия, азайғанда кандидат‑тек немесе салмақталған `α·entropy + β·isCandidate`.

### CLI Қолданылуы

Орнату және іске қосу:

```bash
pnpm i
# Барлық қатарларды алдын-ала есептеу (міндетті емес)
node --loader ts-node/esm src/index.ts --precompute

# Интерактивті шешу (үлгіні 6 цифрмен енгізесіз)
node --loader ts-node/esm src/index.ts --mode=full
node --loader ts-node/esm src/index.ts --mode=hardcore

# Белгілі құпиямен симуляция
node --loader ts-node/esm src/index.ts --mode=hardcore --auto=planet
```

Параметрлер:
- `--mode=hardcore|full` — шешушіні таңдау
- `--precompute` — барлық қатарларды құрып, шығу
- `--recompute` — файл бар болса да қайта құру
- `--max-workers=8` — worker санын орнату
- `--auto=<word>` — симуляция (feedback автоматты түрде есептеледі)

**Қолмен feedback енгізу**: 6 цифр (мысалы, `120012`), мұнда `0=⬜`, `1=🟨`, `2=🟩`.

### Өнімділік және Көп‑ядролық өңдеу

- Бір жорамалдың энтропиясы — кандидаттар бойынша үлгі гистограммасы: алдын‑ала қатар бар болса \(O(|C|)\).
- Ең жақсы жорамал таңдау \(O(|G|\cdot|C|)\) — біз мұны `worker_threads` арқылы **параллель** орындаймыз.
- Оптимизациялар:
  - Евристикалық алдын ала сүзгі (әріп жиілігі) — \(G\) көлемін азайту.
  - Теориялық шекке жақындаса, ерте тоқтату.
  - Қатарларды бір рет жасап, сөздік хэшімен қайта қолдану.

### Вебке Кеңейту

- `worker_threads` орнына **Web Worker** қолдану.
- Ортақ логика өзгермейді: `feedbackCode`, қатар форматы, энтропия, интерфейстер.
- Пайдаланушы интерфейсін (батырмалар, кандидат тізімі) қосу жеткілікті.

### Пайдаланылған Әдебиеттер

- Шеннон энтропиясы және ақпарат теориясы:  
  - https://kk.wikipedia.org/wiki/%D0%90%D2%9B%D0%BF%D0%B0%D1%80%D0%B0%D1%82_%D1%82%D0%B5%D0%BE%D1%80%D0%B8%D1%8F%D1%81%D1%8B  
  - https://en.wikipedia.org/wiki/Information_theory  
  - https://en.wikipedia.org/wiki/Entropy_(information_theory)  
  - https://en.wikipedia.org/wiki/Mutual_information
- Mastermind/Wordle талдауы:  
  - https://kk.wikipedia.org/wiki/Mastermind_(%D0%BE%D0%B9%D1%8B%D0%BD)  
  - https://en.wikipedia.org/wiki/Mastermind_(board_game)
- Wordle ережелері (қайталанатын әріптерді бағалау):  
  - https://en.wikipedia.org/wiki/Wordle

---

**License**: MIT (or your choice).  
**Authoring**: CMU‑style rigor, type‑safe TS, performance‑first.

