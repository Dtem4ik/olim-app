# Olim App — план в 10 фаз (исполнение через сессии Claude)

Дата: 10 июля 2026.
Продукт: приложение адаптации новых репатриантов в Израиле — персональная главная («твоя ситуация»), разделы-гайды (банки, аренда, медицина, работа, льготы, иврит…), трекер «мой план», поиск (позже ИИ), RU/EN, светлая/тёмная тема, PWA → сторы через Capacitor.
Стек: Next.js (App Router, TS strict) + Vercel · Supabase (Postgres, Auth, pgvector) · FastAPI — только там, где указано · Tailwind + shadcn/ui · Lucide icons.

---

## Протокол работы по фазам (мультисессия)

Каждая фаза выполняется в отдельной сессии Claude Code. Правила:

1. **Кикофф.** Сессия фазы получает: промпт фазы (из этого документа) + доступ к репо + `docs/PHASE_REPORTS/phase-{N-1}.md` предыдущей фазы.
2. **Финиш.** Сессия обязана завершить фазу файлом `docs/PHASE_REPORTS/phase-{N}.md`: что сделано, что отложено и почему, известные долги, скриншоты/линки превью, команды проверки.
3. **Приёмка.** Ты приносишь репорт тимлиду (мне, в этот чат). Я проверяю по чек-листу приёмки фазы, даю вердикт (принято / доработка со списком) и выдаю промпт следующей фазы, скорректированный по факту.
4. **Жёсткое правило скоупа.** Сессия не делает ничего из будущих фаз, даже если «удобно сейчас». Расползание скоупа — главная причина смерти проектов.
5. В репо живут: `docs/ROADMAP.md` (английская версия этого плана — Фаза 1 создаёт её при старте, этот русский файл остаётся твоим справочником), `docs/ARCHITECTURE.md`, `docs/CONTENT_SCHEMA.md`, `CLAUDE.md` (инструкции для сессий: стандарты, команды, запреты).

## Инженерные стандарты (действуют во всех фазах)

- **TypeScript strict**, `noUncheckedIndexedAccess`, без `any` (CI падает).
- **Линт/формат:** Biome. **Хуки:** lefthook (pre-commit: lint+typecheck staged; commit-msg: commitlint).
- **Conventional Commits** (`feat:`, `fix:`, `chore:`…), ветки `phase-N/*`, PR в main с зелёным CI.
- **Тесты:** Vitest (юнит: вся логика — cond-движок, форматтеры, хуки; порог 80% на `lib/`), Playwright (e2e смоуки ключевых флоу каждой фазы), Testing Library для компонентов.
- **A11y:** eslint-plugin-jsx-a11y + axe в Playwright (0 critical/serious); фокус-стейты, aria, контраст в обеих темах; тап-таргеты ≥44px.
- **Перформанс-бюджеты (CI, Lighthouse mobile):** Performance ≥90, A11y ≥95, LCP <2.5s на 4G, JS first load <170KB на страницу. Проверка на каждой фазе, не в конце.
- **i18n:** next-intl с Фазы 1; ни одной строки в JSX хардкодом — только словари (RU сейчас, EN — заполняется позже, ключи сразу).
- **Темы:** семантические токены (`bg-surface`, `text-primary`…) через CSS-переменные; тёмная — `prefers-color-scheme` + ручной переключатель; захардкоженный цвет в компоненте = блокер ревью.
- **Ошибки/аналитика:** Sentry + PostHog события с Фазы 4 (`quiz_completed`, `step_done`, `plan_shared`, `search_performed`, `report_outdated`).
- **Контент = данные:** тексты шагов только в Supabase/JSON по схеме, никогда в компонентах. У каждого шага `source_url`, `last_verified_at`.
- **Безопасность:** RLS на всех таблицах с юзер-данными; анонимные share-slug — неугадываемые (nanoid ≥12).
- **Языковая политика:** всё в репозитории — на английском: код, комментарии, коммиты, PR, документация, phase-репорты, названия веток. Промпты фаз — на английском. Общение сессии с тобой в чате — на русском. Пользовательский контент продукта (тексты шагов, словари UI) — RU/EN по схеме i18n, это данные, не код.

---

## Фазы

### Фаза 1 — фундамент репозитория
**1a. Скелет и тулинг.** Next (App Router, TS strict), Tailwind, Biome, lefthook, commitlint, Vitest, Playwright, GitHub Actions (lint → typecheck → unit → build → e2e smoke → lighthouse-ci), деплой на Vercel (preview на PR). `CLAUDE.md` со стандартами и командами.
**1b. Дизайн-токены и темы.** Палитра light/dark, семантические токены, типографика (мин 14px), спейсинги, радиусы; переключатель темы; шрифт с кириллицей и латиницей (Inter/Golos). Демо-страница токенов.
**1c. UI-кит v1.** shadcn/ui + свои: `SectionTile`, `StepCard`, `ChecklistItem`, `DeadlineBadge`, `SearchBar`, `BottomNav`, `EmptyState`. Каждый — стори-страница (`/dev/ui`), тесты рендера, axe-чистота в обеих темах.
**DoD:** CI зелёный, скелет задеплоен, `/dev/ui` показывает все компоненты в двух темах, Lighthouse ≥90/95 на пустой главной.
**Приёмка тимлида:** прогон CI, скрин `/dev/ui` в обеих темах, коммит-история conventional, отсутствие хардкод-цветов (grep).

