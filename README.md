# Wordle(6) Entropy Solver — Bilingual README (English / Қазақша)

> Type-safe Wordle(6) entropy solver for the Kazakh lexicon, delivered as a Node.js ESM CLI and reusable TS library with a disk-backed feedback cache.

---

## Contents / Мазмұны

- [English](#english)
  - [Overview](#overview)
  - [Mathematical Foundations](#mathematical-foundations)
  - [Project Layout](#project-layout)
  - [Installation & Scripts](#installation--scripts)
  - [CLI Usage](#cli-usage)
  - [Pattern Cache & Entropy](#pattern-cache--entropy)
  - [Solvers](#solvers)
  - [Dictionary & Localization](#dictionary--localization)
  - [Development Notes](#development-notes)
  - [References](#references)
- [Қазақша](#қазақша)
  - [Шолу](#шолу)
  - [Математикалық Негіздеме](#математикалық-негіздеме)
  - [Жоба Құрылымы](#жоба-құрылымы)
  - [Орнату және Скрипттер](#орнату-және-скрипттер)
  - [CLI Қолданылуы](#cli-қолданылуы)
  - [Үлгі Кэші және Энтропия](#үлгі-кэші-және-энтропия)
  - [Шешушілер](#шешушілер)
  - [Сөздік және Локализация](#сөздік-және-локализация)
  - [Даму Ескертпелері](#даму-ескерпелері)
  - [Пайдаланылған Әдебиеттер](#пайдаланылған-әдебиеттер)

---

## English

### Overview

- NodeNext ESM TypeScript project targeting six-letter Wordle puzzles.
- Ships both a CLI (`src/cli`) and a library surface (`src/lib/index.ts`) for reuse.
- Uses a disk-backed `PatternCache` keyed by the SHA-256 of the active dictionary.
- Includes two entropy-driven strategies: candidate-only and full-word probing.
- Bundles a Kazakh six-letter dictionary (`src/lib/wordlist.ts`) by default.
- Supports interactive play, automated simulation, and offline precomputation.

### Mathematical Foundations

We use **Shannon entropy** to pick guesses that reduce uncertainty the most on average.

- Let the secret word be a random variable $X$ over the current **candidate set** $C$, $|C| = N$. If uniform, initial entropy is $H(X) = \log_2 N$.  
  - Shannon, C. E. (1948). *A Mathematical Theory of Communication*. [Wikipedia](https://en.wikipedia.org/wiki/Information_theory)
- For a fixed guess $g$, the Wordle feedback is a random variable $Y$ over the set of **feedback patterns** (for 6 letters, at most $3^6 = 729$).  
  - Pattern digits: **0** = gray, **1** = yellow, **2** = green.
- The **expected information gain (EIG)** of $g$ equals the **mutual information** $I(X;Y) = H(Y)$:  
  $$
  H(Y) = -\sum_{p} P(p)\,\log_2 P(p), \quad
  P(p) = \frac{N_p}{N}
  $$
  where $N_p$ is the number of candidates that would yield pattern $p$ for guess $g$.  
  - Entropy / Mutual information: [Wikipedia](https://en.wikipedia.org/wiki/Entropy_(information_theory)), [Mutual information](https://en.wikipedia.org/wiki/Mutual_information).
- Equivalent form via expected posterior entropy:  
  $$
  \mathrm{EIG}(g) = \log_2 N - \sum_{p} \frac{N_p}{N}\,\log_2 N_p
  $$

**Deterministic feedback rule**: two-pass scoring (greens first, then yellows) using remaining letter frequencies to handle duplicates correctly (same as Wordle). See [Mastermind](https://en.wikipedia.org/wiki/Mastermind_(board_game)) for related search principles.

### Project Layout

```
src/
  cli/
    args.ts          # parses --mode, --precompute, --cache-dir, ...
    game.ts          # interactive loop, auto simulation, precompute helper
    index.ts         # CLI entrypoint with shebang
  lib/
    config.ts        # WORD_LENGTH, default cache paths
    entropy.ts       # Shannon entropy helpers operating on pattern rows
    index.ts         # library barrel (public exports)
    pattern.ts       # feedbackCode + PatternCache (Uint16 rows on disk)
    solvers/
      BaseSolver.ts        # shared evaluation logic with chunked execution
      HardcoreSolver.ts    # guesses restricted to current candidates
      FullEntropySolver.ts # guesses across the full allowed list
    types.ts         # SolverContext, PatternCode, GuessEval interfaces
    utils.ts         # hashing, base-3 encoding, human-readable patterns
    wordlist.ts      # six-letter Kazakh dictionary (WORDS array)
cache/
  patterns/          # created on demand; stores <guess>.<dictHash>.bin rows
tsconfig.json        # ES2022 target, NodeNext module resolver, src rootDir
package.json         # scripts (dev/solve/precompute) and ESM exports
```

### Installation & Scripts

- `pnpm install` (or `npm install` / `yarn` if you prefer).
- `pnpm dev -- --mode=hardcore` runs the TypeScript CLI via `tsx`.
- `pnpm solve` uses hardcore mode; `pnpm solve:full` uses full entropy mode.
- `pnpm precompute` walks the dictionary and saves every pattern row to disk.
- `pnpm build` emits `dist/`; `pnpm start` executes the compiled CLI.
- When forwarding flags through package scripts, prefix CLI args with `--`.

### CLI Usage

- `--mode=hardcore|full` picks the solver (default `hardcore`).
- `--precompute` generates all `{guess × target}` rows and exits.
- `--recompute` forces regeneration even if a cached row already exists.
- `--auto=<word>` simulates against a known answer from the dictionary.
- `--cache-dir=<path>` overrides the root cache directory (default `cache`).
- `--max-workers=<n>` splits the guess set into `n` async chunks (default autodetect clamped to CPU count; currently executes on the main thread).
- Manual feedback input expects a six-digit string of `0` (⬜), `1` (🟨), `2` (🟩).

Examples:

```bash
pnpm dev -- --mode=full
pnpm dev -- --mode=hardcore --auto=абайла
pnpm precompute -- --cache-dir=.cache --recompute
pnpm start -- --mode=full --cache-dir=.cache
pnpm solve        # uses hardcore mode
pnpm solve:full   # uses full entropy mode
```

### Pattern Cache & Entropy

- `feedbackCode` performs two-pass Wordle scoring (greens first, then yellows) and encodes the result in base-3 as an integer in `[0, 728]`.
- `PatternCache` stores a `Uint16Array` per guess where `row[targetIndex]` is the feedback code; files live at `cache/patterns/<guess>.<dictHash>.bin`.
- The dictionary signature is `sha256(JSON.stringify({ len, words }))`, so any change to `WORDS` triggers new cache files.
- `entropyForGuess` reuses the cached row to compute Shannon entropy over the remaining candidate indices.
- `pnpm precompute` iterates every allowed word, materialising rows to warm the cache ahead of gameplay or benchmarking.

### Solvers

- **HardcoreSolver**: guesses only within the current candidate subset so every suggestion can be the answer.
- **FullEntropySolver**: considers all allowed words, maximising expected information even if some guesses are probes.
- Both extend `BaseSolver`, which chunks the guess list and evaluates entropy synchronously (ready for future worker-thread offloading).

### Dictionary & Localization

- `WORDS` lives in `src/lib/wordlist.ts` and currently contains a Kazakh six-letter lexicon.
- Replace or regenerate this array to support another language; keep everything lowercase and length=`WORD_LENGTH`.
- Updating the dictionary requires a rebuild (`pnpm build`) or rerunning the CLI so that caches and the compiled output stay in sync.
- `WORD_LENGTH` is centralised in `src/lib/config.ts`; change with caution and update the dictionary accordingly.

### Development Notes

- Requires Node.js 18+ for the built-in `node:readline/promises` API and stable ESM support.
- TypeScript compiler targets ES2022 with `"moduleResolution": "NodeNext"`; source lives under `src`, emitted files land in `dist`.
- Library consumers can import from `kaz-wordle6-solver/lib` after building (`package.json` exports both JS and `.d.ts` bundles).
- Cache writes are atomic (`writeAtomic`) to avoid truncation on crashes; ensure the cache directory is writable.
- Although `maxWorkers` chunks the workload into parallel async tasks, entropy evaluation currently runs on the main thread; wiring an actual worker pool with `worker_threads` is a future improvement.

### References

- Shannon, C. E. (1948). *A Mathematical Theory of Communication*. https://en.wikipedia.org/wiki/Information_theory
- Entropy and mutual information basics: https://en.wikipedia.org/wiki/Entropy_(information_theory)
- Mastermind heuristics and worst-case search: https://en.wikipedia.org/wiki/Mastermind_(board_game)
- Wordle rules and duplicate-handling details: https://en.wikipedia.org/wiki/Wordle

---

## Қазақша

### Шолу

- NodeNext ESM пішіміндегі TypeScript жобасы алты әріпті Wordle есептеріне бағытталған.
- CLI (`src/cli`) және қайта пайдалануға болатын кітапхана интерфейсі (`src/lib/index.ts`) бірге жеткізіледі.
- Әр сөздікке арналған SHA-256 хэш арқылы байланыстыратын дискілік `PatternCache` қолданады.
- Екі энтропиялық стратегия бар: тек кандидаттар және толық сөздер бойынша барлау.
- Әдепкіде `src/lib/wordlist.ts` файлы Kazakh алты әріпті сөздігін қамтиды.
- Интерактивті ойын, автоматты симуляция және офлайн алдын ала есептеу қолжетімді.

### Математикалық Негіздеме

Біздің мақсат — орташа есеппен белгісіздікті ең көп азайтатын жорамалдарды таңдау. Ол үшін **Шеннон энтропиясы** қолданылады.

- Құпия сөз $X$ — ағымдағы **кандидат** жиынындағы кездейсоқ айнымалы, $|C| = N$. Біртекті жағдайда бастапқы энтропия $H(X) = \log_2 N$.  
  - Шеннон ақпарат теориясы: [Wikipedia](https://kk.wikipedia.org/wiki/%D0%90%D2%9B%D0%BF%D0%B0%D1%80%D0%B0%D1%82_%D1%82%D0%B5%D0%BE%D1%80%D0%B8%D1%8F%D1%81%D1%8B) / [EN](https://en.wikipedia.org/wiki/Information_theory)
- Белгілі бір жорамал $g$ үшін Wordle-дің кері байланысы $Y$ — **үлгілер** жиынына таралған айнымалы (6 әріп → максимум $3^6 = 729$ үлгі).  
  - Цифрлар: **0** = сұр, **1** = сары, **2** = жасыл.
- **Күтілетін ақпарат ұтысы** $I(X;Y) = H(Y)$:  
  $$
  H(Y) = -\sum_{p} P(p)\,\log_2 P(p), \quad
  P(p) = \frac{N_p}{N}
  $$
  мұндағы $N_p$ — $g$ жорамалы үшін үлгінің $p$ шығуына себеп болатын кандидаттар саны.  
  - Энтропия, өзара ақпарат: [EN](https://en.wikipedia.org/wiki/Entropy_(information_theory)), [Mutual information](https://en.wikipedia.org/wiki/Mutual_information).
- Баламалы түрі:  
  $$
  \mathrm{EIG}(g) = \log_2 N - \sum_{p} \frac{N_p}{N}\,\log_2 N_p
  $$

**Детерминистік бағалау ережесі**: екі өтімді әдіс (алдымен жасыл, кейін сары), қайталанатын әріптерге арналған жиілік азайту логикасымен. [Mastermind](https://kk.wikipedia.org/wiki/Mastermind_(%D0%BE%D0%B9%D1%8B%D0%BD)) ойынындағы ұқсас қағидалармен байланысты.

### Жоба Құрылымы

```
src/
  cli/
    args.ts          # --mode, --precompute, --cache-dir жалаушаларын талдау
    game.ts          # интерактивті цикл, авто режим, алдын ала есептеу
    index.ts         # CLI кіру нүктесі (shebang)
  lib/
    config.ts        # WORD_LENGTH, әдепкі кэш жолдары
    entropy.ts       # үлгі қатарларымен жұмыс істейтін Шеннон энтропиясы
    index.ts         # кітапхана экспорттары
    pattern.ts       # feedbackCode + PatternCache (Uint16 қатарлары)
    solvers/
      BaseSolver.ts        # ортақ бағалау логикасы (чанктерге бөлу)
      HardcoreSolver.ts    # тек кандидаттардан жорамалдайды
      FullEntropySolver.ts # барлық сөздерден жорамал жасайды
    types.ts         # SolverContext, PatternCode, GuessEval интерфейстері
    utils.ts         # хэштеу, 3-тік кодтау, адамға түсінікті үлгі
    wordlist.ts      # Kazakh алты әріпті сөздік (WORDS массиві)
cache/
  patterns/          # сұраныс бойынша жасалады; <guess>.<dictHash>.bin файлдары
tsconfig.json        # ES2022 нысана, NodeNext модуль рұқсаты, src түбірі
package.json         # скрипттер (dev/solve/precompute) және ESM экспорттары
```

### Орнату және Скрипттер

- `pnpm install` (немесе `npm install` / `yarn` пайдаланыңыз).
- `pnpm dev -- --mode=hardcore` CLI-ді `tsx` арқылы TypeScript күйінде іске қосады.
- `pnpm solve` hardcore режимін, `pnpm solve:full` толық энтропия режимін қолданады.
- `pnpm precompute` барлық үлгі қатарларын алдын ала есептеп, дискіге жазады.
- `pnpm build` → `dist/`, `pnpm start` → құрастырылған CLI-ді іске қосу.
- Пакет скрипттері арқылы аргумент жібергенде `--` қойып, одан кейін CLI жалаушаларын жазыңыз.

### CLI Қолданылуы

- `--mode=hardcore|full` шешушіні таңдайды (әдепкі `hardcore`).
- `--precompute` барлық `{guess × target}` қатарларын жасап, бағдарламаны тоқтатады.
- `--recompute` файл бар болса да қайта генерация жасайды.
- `--auto=<word>` сөздікке кіретін белгілі құпиямен симуляция жүргізеді.
- `--cache-dir=<path>` кэш түбірін ауыстырады (әдепкі `cache`).
- `--max-workers=<n>` жорамал жиынын `n` асинхронды чанктерге бөледі (әдепкі CPU санына дейін; ағымдағы нұсқада есептеу негізгі ағынға жүктеледі).
- Қолмен feedback енгізгенде `0` (⬜), `1` (🟨), `2` (🟩) цифрларынан тұратын алты таңбалы жол күтіледі.

Мысалдар:

```bash
pnpm dev -- --mode=full
pnpm dev -- --mode=hardcore --auto=абайла
pnpm precompute -- --cache-dir=.cache --recompute
pnpm start -- --mode=full --cache-dir=.cache
pnpm solve        # hardcore режимін қолданады
pnpm solve:full   # толық энтропия режимін қолданады
```

### Үлгі Кэші және Энтропия

- `feedbackCode` Wordle ережесі бойынша екі өтімді бағалау жасайды (алдымен жасыл, кейін сары) және нәтижені `[0, 728]` диапазонында 3-тік кодқа айналдырады.
- `PatternCache` әр жорамал үшін `Uint16Array` қатарын сақтайды; `row[targetIndex]` — сол мақсатқа арналған код. Файлдар `cache/patterns/<guess>.<dictHash>.bin` түрінде жазылады.
- Сөздік сигнатурасы `sha256(JSON.stringify({ len, words }))`; `WORDS` өзгерсе, кэш автоматты түрде жаңадан құрылады.
- `entropyForGuess` дайын қатарды қолданып, қалған кандидаттар бойынша Шеннон энтропиясын есептейді.
- `pnpm precompute` барлық қатарды алдын ала құрып, кейінгі ойындарды және тесттерді жеделдетеді.

### Шешушілер

- **HardcoreSolver**: тек ағымдағы кандидаттар ішінен жорамалдайды, сондықтан әр ұсыныс нақты жауап болуы мүмкін.
- **FullEntropySolver**: барлық рұқсат етілген сөздермен жұмыс істейді, күтілетін ақпаратты максималдау үшін зерттеу жорамалдарын пайдаланады.
- Екі класс та `BaseSolver`-ді кеңейтеді; қазіргі нұсқа чанктерді синхронды орындаса да, архитектура болашақта worker thread енгізуге дайын.

### Сөздік және Локализация

- `WORDS` массиві `src/lib/wordlist.ts` ішінде орналасқан, қазір Kazakh алты әріпті сөздері енгізілген.
- Басқа тілге көшу үшін осы массивті ауыстырыңыз немесе генерациялаңыз; барлық сөздер кіші әріппен жазылып, ұзындығы `WORD_LENGTH` болуы тиіс.
- Сөздік жаңартылғаннан кейін CLI-ді қайта қосып немесе `pnpm build` жасап, кэш пен компиляцияланған файлдарды жаңартыңыз.
- `WORD_LENGTH` мәні `src/lib/config.ts` ішінде; өзгертсеңіз, барлық модульдер мен сөздікпен үйлестіру қажет.

### Даму Ескертпелері

- Node.js 18+ нұсқасы керек (`node:readline/promises` API және тұрақты ESM үшін).
- TypeScript компиляторы ES2022-ге бағытталған; бастапқы код `src/` ішінде, нәтижесі `dist/` қалтасына шығады.
- Құрастырғаннан кейін кітапхананы `kaz-wordle6-solver/lib` атауымен импорттауға болады (`package.json` JS және `.d.ts` экспорттарын береді).
- Кэш жазбалары атомарлы (`writeAtomic`), сондықтан каталогтың жазуға рұқсаты барын тексеріңіз.
- `maxWorkers` жұмысты параллель асинхронды тапсырмаларға бөлсе де, энтропия бағалауы қазіргі уақытта негізгі ағында орындалады; `worker_threads` арқылы шынайы worker пулын қосу болашақта жоспарлануда.

### Пайдаланылған Әдебиеттер

- Shannon энтропиясы: https://kk.wikipedia.org/wiki/%D0%90%D2%9B%D0%BF%D0%B0%D1%80%D0%B0%D1%82_%D1%82%D0%B5%D0%BE%D1%80%D0%B8%D1%8F%D1%81%D1%8B
- Ақпарат теориясы (EN): https://en.wikipedia.org/wiki/Information_theory
- Энтропия негіздері: https://en.wikipedia.org/wiki/Entropy_(information_theory)
- Mastermind талдауы: https://en.wikipedia.org/wiki/Mastermind_(board_game)
- Wordle ережелері: https://en.wikipedia.org/wiki/Wordle

---

**License**: MIT (немесе қалауыңызша).  
**Authoring**: Түрлі ортада қолдануға дайын, типтік қауіпсіз TypeScript код базасы.
