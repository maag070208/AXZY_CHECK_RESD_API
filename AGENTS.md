# API — AGENTS.md

Express + Prisma 5 + PostgreSQL backend for AXZY CHECK Residenciales. Port 4444.

> **Before writing code, load**: `.opencode/skills/api/SKILL.md` (architecture/type-safety rules) and `.opencode/skills/api-test/SKILL.md` (test patterns). They are the source of truth for style.

## Quick commands

```bash
cd API
pnpm dev                 # nodemon → ts-node → src/index.ts (port 4444)
pnpm test                # Jest 30, *.test.ts under src/ and test/
pnpm lint                # ESLint
pnpm lint:fix
pnpm build               # rimraf dist + tsc + tsc-alias
pnpm start               # node dist/src/index.js
pnpm prisma:generate     # regenerate client
pnpm prisma:migrate      # apply migrations (dev only)
pnpm prisma:seed         # run prisma/seed.ts
pnpm swagger             # regenerate swagger.yaml + react_llm_reference.txt
```

## Layout

```
API/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts / seed-catalogs.ts
│   ├── seeds/                 # additional seed scripts
│   └── migrations/            # SQL migration files
├── src/
│   ├── index.ts               # express app entry (helmet, CORS, rate-limit, /api/v1)
│   ├── core/
│   │   ├── config/            # env, constants, database
│   │   ├── middlewares/       # auth, validate, error, multer, schema-validator, token-validator
│   │   ├── utils/             # prisma-pagination, logger, security
│   │   ├── errors/            # AppError
│   │   ├── dto/               # Zod schemas (e.g. datatable.schema.ts)
│   │   └── types/
│   └── modules/
│       ├── api.router.ts      # mounts all module routes under /api/v1
│       └── <name>/            # one folder per domain
│           ├── *.routes.ts    # router.<method>(path, middleware, controller)
│           ├── *.controller.ts
│           ├── *.service.ts
│           ├── *.dto.ts       # Zod request schemas
│           ├── *.response.ts  # response shapes
│           └── schemas/       # (optional) extra Zod
├── test/modules/<name>/       # jest integration tests
├── scripts/autodoc_prisma.js  # swagger generator
├── swagger.yaml               # generated
├── react_llm_reference.txt    # generated
└── nodemon.json               # watches src/, runs ts-node with paths alias
```

## Module pattern (do not deviate)

- One folder per domain in `src/modules/<name>/`.
- Routes registered in `src/modules/api.router.ts` (no auto-discovery).
- **All routes after `/login` go through `authenticate` middleware** (in `src/core/middlewares/`). It validates JWT and attaches `res.locals.user`.
- **All non-trivial routes use `validate(Schema)`** (Zod) for body/params/query. Schema lives in `*.dto.ts` or `core/dto/`.
- Services receive the validated input + `res.locals.user` (when needed for ownership/role checks).
- Cascade operations **must be wrapped in `prisma.$transaction`** (atomic). Example: `residents.service.ts` `updateResident`/`deleteResident` deactivate the user + their records together.
- Use `asyncHandler` (look in existing controllers) to forward errors to `errorMiddleware` — don't `try/catch` in controllers.

## Prisma / DB

- **Soft-delete models** (Prisma middleware on these): `Client, Zone, User, Location, RecurringConfiguration`. All queries on these models should be soft-delete-aware (services handle via `where: { deletedAt: null }` or the middleware).
- **Cuid/uuid IDs** for most models. Some legacy fields use numeric IDs (e.g. role relations).
- `prisma.payments.*` indexes (added in `20260603230000_add_payment_indexes`): `(residentId, status)`, `(feeId)`, `(period)`, `(deletedAt)`, `(status, period, deletedAt)`. PaymentLog: `(paymentId)`, `(residentId)`.
- `prisma.$transaction` for any multi-row write that must be atomic.
- **S3 is BLOCKED in this env** (`AWSCompromisedKeyQuarantineV3`). Do not write new code that uploads to S3; serve files as direct buffers via pdfkit (see `payments.receipt.download` controller for the pattern).
- **Stripe**: keys in `.env` are LIVE (`sk_live_...`). Min charge: $1 test / $10 live. Test mode = set `STRIPE_SECRET_KEY=sk_test_...` locally. Resend API key (in `.env`): `re_Kf3gqhj1_Gf3c8HwnXSVFENa97CQG6MHQ`.
- **Remote Railway DB not reachable** — apply migrations via SQL files in `prisma/migrations/`. Don't run `prisma migrate dev` against prod.

