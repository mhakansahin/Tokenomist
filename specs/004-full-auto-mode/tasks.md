---

description: "Task list for Tam Otomatik Mod"
---

# Tasks: Tam Otomatik Mod

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md) · **Tests**: önce yazılır (Anayasa III). Sorarak modda 001/002 testleri değişmeden geçmeli (SC-003).

## Phase 1: Foundational

- [x] T001 `src/app/tracker.ts` + `tests/integration/helpers.ts`: `TrackerSettings.automation` (helpers varsayılanı `ask`, böylece 001/002 testleri değişmez), `TrackerDeps.newConversation(prompt?) → Promise<boolean>`; helpers sahte `newConversation` prompt'u kaydeder ve `env.prefillWorks` (varsayılan `true`) döner; `npm test` yeşil (SC-003)

## Phase 2: User Story 1 - Sormadan kilit ve sormadan konuşma geçişi (Priority: P1) 🎯 MVP

- [x] T002 [US1] `tests/integration/autoMode.test.ts`: (a) `auto` iken spec kaydı → kilit yok, `recommendationReady` çağrısı yok, durum `awaitingApproval` (FR-002); (b) kilitsiz `/speckit-plan` → `askUnlockedPlan` çağrılmaz, önerilen model kilitlenir, yanıt `block`, `newConversation("/speckit-plan …")` aynı metinle çağrılır (FR-003, FR-004, SC-004); (c) eski oturumda `/speckit-tasks` → `askSessionMismatch` çağrılmaz, `block` + hazır metin (FR-003); (d) yeni oturumda komut → `{}` (US1-4); (e) hazır metin açılamazsa (`prefillWorks=false`) mesaj komutu tekrar yazmayı söyler (FR-007); (f) 10 sn içinde ikinci `/speckit-plan` → `block`, ikinci konuşma açılmaz (FR-010); (g) analiz edilemeyen spec → `askUnlockedPlan` sorulur; (h) `plan.md` oluşunca (`onPlanCreated`) kilitsizse otomatik kilit; (i) `/model` geçişi `auto` iken de `askOverride` ile sorulur (FR-011); (j) `changeLockedModel()` kilidi günceller ve `manualOverride=true` yapar
- [x] T003 [US1] `src/app/tracker.ts`: `handleExpansion` `auto` dalları, `blockForNewConversation(signal, command, prompt, model)` (debounce, hazır metin, FR-008 mesajları), `onSpecSaved`'da `auto` iken bildirim yok, `onPlanCreated`, `changeLockedModel` (T002)
- [x] T004 [US1] `src/extension.ts`: `newConversation(prompt)` → `claude-vscode.primaryEditor.open(undefined, prompt)`, hata/komut yoksa `claude-vscode.newConversation` ve `false` (research R1); `watcher.onPlanCreated` → `tracker.onPlanCreated`; `tokenomist.changeModel` komutu
- [x] T005 [US1] `src/ui/recommendation.ts`: `announceAutoLock(analysis)` bilgi bildirimi + "Change model" düğmesi (`tokenomist.changeModel`); `src/ui/statusBar.ts`: `auto` + `awaitingApproval` görünümü

## Phase 3: User Story 2 - Sormadan spec yazımı ve bitiş (Priority: P2)

- [x] T006 [US2] `tests/integration/autoMode.test.ts`'e ekle: `auto` iken `/speckit-specify x` → `askWriting` çağrılmaz, `block`, hazır metin `/speckit-specify x`, yazım modeli ayara yazılmış (FR-005); tüm görevler `[x]` → `askFinish` çağrılmaz, orijinal model geri gelir, özet gösterilir (FR-006)
- [x] T007 [US2] `src/app/tracker.ts`: `askWriting` `auto` dalı, `askAndFinish` `auto` dalı (T006)

## Phase 4: User Story 3 - Sorarak çalışmaya devam (Priority: P3)

- [x] T008 [US3] `package.json` `tokenomist.automation` (`enum: ["auto","ask"]`, `default: "auto"`, yerelleştirilmiş açıklamalar) + `src/ui/settings.ts` okuma + ilk ayar ekranında otomasyon seçimi; `npm test` 001/002 testleri değişmeden yeşil (FR-001, FR-009, SC-003)

## Phase 5: Polish

- [x] T009 [P] `l10n/bundle.l10n.tr.json`, `package.nls*.json`: yeni metinler; `l10nCoverage` yeşil
- [x] T010 [P] `README.md`: otomatik mod, Enter'a basma adımı ve belgelenmemiş komut notu
- [x] T011 `tests/integration/suite/index.ts`: VS Code'da `claude-vscode.primaryEditor.open` yokken (test profili Claude Code içermiyor) geri düşüşün hata vermediğini doğrula; `runTests.js` + `npm test` + `vsce package` (0.3.0)

## Notlar

- Uygulama sırasında 0.2.0'da bir hata bulundu ve düzeltildi: `handleExpansion` içinde `case "allow"` `startWriting` dalına düşüyordu; izin verilen her komut yanlışlıkla bir spec yazımı başlatıp kilitli modelin üzerine yazım modelini yazabiliyordu. Regresyon testi: `tests/integration/lockFlow.test.ts` son vaka.
- Sorarak modda da "Yeni konuşma aç" seçildiğinde komut yeni konuşmaya hazır yazılıyor (research R4).