### Фаза 2 — модель данных и контент-пайплайн
**2a. Схема Supabase.** Таблицы: `sections`, `steps` (title, body_md, docs jsonb, warn_rule jsonb, tips jsonb, cond jsonb, source_url, last_verified_at), `benefits` (таблицы сумм с датами), `plans` (share_slug, answers, done_ids, user_id null), `step_reports`. Миграции в репо (supabase CLI), zod-схемы зеркалом, генерация типов.
**2b. Контент-пайплайн.** JSON-формат контента + валидатор (zod) + сид-скрипт `pnpm content:import`; линт контента: обязательные source_url, длина, запрещённые фразы («гарантируем»); отчёт о битых ссылках.
**2c. Контент v1 — «после приземления».** Разделы: банки и деньги, аренда, купат холим/медицина, работа, льготы олим (суммы 2026 из benefits!), транспорт, связь, иврит/ульпан. 60–90 шагов. Черновики генерятся Claude-сессией по источникам (gov.il, Кол Зхут, Натив), человек-редактор проходит списком.
**DoD:** сид наполняет базу одной командой; контент проходит валидатор; каждая запись с источником и датой проверки.
**Приёмка:** случайная выборка 10 шагов — проверка источников; прогон импорта с нуля.

### Фаза 3 — онбординг и движок персонализации
**3a. Квиз.** 5–7 вопросов: статус (готовлюсь / только приехал / N месяцев здесь), право, страна выезда, состав семьи (возрасты детей), питомец, город. Прогресс, «изменить ответы» позже.
**3b. Cond-движок.** Чистая функция `buildPlan(answers, steps) → PersonalPlan` (фильтрация по cond jsonb, сортировка по этапам, расчёт warn: «горит срок» из warn_rule + дат пользователя). **Покрытие тестами 100%** — это ядро продукта. Профиль в localStorage (без аккаунтов).
**DoD:** разные ответы дают ощутимо разные планы (снэпшот-тесты кейсов: одиночка/семья/питомец/уже здесь 3 месяца).
**Приёмка:** таблица «ответы → размер плана → уникальные шаги» по 6 эталонным персонам.

### Фаза 4 — главная и разделы
**4a. Главная «твоя ситуация».** Приветствие с контекстом (месяц в стране, город), блок «горит срок», «следующие 3 шага», сетка разделов. PostHog + Sentry подключены.
**4b. Экран раздела и карточка шага.** Короткий ответ сверху → «возьми с собой» → шаги-галочки → совет сообщества → «источник» + «инфа устарела?» (пишет в step_reports). Дата проверки видима.
**DoD:** e2e: квиз → главная → раздел → отметить шаг → перезагрузка → состояние живо. Lighthouse держится.
**Приёмка:** прохожу флоу на телефоне по preview-ссылке; проверяю событList в PostHog.

### Фаза 5 — «Мой план», шаринг, PWA
**5a. Трекер плана.** Экран всех шагов по этапам, прогресс, фильтры (все/горящие/сделанные).
**5b. Share.** Кнопка «поделиться планом» → анонимная запись в `plans` → `/plan/{slug}` (read-only, OG-картинка с прогрессом — это вирусный крюк для чатов). Web Share API на мобиле.
**5c. PWA.** Манифест, иконки, serwist: офлайн-доступ к своему плану и просмотренным шагам («в аэропорту без связи» — сценарий №1).
**DoD:** план открывается офлайн; share-ссылка красиво разворачивается в Telegram (OG-превью).
**Приёмка:** авиарежим-тест; отправка ссылки в реальный телеграм.

### Фаза 6 — поиск и SEO
**6a. Полнотекстовый поиск.** Postgres FTS + триграммы (опечатки), автодополнение, поиск с главной; пустой результат предлагает разделы.
**6b. Программируемое SEO.** Публичная страница каждого шага/раздела: метаданные, sitemap, structured data (FAQ), человеческие URL (`/gid/banki/otkryt-schet`). Это канал бесплатного трафика из Google по запросам «как открыть счёт олиму» и т.п.
**DoD:** поиск отвечает <150ms; страницы индексируемы (проверка через Search Console-friendly разметку).
**Приёмка:** 10 тестовых запросов с опечатками; Lighthouse SEO ≥95.

