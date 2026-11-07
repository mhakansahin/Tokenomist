---

description: "Task list for Spec Kit Klasörüyle Etkinleşme"
---

# Tasks: Spec Kit Klasörüyle Etkinleşme

**Input**: [spec.md](spec.md), [plan.md](plan.md) · **Tests**: önce yazılır (Anayasa III)

## Phase 1: User Story 1 - Yeni Spec Kit projesinde ilk spec (Priority: P1) 🎯 MVP

- [ ] T001 [US1] `tests/integration/runTests.ts`: `freshSpecKit` senaryosu — her koşuda geçici dizinde yalnızca `.specify/memory/constitution.md` olan bir çalışma alanı oluştur ve onunla VS Code'u başlat (`TOKENOMIST_ASSUME_CLAUDE_CODE=1`)
- [ ] T002 [US1] `tests/integration/suite/activation.ts`: `freshSpecKit` — `api.tracker` tanımlı, `status.current.passive` yok, `settings.local.json` içinde Tokenomist hook'ları var (FR-001); `.specify/feature.json` + `specs/001-x/spec.md` yazıldıktan sonra 5 sn içinde `tracker.activeTracking()` tanımlı ve analiz var (FR-004, SC-001, SC-003)
- [ ] T003 [US1] `src/app/specKitWatcher.ts`: `isSpecKitWorkspace()` `.specify` klasörünü denetler (FR-001)
- [ ] T004 [US1] `src/ui/statusBar.ts` + `src/extension.ts`: aktif özellik yokken "no spec yet" görünümü ve `analyzeSpec`'te "İlk spec'i /speckit-specify ile başlatın" bilgisi (FR-002)
- [ ] T005 [US1] `package.json`: `activationEvents` += `workspaceContains:.specify/**`

## Phase 2: User Story 2 - VS Code açıkken Spec Kit kurulması (Priority: P2)

- [ ] T006 [US2] `tests/integration/suite/activation.ts` + `runTests.ts`: `lateSpecKit` senaryosu — boş geçici çalışma alanı (pasif `noSpecKit`), test sırasında `.specify/memory/constitution.md` oluşturulur; 5 sn içinde `api.tracker` tanımlı ve `passive` yok (FR-005, SC-003)
- [ ] T007 [US2] `src/extension.ts`: tracker kurulumu `startTracking()`'e taşınır; `.specify` yoksa `.specify/**` oluşma izleyicisi, ilk olayda `startTracking()` (FR-005); mevcut `noSpecKit` senaryosu hâlâ dosya yazmaz (FR-006, SC-004)

## Phase 3: Polish

- [ ] T008 [P] `l10n/bundle.l10n.tr.json`: yeni metinler; `npm test` + `runTests.js` (6 senaryo) yeşil
