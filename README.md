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
  - [Web Interface](#web-interface)
  - [Web Architecture & Server Actions](#web-architecture--server-actions)
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
  - [Веб Интерфейс](#веб-интерфейс)
  - [Веб Архитектурасы және Сервер Акциялары](#веб-архитектурасы-және-сервер-акциялары)
  - [Үлгі Кэші және Энтропия](#үлгі-кэші-және-энтропия)
  - [Шешушілер](#шешушілер)
  - [Сөздік және Локализация](#сөздік-және-локализация)
  - [Даму Ескертпелері](#даму-ескерпелері)
  - [Пайдаланылған Әдебиеттер](#пайдаланылған-әдебиеттер)

---

## English

### Overview

- pnpm-based monorepo with a reusable solver package (`@wordle/core`) and a Next.js frontend (`@wordle/web`).
- Core package exposes both a CLI (`packages/core/src/cli`) and a library surface (`packages/core/src/lib/index.ts`) for reuse.
- Uses a disk-backed `PatternCache` keyed by the SHA-256 of the active dictionary (generated at build time for the web).
- Includes two entropy-driven strategies: candidate-only and full-word probing.
- Bundles Kazakh six-letter dictionaries (`packages/core/src/lib/validGuesses.ts` and `validSecrets.ts`) by default.
- Supports interactive play, automated simulation, offline precomputation, and a Tailwind-powered web UX suitable for Vercel.

### Mathematical Foundations

We use **Shannon entropy** to pick guesses that reduce uncertainty the most on average.

- Let the secret word be a random variable $X$ over the current **candidate set** $C$, $|C| = N$. If uniform, initial entropy is $H(X) = \log_2 N$.  
  - Shannon, C. E. (1948). *A Mathematical Theory of Communication*. [Wikipedia](https://en.wikipedia.org/wiki/Information_theory)
- For a fixed guess $g$, the Wordle feedback is a random variable $Y$ over the set of **feedback patterns** (for 6 letters, at most $3^6 = 729$).  
  - Pattern digits: **0** = gray, **1** = yellow, **2** = green.
- The **expected information gain (EIG)** of $g$ equals the **mutual information** $I(X;Y) = H(Y)$:  
  $$H(Y) = -\sum_{p} P(p)\,\log_2 P(p), \quad P(p) = \frac{N_p}{N}$$
  where $N_p$ is the number of candidates that would yield pattern $p$ for guess $g$.  
  - Entropy / Mutual information: [Wikipedia](https://en.wikipedia.org/wiki/Entropy_(information_theory)), [Mutual information](https://en.wikipedia.org/wiki/Mutual_information).
- Equivalent form via expected posterior entropy:  
  $$\mathrm{EIG}(g) = \log_2 N - \sum_{p} \frac{N_p}{N}\,\log_2 N_p$$

**Deterministic feedback rule**: two-pass scoring (greens first, then yellows) using remaining letter frequencies to handle duplicates correctly (same as Wordle). See [Mastermind](https://en.wikipedia.org/wiki/Mastermind_(board_game)) for related search principles.

### Project Layout

```
apps/
  web/                     # Next.js 16 app with Tailwind UX
    src/app/               # App Router pages / layouts
      bot/actions.ts       # Server actions for solver computation
    public/cache/patterns/ # build-time cache artifacts (generated)
packages/
  core/
    src/
      cli/                 # CLI entrypoint and game orchestration
      lib/                 # Reusable solver library
        config.ts
        entropy.ts
        pattern.ts
        patternProvider.ts # Pattern provider abstraction
        utils/
          pure.ts          # Browser-safe utilities
          node.ts          # Node-only utilities (fs, crypto)
        solvers/
        types.ts
        validGuesses.ts
        validSecrets.ts
    package.json           # @wordle/core scripts and exports
    tsconfig.json
pnpm-workspace.yaml        # workspace definition (apps/*, packages/*)
tsconfig.base.json         # shared TS compiler settings
package.json               # root scripts orchestrating build pipeline
```

### Installation & Scripts

- `pnpm install` — installs all workspace dependencies (core + web).
- `pnpm run dev` — starts the Next.js UI (`apps/web`) after building `@wordle/core`.
- `pnpm --filter @wordle/core run dev` — runs the CLI in watch mode via `tsx`.
- `pnpm run precompute` — generates pattern cache files into `apps/web/public/cache`.
- `pnpm --filter @wordle/core run precompute -- --cache-dir=./cache` — custom cache location.
- `pnpm run build` — compiles `@wordle/core`, regenerates cache, then builds the Next app.
- `pnpm --filter @wordle/web run build` or `start` for web-only operations.
- When forwarding flags through workspace scripts, prefix CLI args with `--`.

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
pnpm --filter @wordle/core run dev -- --mode=full
pnpm --filter @wordle/core run dev -- --mode=hardcore --auto=абайла
pnpm --filter @wordle/core run precompute -- --cache-dir=.cache --recompute
pnpm --filter @wordle/core run start -- --mode=full --cache-dir=.cache
pnpm --filter @wordle/core run solve
pnpm --filter @wordle/core run solve:full
```

### Веб Интерфейс

- `pnpm run dev` — Tailwind негізіндегі Next.js қосымшасын (App Router) ыстық қайта жүктеумен іске қосады.
- Екі негізгі бет: `/play` (қолмен Wordle ойыны) және `/bot` (энтропия талдауымен шешуші визуализациясы).
- Веб қосымша браузерге қауіпсіз утилиталарды `@wordle/core/browser` арқылы импорттайды; шешуші есептеулері сервер акцияларында орындалады.
- `pnpm run build` — core-ды құрастырып, кэшті `apps/web/public/cache/patterns` ішіне жазады, кейін `next build` орындайды.
- Vercel-де жобаның түбірі ретінде `apps/web` таңдалып, build командасы ретінде `pnpm run build` (репо түбірінен) көрсетіледі; нәтиже `.next` қалтасында.
- Кэш файлдары статикалық активтер, сөздік жаңарғанда хэш өзгеріп, файлдар қайта жасалады.

### Веб Архитектурасы және Сервер Акциялары

Веб қосымша шешуші есептеулерін Node.js серверінде орындау үшін **Next.js Сервер Акцияларын** қолданады, Node-ға арналған API-ларды (`node:fs` және `node:path` сияқты) браузер бандінен шығармайды.

#### Неге Сервер Акциялары?

- **Node-ға арналған тәуелділіктер**: Шешуші алдын ала есептелген үлгі кэш файлдарын оқу үшін файл жүйесіне қол жеткізуді талап етеді. Браузер JavaScript `node:fs`-ке қол жеткізе алмайды, сондықтан шешуші логикасы сервер жағында орындалуы тиіс.
- **Өнімділік**: Сервер акциялары дискке негізделген кэштеумен жылдам энтропия бағалауы үшін толық `@wordle/core` кітапханасына қол жеткізетін Node.js runtime-да орындалады.
- **Таза бөлу**: Клиент компоненттері тек браузерге қауіпсіз утилиталарды (`@wordle/core/browser`) импорттайды, ал сервер акциялары Node API-ларымен толық кітапхананы импорттайды.

#### Браузерге Қауіпсіз Экспорттар

`@wordle/core/browser` entrypoint Node тәуелділіктері жоқ таза функцияларды экспорттайды:

- `VALID_GUESSES`, `VALID_SECRETS`, `WORD_LENGTH` — сөздік константалары
- `feedbackCode(guess, target)` — үлгі есептеуі
- `decodeBase3(code, length)` — үлгі декодтауы
- `createInMemoryPatternProvider(answerWords)` — жадтағы кэш провайдері

Бұларды клиент компоненттерінде Node API-ларды банділеусіз қауіпсіз түрде импорттауға болады.

#### Сервер Акциясының Реализациясы

Бот беті (`/bot`) `apps/web/src/app/bot/actions.ts` орналасқан `computeSuggestions` сервер акциясын қолданады:

1. **Кіру**: Ойын тарихы (жорамалдар + үлгілер) және шешуші режимі (қазір тек hardcore).
2. **Кандидат сүзгілеу**: Ойын тарихын қайта ойнап, `feedbackCode` арқылы кандидат жиынын сүзгілейді.
3. **Үлгі провайдері**: `public/cache/patterns`-ке (құрастыру кезінде алдын ала есептелген) нұсқайтын `PatternCache` данасын жасайды. Кэш каталогы жоқ болса, `createInMemoryPatternProvider`-ге көшеді.
4. **Шешуші орындау**: Сүзілген кандидаттармен `HardcoreSolver`-ді дайындап, энтропия бойынша реттелген топ-K ұсыныстарды есептейді.
5. **Шығу**: Энтропия бағаларымен ұсыныстарды және қалған кандидат санын қайтарады.

Сервер акциясы әрбір сұраныста орындалады, бірақ мынадан пайда алады:
- Алдын ала есептелген үлгі кэш файлдары (жылдам энтропия бағалауы)
- Клиент жағындағы кэштеу (React компоненті тарих сигнатурасы бойынша жауаптарды кэштейді)

#### Клиент Жағындағы Кэштеу

Бот беті компоненті артық сервер шақыруларын болдырмау үшін `(режим, тарих сигнатурасы)` бойынша кілттелген `Map` кэшін сақтайды:

- Бос тарих → кэш кілті тек режим
- Тарихпен → кэш кілті сериализацияланған `guess:pattern` сигнатурасын қамтиды
- Кэштелетін жауаптар серверді күтпей-ақ UI-ді лезде жаңартады

Бұл бұрын есептелген ойын күйлеріне қайта оралғанда лезде кері байланыс береді.

#### Үлгі Кэшін Банділеу

Үлгі кэш файлдары (`public/cache/patterns` ішіндегі `.bin` файлдары):

- **Құрастыру кезінде алдын ала есептеледі** — `pnpm run precompute` арқылы
- **Next.js құрастыруымен банділенеді** — Next.js `public/` ішіндегі барлық нәрсені шығаруға көшіреді
- **Runtime-да қолжетімді** — сервер акциялары оларды `node:fs` API-лары арқылы оқи алады
- **Сөздік хэші бойынша кілттеледі** — кэш файлдары жорамалдар мен жауаптар массивтерінің SHA-256 сигнатурасын (`dictionarySignature(VALID_GUESSES, VALID_SECRETS)`) қамтиды, сондықтан кез келгені өзгерсе автоматты түрде жарамсыз болады

Құрастыру процесі кэш файлдарының әрдайым деплой алдында бар екенін қамтамасыз етеді, сондықтан сервер акциялары production-да есептеуді қайталауға ешқашан қажет емес.

### Web Interface

- `pnpm run dev` launches the Next.js App Router frontend with Tailwind styling and hot reloading.
- Two main pages: `/play` (manual Wordle game) and `/bot` (solver visualization with entropy analysis).
- The web app imports browser-safe utilities from `@wordle/core/browser`; solver computation runs in server actions.
- `pnpm run build` triggers `@wordle/core` compilation, regenerates the cache into `apps/web/public/cache/patterns`, then runs `next build`.
- For Vercel, set the project root to `apps/web`, use `pnpm run build` (executed from repo root) as the build command, and leave the output directory as `.next`.
- Cache files are static build artifacts; they can be served from `public/cache` and invalidate automatically when the combined dictionary hash (`dictionarySignature(VALID_GUESSES, VALID_SECRETS)`) changes.

### Web Architecture & Server Actions

The web application uses **Next.js Server Actions** to execute solver computations on the Node.js server, keeping Node-only APIs (like `node:fs` and `node:path`) out of the browser bundle.

#### Why Server Actions?

- **Node-only dependencies**: The solver requires file system access to read precomputed pattern cache files. Browser JavaScript cannot access `node:fs`, so solver logic must run server-side.
- **Performance**: Server actions execute in a Node.js runtime with access to the full `@wordle/core` library, including disk-backed caching for fast entropy evaluation.
- **Clean separation**: Client components import only browser-safe utilities (`@wordle/core/browser`), while server actions import the full library with Node APIs.

#### Browser-Safe Exports

The `@wordle/core/browser` entrypoint exports pure functions that have no Node dependencies:

- `VALID_GUESSES`, `VALID_SECRETS`, `WORD_LENGTH` — dictionary constants
- `feedbackCode(guess, target)` — pattern computation
- `decodeBase3(code, length)` — pattern decoding
- `createInMemoryPatternProvider(answerWords)` — in-memory cache provider

These can be safely imported in client components without bundling `node:fs` or other Node APIs.

#### Server Action Implementation

The bot page (`/bot`) uses a server action `computeSuggestions` located in `apps/web/src/app/bot/actions.ts`:

1. **Input**: Game history (guesses + patterns) and solver mode (currently hardcore only).
2. **Candidate filtering**: Replays the game history to filter the candidate set using `feedbackCode`.
3. **Pattern provider**: Creates a `PatternCache` instance pointing to `public/cache/patterns` (precomputed at build time). Falls back to `createInMemoryPatternProvider` if cache directory is missing.
4. **Solver execution**: Instantiates `HardcoreSolver` with the filtered candidates and computes top-K suggestions ranked by entropy.
5. **Output**: Returns suggestions with entropy scores and remaining candidate count.

The server action runs on every request, but benefits from:
- Precomputed pattern cache files (fast entropy evaluation)
- Client-side caching (React component caches responses by history signature)

#### Client-Side Caching

The bot page component maintains a `Map` cache keyed by `(mode, history signature)` to avoid redundant server calls:

- Empty history → cache key is just the mode
- With history → cache key includes a serialized `guess:pattern` signature
- Cached responses update the UI instantly without waiting for the server

This provides instant feedback when navigating back to previously computed game states.

#### Pattern Cache Bundling

Pattern cache files (`.bin` files in `public/cache/patterns`) are:

- **Precomputed at build time** via `pnpm run precompute`
- **Bundled with the Next.js build** — Next.js copies everything in `public/` into the output
- **Accessible at runtime** — server actions can read them using `node:fs` APIs
- **Keyed by dictionary hash** — cache files include the SHA-256 signature of both guess and answer lists, so they automatically invalidate when either `VALID_GUESSES` or `VALID_SECRETS` changes

The build process ensures cache files are always present before deployment, so server actions never need to fall back to recomputation in production.

### Pattern Cache & Entropy

- `feedbackCode` performs two-pass Wordle scoring (greens first, then yellows) and encodes the result in base-3 as an integer in `[0, 728]`.
- `PatternCache` stores a `Uint16Array` per guess where `row[targetIndex]` is the feedback code; by default files live at `cache/patterns/<guess>.<dictHash>.bin`.
- The root `pnpm run precompute` script writes the same layout to `apps/web/public/cache/patterns` so the web UI can serve them as static assets.
- **Server actions** read cache files from `public/cache/patterns` at runtime using `node:fs` APIs, providing fast entropy evaluation without recomputation.
- The dictionary signature is `dictionarySignature(VALID_GUESSES, VALID_SECRETS)`, so any change to either list triggers new cache files.
- `entropyForGuess` reuses the cached row to compute Shannon entropy over the remaining candidate indices.
- `pnpm precompute` iterates every allowed word, materialising rows to warm the cache ahead of gameplay or benchmarking.
- `pnpm --filter @wordle/core run validate:dicts` verifies dictionary integrity and runs a smoke test across sample answers.
- `pnpm --filter @wordle/core run clean:patterns` removes stale cache artifacts before regenerating rows.

### Solvers

- **HardcoreSolver**: guesses only within the current candidate subset so every suggestion can be the answer. Currently the only mode available in the web UI.
- **FullEntropySolver**: considers all allowed words, maximising expected information even if some guesses are probes. Available in CLI but temporarily disabled in the web UI.
- Both extend `BaseSolver`, which chunks the guess list and evaluates entropy synchronously (ready for future worker-thread offloading).

### Dictionary & Localization

- `VALID_GUESSES` lives in `src/lib/validGuesses.ts` (≈9k allowed probes).
- `VALID_SECRETS` lives in `src/lib/validSecrets.ts` (≈200 official answers).
- Replace or regenerate these arrays to support another language; keep everything lowercase and length=`WORD_LENGTH`.
- Updating the dictionary requires a rebuild (`pnpm build`) or rerunning the CLI so that caches and the compiled output stay in sync.
- `WORD_LENGTH` is centralised in `src/lib/config.ts`; change with caution and update the dictionary accordingly.

### Development Notes

- Requires Node.js 18+ for the built-in `node:readline/promises` API and stable ESM support.
- `@wordle/core` targets ES2022 with `"moduleResolution": "NodeNext"`; sources live under `packages/core/src`, emitted files land in `packages/core/dist`.
- **Browser/Node code separation**: Utilities are split into `utils/pure.ts` (browser-safe) and `utils/node.ts` (Node-only APIs like `fs`, `crypto`). The `@wordle/core/browser` entrypoint exports only pure functions, ensuring no Node dependencies leak into client bundles.
- **Server actions**: Web app server actions (`apps/web/src/app/bot/actions.ts`) can safely import the full `@wordle/core` library including Node APIs, while client components must use `@wordle/core/browser`.
- Library consumers import from `@wordle/core` (workspace) or from the published `dist/lib/index.js` bundle after building. Browser code should use `@wordle/core/browser` to avoid bundling Node APIs.
- Cache writes are atomic (`writeAtomic`) to avoid truncation on crashes; ensure any custom cache directory is writable.
- Although `maxWorkers` chunks the workload into parallel async tasks, entropy evaluation currently runs on the main thread; wiring an actual worker pool with `worker_threads` is a future improvement.

### References

- Shannon, C. E. (1948). *A Mathematical Theory of Communication*. https://en.wikipedia.org/wiki/Information_theory
- Entropy and mutual information basics: https://en.wikipedia.org/wiki/Entropy_(information_theory)
- Mastermind heuristics and worst-case search: https://en.wikipedia.org/wiki/Mastermind_(board_game)
- Wordle rules and duplicate-handling details: https://en.wikipedia.org/wiki/Wordle

---

## Қазақша

### Шолу

- pnpm жұмыс кеңістігі: шешуші кітапхана (`@wordle/core`) және Next.js фронтендi (`@wordle/web`).
- Негізгі пакетте CLI (`packages/core/src/cli`) және қайта пайдалануға болатын кітапхана интерфейсі (`packages/core/src/lib/index.ts`) бар.
- Әр сөздікке арналған SHA-256 хэш арқылы байланыстыратын дискілік `PatternCache` қолданады.
- Екі энтропиялық стратегия бар: тек кандидаттар және толық сөздер бойынша барлау.
- Әдепкіде `packages/core/src/lib/validGuesses.ts` және `validSecrets.ts` файлдары Kazakh алты әріпті лексикондарын қамтиды (жорамалдар мен жауаптар бөлек).
- Интерактивті ойын, автоматты симуляция, офлайн алдын ала есептеу және Tailwind негізіндегі веб-UX қолжетімді (Vercel-ге дайындауға болады).

### Математикалық Негіздеме

Біздің мақсат — орташа есеппен белгісіздікті ең көп азайтатын жорамалдарды таңдау. Ол үшін **Шеннон энтропиясы** қолданылады.

- Құпия сөз $X$ — ағымдағы **кандидат** жиынындағы кездейсоқ айнымалы, $|C| = N$. Біртекті жағдайда бастапқы энтропия $H(X) = \log_2 N$.  
  - Шеннон ақпарат теориясы: [Wikipedia](https://kk.wikipedia.org/wiki/%D0%90%D2%9B%D0%BF%D0%B0%D1%80%D0%B0%D1%82_%D1%82%D0%B5%D0%BE%D1%80%D0%B8%D1%8F%D1%81%D1%8B) / [EN](https://en.wikipedia.org/wiki/Information_theory)
- Белгілі бір жорамал $g$ үшін Wordle-дің кері байланысы $Y$ — **үлгілер** жиынына таралған айнымалы (6 әріп → максимум $3^6 = 729$ үлгі).  
  - Цифрлар: **0** = сұр, **1** = сары, **2** = жасыл.
- **Күтілетін ақпарат ұтысы** $I(X;Y) = H(Y)$:  
  $$H(Y) = -\sum_{p} P(p)\,\log_2 P(p), \quad P(p) = \frac{N_p}{N}$$
  мұндағы $N_p$ — $g$ жорамалы үшін үлгінің $p$ шығуына себеп болатын кандидаттар саны.  
  - Энтропия, өзара ақпарат: [EN](https://en.wikipedia.org/wiki/Entropy_(information_theory)), [Mutual information](https://en.wikipedia.org/wiki/Mutual_information).
- Баламалы түрі:  
  $$\mathrm{EIG}(g) = \log_2 N - \sum_{p} \frac{N_p}{N}\,\log_2 N_p$$

**Детерминистік бағалау ережесі**: екі өтімді әдіс (алдымен жасыл, кейін сары), қайталанатын әріптерге арналған жиілік азайту логикасымен. [Mastermind](https://kk.wikipedia.org/wiki/Mastermind_(%D0%BE%D0%B9%D1%8B%D0%BD)) ойынындағы ұқсас қағидалармен байланысты.

### Жоба Құрылымы

```
apps/
  web/                    # Next.js 16 қосымшасы, Tailwind UI
    src/app/              # App Router беттері мен layout-тары
      bot/actions.ts      # Сервер акциялары, шешуші есептеулері үшін
    public/cache/patterns # құрастыру кезінде жазылатын кэш
packages/
  core/
    src/
      cli/                # CLI логикасы және ойын ағыны
      lib/                # Қайта пайдалануға болатын шешуші кітапхана
        config.ts
        entropy.ts
        pattern.ts
        patternProvider.ts # Үлгі провайдер абстракциясы
        utils/
          pure.ts         # Браузерге қауіпсіз утилиталар
          node.ts         # Тек Node үшін утилиталар (fs, crypto)
        solvers/
        types.ts
        validGuesses.ts
        validSecrets.ts
    package.json          # @wordle/core скрипттері және экспорттары
    tsconfig.json
pnpm-workspace.yaml       # workspace анықтамасы (apps/*, packages/*)
tsconfig.base.json        # ортақ TypeScript баптаулары
package.json              # түбір скрипттері, құрастыру конвейері
```

### Орнату және Скрипттер

- `pnpm install` — workspace ішіндегі барлық тәуелділіктерді орнатады (core + web).
- `pnpm run dev` — `@wordle/core` жинақтап, Next.js Dev серверін іске қосады.
- `pnpm --filter @wordle/core run dev` — CLI-ді watch режимінде (`tsx`) жүргізеді.
- `pnpm run precompute` — веб қосымшаға арналған кэшті `apps/web/public/cache` ішіне жазады.
- `pnpm --filter @wordle/core run precompute -- --cache-dir=./cache` — кэш жолын пайдаланушы қылып көрсету.
- `pnpm run build` — core-ды құрастырады, кэшті жаңартады, содан кейін Next.js production build жасайды.
- `pnpm --filter @wordle/web run build` немесе `start` — веб бөлігіне арналған жеке скрипттер.
- Скрипттер арқылы аргумент өткізу үшін `--` қойыңыз: `pnpm --filter @wordle/core run dev -- --mode=full`.

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
pnpm --filter @wordle/core run dev -- --mode=full
pnpm --filter @wordle/core run dev -- --mode=hardcore --auto=абайла
pnpm --filter @wordle/core run precompute -- --cache-dir=.cache --recompute
pnpm --filter @wordle/core run start -- --mode=full --cache-dir=.cache
pnpm --filter @wordle/core run solve
pnpm --filter @wordle/core run solve:full
```

### Үлгі Кэші және Энтропия

- `feedbackCode` Wordle ережесі бойынша екі өтімді бағалау жасайды (алдымен жасыл, кейін сары) және нәтижені `[0, 728]` диапазонында 3-тік кодқа айналдырады.
- `PatternCache` әр жорамал үшін `Uint16Array` қатарын сақтайды; `row[targetIndex]` — сол мақсатқа арналған код. Әдепкі файлдар `cache/patterns/<guess>.<dictHash>.bin` ретінде жазылады.
- Түбірдегі `pnpm run precompute` скрипті дәл осы құрылымды `apps/web/public/cache/patterns` ішіне көшіреді, сондықтан веб қосымша дайын файлдарды статикалық түрде бере алады.
- **Сервер акциялары** runtime-да `node:fs` API-лары арқылы `public/cache/patterns` ішінен кэш файлдарын оқиды, есептеуді қайталамай-ақ жылдам энтропия бағалауын қамтамасыз етеді.
- Сөздік сигнатурасы `dictionarySignature(VALID_GUESSES, VALID_SECRETS)`; осы тізімдердің кез келгені өзгерсе, кэш автоматты түрде жаңадан құрылады.
- `entropyForGuess` дайын қатарды қолданып, қалған кандидаттар бойынша Шеннон энтропиясын есептейді.
- `pnpm precompute` барлық қатарды алдын ала құрып, кейінгі ойындарды және тесттерді жеделдетеді.
- `pnpm --filter @wordle/core run validate:dicts` сөздік тұтастығын тексеріп, бірнеше жауапқа smoke-тест жүргізеді.
- `pnpm --filter @wordle/core run clean:patterns` кэш директорияларын тазартып, жаңадан генерациялауға дайындайды.

### Шешушілер

- **HardcoreSolver**: тек ағымдағы кандидаттар ішінен жорамалдайды, сондықтан әр ұсыныс нақты жауап болуы мүмкін. Қазір веб UI-де қолжетімді жалғыз режим.
- **FullEntropySolver**: барлық рұқсат етілген сөздермен жұмыс істейді, күтілетін ақпаратты максималдау үшін зерттеу жорамалдарын пайдаланады. CLI-де қолжетімді, бірақ веб UI-де уақытша өшірілген.
- Екі класс та `BaseSolver`-ді кеңейтеді; қазіргі нұсқа чанктерді синхронды орындаса да, архитектура болашақта worker thread енгізуге дайын.

### Сөздік және Локализация

- `VALID_GUESSES` массиві `src/lib/validGuesses.ts` ішінде, ал `VALID_SECRETS` `src/lib/validSecrets.ts` ішінде орналасқан (Kazakh алты әріпті сөздер).
- Басқа тілге көшу үшін осы массивті ауыстырыңыз немесе генерациялаңыз; барлық сөздер кіші әріппен жазылып, ұзындығы `WORD_LENGTH` болуы тиіс.
- Сөздік жаңартылғаннан кейін CLI-ді қайта қосып немесе `pnpm build` жасап, кэш пен компиляцияланған файлдарды жаңартыңыз.
- `WORD_LENGTH` мәні `src/lib/config.ts` ішінде; өзгертсеңіз, барлық модульдер мен сөздікпен үйлестіру қажет.

### Даму Ескертпелері

- Node.js 18+ нұсқасы керек (`node:readline/promises` API және тұрақты ESM үшін).
- `@wordle/core` ES2022-ге бағытталған, `"moduleResolution": "NodeNext"`; бастапқы код `packages/core/src`, жинақ нәтижесі `packages/core/dist` ішінде.
- **Браузер/Node код бөлуі**: Утилиталар `utils/pure.ts` (браузерге қауіпсіз) және `utils/node.ts` (`fs`, `crypto` сияқты Node-ға арналған API-лар) болып бөлінген. `@wordle/core/browser` entrypoint тек таза функцияларды экспорттайды, Node тәуелділіктерінің клиент банділеріне енуін болдырмайды.
- **Сервер акциялары**: Веб қосымша сервер акциялары (`apps/web/src/app/bot/actions.ts`) Node API-ларын қоса алғанда толық `@wordle/core` кітапханасын қауіпсіз түрде импорттай алады, ал клиент компоненттері `@wordle/core/browser`-ді пайдалануы тиіс.
- Кітапхананы workspace ішінде `@wordle/core` атауымен немесе build-тен кейін `dist/lib/index.js` арқылы импорттауға болады. Браузер коды Node API-ларды банділеуден аулақ болу үшін `@wordle/core/browser`-ді пайдалануы тиіс.
- Кэш жазбалары атомарлы (`writeAtomic`), сондықтан кез келген реттелген каталогтың жазуға рұқсаты барын тексеріңіз.
- `maxWorkers` жұмысты параллель асинхронды чанктерге бөлсе де, есептеу қазіргі уақытта негізгі ағында орындалады; болашақта `worker_threads` арқылы нағыз worker пулын қосу жоспарланған.

### Пайдаланылған Әдебиеттер

- Shannon энтропиясы: https://kk.wikipedia.org/wiki/%D0%90%D2%9B%D0%BF%D0%B0%D1%80%D0%B0%D1%82_%D1%82%D0%B5%D0%BE%D1%80%D0%B8%D1%8F%D1%81%D1%8B
- Ақпарат теориясы (EN): https://en.wikipedia.org/wiki/Information_theory
- Энтропия негіздері: https://en.wikipedia.org/wiki/Entropy_(information_theory)
- Mastermind талдауы: https://en.wikipedia.org/wiki/Mastermind_(board_game)
- Wordle ережелері: https://en.wikipedia.org/wiki/Wordle

---

**License**: MIT (немесе қалауыңызша).  
**Authoring**: Түрлі ортада қолдануға дайын, типтік қауіпсіз TypeScript код базасы.