### Фаза 7 — аккаунты и напоминания
**7a. Supabase Auth** (magic link + Google), миграция localStorage-плана в аккаунт, RLS, синк между устройствами.
**7b. Email-напоминания о дедлайнах** (Supabase Edge Functions + cron или Resend): «через 30 дней сгорает льготный обмен прав». Настройки уведомлений.
**DoD:** e2e: анонимный план → логин → план сохранён; письмо-напоминание приходит на тестовый ящик.
**Приёмка:** проверка RLS (чужой план недоступен), письмо в инбоксе.

### Фаза 8 — ИИ-поиск (RAG)
**8a. Пайплайн.** pgvector, эмбеддинги всех шагов (обновление при изменении контента), гибридный поиск (FTS + вектор).
**8b. Ответы.** «Спроси о жизни в Израиле»: ответ строго из найденных шагов, с карточками-источниками под ответом; не нашёл — честное «не знаю, вот близкие разделы». Стриминг. Rate limit.
**8c. Evals.** Набор 50 эталонных вопросов → автоматическая проверка «ответ содержит факт из базы, ссылается на верный шаг, не выдумывает». Прогоняется в CI при изменении промпта/модели.
**DoD:** evals ≥90% pass; ответ без источника невозможен (guardrail тестируется).
**Приёмка:** я задаю 10 каверзных вопросов, включая провокации на галлюцинацию.

### Фаза 9 — Capacitor и сторы
**9a. Обёртка.** Capacitor поверх того же кода; нативные: push-напоминания (замена email на мобиле), share sheet, haptics, splash/иконки. Это обязательный минимум против Apple Guideline 4.2 («repackaged website» отклоняют).
**9b. Релиз.** Стор-листинги (RU/EN скриншоты, тексты), TestFlight + закрытый трек Play, прохождение ревью.
**DoD:** приложение в TestFlight и internal testing; пуш о дедлайне приходит на реальный телефон.
**Приёмка:** чек-лист 4.2 (офлайн ✓, пуши ✓, нативный share ✓, app-like навигация ✓).

### Фаза 10 — запуск, рост, витрина
**10a. Запуск.** Посты в 5–7 чатов олим (как помощь, не реклама), Product Hunt-стайл пост на vc/Хабр «сделал бесплатный навигатор адаптации», мониторинг фидбека, багфикс-спринт.
**10b. Контент-долив.** По логам поиска («что искали и не нашли») — новые шаги еженедельно; разбор step_reports.
**10c. Портфолио-витрина.** README с архитектурой и скринами, кейс-стади «0 → продукт» для резюме, EN-лендинг о проекте.
**DoD/метрики:** 100 планов и 500 поисков за первый месяц; ≥20% share rate; отзывы из чатов собраны в файл.
**Приёмка:** ретро всего проекта + роадмап v2 (категории врачей/пенсионеров, иврит, монетизация партнёрками — по желанию).

---

## Порядок и зависимости

1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 строго. Параллелить можно только контент (2c пополняется фоном начиная с Фазы 2 и до конца — контент-сессии Claude отдельным потоком).

## Phase 1 kickoff prompt (copy into a new Claude Code session)

> You are the executor of Phase 1 of the Olim App project — an adaptation navigator for new immigrants (olim) in Israel. Read docs/ROADMAP.md (full plan) and work STRICTLY within Phase 1 scope (1a → 1b → 1c). Do not touch anything from future phases, even if convenient.
>
> Language policy: everything in the repository is English — code, comments, commit messages, PRs, docs, phase reports, branch names. Communicate with the user in chat in Russian. User-facing product strings go through next-intl dictionaries (RU now, EN keys ready), never hardcoded in JSX.
>
> Task: build the repository foundation. Next.js App Router + TypeScript strict (no `any`, `noUncheckedIndexedAccess`), Tailwind with semantic theme tokens (light/dark via CSS variables, manual toggle + prefers-color-scheme; hardcoded colors in components are a review blocker), shadcn/ui, next-intl, Biome, lefthook (pre-commit: lint + typecheck on staged; commit-msg: commitlint conventional), Vitest + Testing Library, Playwright with a smoke test and axe checks (0 critical/serious violations in both themes), GitHub Actions pipeline: lint → typecheck → unit → build → e2e → lighthouse-ci (Performance ≥90, A11y ≥95, JS first-load budget 170KB), Vercel deploy with PR previews.
>
> Build UI kit v1: SectionTile, StepCard, ChecklistItem, DeadlineBadge, SearchBar, BottomNav, EmptyState. A /dev/ui page renders every component in both themes; each component has a render test and passes axe. Typography ≥14px, tap targets ≥44px, font with full Cyrillic + Latin support (Inter or Golos).
>
> Commit atomically with conventional commits. Finish by creating docs/PHASE_REPORTS/phase-1.md (English): what was done, verification commands, /dev/ui screenshots in both themes, known debts. Also create CLAUDE.md with the engineering standards from ROADMAP for future sessions.

---

*Дополнение к плану: документы «aliyah-planner-master-plan.md» (ресёрч, персоны, источники) остаётся справочником контента; данный файл — операционный план разработки.*