## Datatable filter pattern

`POST /<module>/datatable` accepts:
```ts
{ page: number, limit: number, filters: Record<string, any>, sort?: { key, direction } }
```

`getPrismaPaginationParams()` (`src/core/utils/prisma-pagination.utils.ts`) converts this to `{ skip, take, where, orderBy }`.

Rules:
- Boolean/number filters → exact match.
- String filters ending in `id` → coerced to number.
- String filters on `status | role | type | category` matching `^[A-Z_]+$` → exact enum match.
- Other strings → `{ contains, mode: "insensitive" }` (Prisma errors on enum `contains` — that's why the rule above exists).
- Each service that uses relations **must** convert string filters into relation filters (e.g. `role: "GUARD"` → `role: { name: "GUARD" }`).

## Known bugs / gotchas

- **Users datatable `role` filter** (`src/modules/users/user.service.ts`): had a spread bug where `...existingRoleName` on a string spread as `{0:"G",1:"U",...}` and Prisma threw `Unknown argument '0'`. The fix preserves `equals`/`contains`/`in` explicitly. If you see that error, look at line ~87 first.
- **Jest 30 patch required**: top-level `node_modules/jest-mock/build/index.js` must include `clearMocksOnScope`. Without it, `restoreMocks: true` errors. Patch is local-only (not committed). Symptom: `Cannot read properties of undefined (reading 'restoreMocks')` on first test run.
- **Cascade deactivation** for residents/clients must NOT be a one-way disable — `user.active = false` AND `resident.active = false` AND any future tables that share the user must be touched in the same `$transaction`.
- **Datatable response shape** is `{ success, data: { rows, total, page?, limit? }, messages }`. Don't return rows at the top level of `data`.
- **Endpoint naming**: `/properties` on WEB → `/houses/datatable` on API (Prisma model is `House`). Don't rename.

## Testing

```bash
pnpm test                       # all tests
pnpm test -- --testPathPattern=residents
pnpm test -- --testNamePattern="debe crear"
```

- Tests live in `src/<module>/__tests__/` or `test/modules/<module>/`.
- Use `jest --runInBand` if tests touch a shared DB.
- E2E API tests via `curl` are also acceptable (see `WEB/test/e2e/*` for end-to-end style and examples in the API dev log). Stripe webhooks and S3 are not testable in this env.
- **DB cleanup**: use a transactional beforeEach/afterAll that truncates affected tables, NOT `prisma migrate reset` (the remote DB is shared).

## Swagger / API reference

- `pnpm swagger` regenerates `swagger.yaml` and `react_llm_reference.txt` from Prisma + route introspection.
- After any Prisma schema change OR new route, run `pnpm swagger` and verify the diff in the YAML.
- `react_llm_reference.txt` is the canonical endpoint catalog for code generators (LLMs, codegen tools). If you add a route and forget to regenerate, downstream consumers will be stale.

## Style

- **No comments** in code unless explicitly requested.
- **Spanish** for user-facing copy, log messages, error messages.
- **Strict types** — no `any`. Use `TResult<T>` (`src/core/types/`) for service results; `AppError` for thrown errors.
- **Zod** for every external input (body, params, query).
- **RBAC**: every protected route uses `authenticate(["ADMIN", "LIDER"])` — don't add role checks in controllers.
- **Soft-delete**: never `DELETE` from a soft-delete model; update `deletedAt: new Date()`.

## References

- Skill (read first): `.opencode/skills/api/SKILL.md`
- Test skill: `.opencode/skills/api-test/SKILL.md`
- Swagger auto-doc: `.opencode/skills/swagger-autodoc/SKILL.md`
- Endpoint catalog: `API/react_llm_reference.txt`
- Coverage map: `API/COBERTURA_TEST.txt`
