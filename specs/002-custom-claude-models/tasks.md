---

description: "Task list for Özel Claude Model Eşlemesi"
---

# Tasks: Özel Claude Model Eşlemesi

**Input**: Design documents from `specs/002-custom-claude-models/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/settings-and-matching.md](contracts/settings-and-matching.md), [quickstart.md](quickstart.md)

**Tests**: Anayasa III gereği testler önce yazılır ve önce kırmızı olmalıdır. Her fazın sonunda 001'in tüm testleri de yeşil kalmalıdır (SC-002).

**Organization**: Görevler kullanıcı hikâyesine göre gruplandı. Her görev FR/SC numarası referans verir.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Paralel çalışabilir (farklı dosya, tamamlanmamış göreve bağımlılık yok)
- **[Story]**: US1–US3 (002 spec.md)

---

## Phase 1: Setup

- [ ] T001 Başlangıç ölçümü: `npm test` ve `node ./out/tests/integration/runTests.js` çalıştır; geçen test sayısını (001: 102 birim/entegrasyon + 4 VS Code senaryosu) `specs/002-custom-claude-models/tasks.md` sonundaki "Notlar" bölümüne yaz (SC-002 karşılaştırma tabanı)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Tek doğrulama kaynağı (`ModelValue`) ve 001 tiplerinin geriye uyumlu genişletilmesi

**⚠️ CRITICAL**: Bu faz bitmeden hikâyelere başlanmaz; faz sonunda 001 testleri değişmeden yeşil olmalı

### Tests (önce yaz)

- [ ] T002 [P] `tests/unit/modelValue.test.ts` (FR-003): research R3 gramerinin her dalı. Kabul: `haiku`, `sonnet`, `opus`, `fable`, `best`, `sonnet[1m]`, `opus[1m]`, `fable[1m]`, `opusplan`, `claude-opus-5-5`, `claude-sonnet-5-5[1m]`, ` Claude-Opus-5-5 ` → `claude-opus-5-5` (FR-005). Red ve neden: `""` → `empty`, `default` → `default`, `gpt-5`/`gemini-2.5-pro`/`o3`/`llama-4` → `notClaude`, `haiku[1m]`/`opus[2m]`/`opus[1M]x` → `unknownVariant` (SC-001). `family`, `longContext`, `displayName` (`opus[1m]` → "Opus 1M", `opusplan` → "Opus Plan", `best` → "Best", fullId olduğu gibi), `weight`/`savingsKnown` (research R4 tablosu birebir), `usesCredits` (`fable*`, `best`)
- [ ] T003 [P] `tests/unit/modelCompatibility.test.ts`: contracts/settings-and-matching.md "PreModelSwitch eşleşmesi" tablosunun her satırı için `compatible(locked, requested)` sonucu; ayrıca istenen değer yoksa `to_model` ailesine düşme ve "varyant bilinmiyor → uyumsuz" kuralı (FR-009)

### Implementation

- [ ] T004 `src/domain/modelValue.ts`: `ModelValue` (marka tipli string), `parseModelValue(raw)`, `modelInfo(value)` (`kind`, `family`, `longContext`, `displayName`, `weight`, `savingsKnown`, `usesCredits`), `compatible(locked, requested, toModelFallback?)`. data-model.md "ModelValue" tablosu birebir (FR-003, FR-009; T002, T003)
- [ ] T005 `src/domain/types.ts`: `Mode` += `"custom"`, `MODES` güncelle; `SpecAnalysis.recommendedModel`, `ModelLock.model/recommendedModel`, `LockSegment.model`, `PendingWriting.writingModel`, `SpecTracking.writingModel`, `SpecSummary.recommendedModel/usedModel` → `ModelValue`; `SpecSummary.savingsUnknown?: true` ekle; mevcut `Model` tipi ve `modelFamily` aile işlemleri için kalır (data-model.md "001 varlıklarında değişen alanlar")
- [ ] T006 `src/domain/claudeSettingsDoc.ts` (FR-008): `applyModel(doc, value: ModelValue)` geçerli her değeri aynen yazar, geçersizi reddeder; `tests/unit/claudeSettingsDoc.test.ts`'e `opus[1m]`, `opusplan`, `claude-opus-5-5` aynen yazılır ve `gpt-5` reddedilir vakalarını ekle (SC-005)
- [ ] T007 `src/domain/savings.ts`: `MODEL_WEIGHT` sabiti yerine `modelInfo(value).weight`; `estimateSavings` artık `{ pct, unknown }` döner (herhangi bir segment `savingsKnown=false` ise `unknown=true`); `tests/unit/savings.test.ts` 001 vakaları aynı yüzdelerle geçer, `opusplan` → %20 ve `fable` → %0 + unknown vakaları eklenir (FR-010)
- [ ] T008 Tip değişikliğinin 001 modüllerine yayılması: `src/app/tracker.ts`, `src/app/sessionModels.ts`, `src/ui/labels.ts` (`modelLabel(value)` → `modelInfo(value).displayName`), `src/ui/*` derlenir; `isModel` kontrolleri `parseModelValue` ile değiştirilir. `npm test` 001 testleri değişmeden yeşil (SC-002)

**Checkpoint**: `npm test` yeşil, test sayısı ≥ T001 tabanı + yeni testler

---

## Phase 3: User Story 1 - Bir seviyeye özel Claude modeli atamak (Priority: P1) 🎯 MVP

**Goal**: Özel mod tablosu, öneri ve kilitte aynen kullanılan özel değerler, ilk ayar ve öneri ekranı.

**Independent Test**: quickstart.md C1, C2, C3, C7, C10.

### Tests (önce yaz)

- [ ] T009 [P] [US1] `tests/unit/customMapping.test.ts`: `resolveMapping("custom", {complex:"opus[1m]"})` → simple `haiku`, medium `sonnet`, complex `opus[1m]` (boş hücre = Dengeli); tamamen boş tablo = Dengeli; diğer üç mod 001 tablosuyla birebir (FR-001, FR-006); `writingValueFor("custom", false, {writing:"opusplan"})` → `opusplan`, boş writing → 001 `writingModelFor`; `writingValueFor("custom", true, {})` → `sonnet` (Özel, "moda bağlı"da Dengeli gibi davranır; analyze U1) (FR-002)
- [ ] T010 [P] [US1] `tests/unit/settingsValidation.test.ts`'e ekle: `resolveCustomTable(raw, lastValid)` geçerli hücreleri normalize eder, geçersiz hücrede o hücre için son geçerli değeri korur ve hatayı (`{cell, reason}`) döner (FR-004, FR-005)
- [ ] T011 [US1] `tests/integration/customMode.test.ts` (node:test, `tests/integration/helpers.ts` ile): mod `custom` + complex `opus[1m]` → karmaşık fixture önerisi `opus[1m]`; `review("opus[1m]")` → `settings.local.json` `model` = `"opus[1m]"` (SC-005); `finish()` orijinali aynen geri koyar; kilitliyken özel tablo değişip `onSettingsChanged()` çağrılınca kilit değişmez (FR-011); custom writing `opusplan` ile `/speckit-specify` → local `model` = `"opusplan"` (FR-002)

### Implementation

- [ ] T012 [US1] `src/domain/classification.ts`: `CustomTable` tipi, `resolveMapping(mode, custom)`, `recommend(score, mode, thresholds, custom)`, `writingValueFor(mode, followMode, custom)`; `custom` modu, "moda bağlı" yazım modelinde `balanced` gibi davranır. `src/` içinde `MODE_MAPPING[` doğrudan erişimi yalnızca `resolveMapping` içinde kalır (`grep` ile doğrula; analyze U1, U2) (T009)
- [ ] T013 [US1] `src/domain/settingsValidation.ts`: `resolveMode` `custom`'ı kabul eder; `resolveCustomTable(raw, lastValid) → { table, errors }` (T010)
- [ ] T014 [US1] `src/app/tracker.ts`: `TrackerSettings` += `custom: CustomTable`; analiz `recommend(..., custom)`, spec yazımı `writingValue`; `review(value?: string)` serbest değeri `parseModelValue` ile kabul eder, önerilenden farklıysa `manualOverride=true` (FR-014) (T011)
- [ ] T015 [US1] `package.json` `contributes.configuration`: `tokenomist.mode` enum += `custom` (+ `enumDescriptions` `%config.mode.custom%`); `tokenomist.custom.simple|medium|complex|writing` (`type: string`, `default: ""`, `scope: window`, `pattern` + `patternErrorMessage: %config.custom.invalid%` — contracts/settings-and-matching.md birebir); `package.nls.json` / `package.nls.tr.json` metinleri (FR-013)
- [ ] T016 [US1] `src/extension.ts` `readSettings`: dört custom hücreyi okur, `resolveCustomTable` ile doğrular, hatada `showErrorMessage` (hangi hücre, neden) ve son geçerli tabloyu korur (FR-004)
- [ ] T017 [US1] `src/ui/setup.ts`: modlar listesine "Özel" (`mappingText` etkin tabloyu gösterir: dolu hücreler + Dengeli'den gelenler); Özel seçilince sırayla 4 hücre için QuickPick — hazır değerler (`haiku`, `sonnet`, `opus`, `sonnet[1m]`, `opus[1m]`, `opusplan`, `fable`, `best`), "Boş bırak (Dengeli)", "Başka bir değer yaz…" (InputBox, `validateInput` = `parseModelValue`); seçimler `ConfigurationTarget.Global`'e yazılır (FR-012, FR-013)
- [ ] T018 [US1] `src/ui/recommendation.ts` `pickModel`: sıra = önerilen (etiketli) → Haiku/Sonnet/Opus → özel tablo değerleri (tekrarsız) → "Başka bir Claude modeli yaz…" (InputBox, `parseModelValue` doğrulaması); dönüş değeri `ModelValue` (FR-014)
- [ ] T019 [US1] `src/ui/labels.ts`, `src/ui/statusBar.ts`, `src/ui/summaries.ts`: tüm model gösterimleri `displayName` (FR-007); `modeLabel("custom")` → "Özel"/"Custom"

**Checkpoint**: C1, C2, C3, C7, C10 geçer; 001 testleri yeşil

---

## Phase 4: User Story 2 - Claude dışı değerlerin reddedilmesi (Priority: P2)

**Goal**: Her giriş yolunda (ayar, ilk ayar, öneri ekranı) aynı gramerle red; Fable/`best` için kredi uyarısı.

**Independent Test**: quickstart.md C4, C5, C8.

### Tests (önce yaz)

- [ ] T020 [P] [US2] `tests/unit/settingsSchema.test.ts`: `package.json`'daki `tokenomist.custom.*` `pattern` deseni, `parseModelValue`'nun T002'de kabul ettiği hiçbir girdiyi reddetmez (tek yönlü; desende satır içi bayrak yok — analyze I1)
- [ ] T021 [P] [US2] `tests/integration/customMode.test.ts`'e ekle: geçersiz hücre (`gpt-5`) → `readSettings` hatası ve son geçerli değer; `review("gpt-5")` kilitlemez ve uyarır; `fable` hücresi/seçimi → `ui.creditsWarning` bir kez çağrılır (aynı oturumda ikinci kez çağrılmaz), değer yine kabul edilir (FR-004, FR-015)

### Implementation

- [ ] T022 [US2] `src/app/tracker.ts`: `review` ve hücre değerlerinde `usesCredits` ise `ui.creditsWarning(value)` (oturum başına değer başına bir kez); geçersiz serbest değerde `ui.warn` ve kilit yok (FR-004, FR-015)
- [ ] T023 [US2] `src/ui/gatePrompts.ts` veya `src/ui/recommendation.ts`: `creditsWarning(value)` bildirimi (kullanım kredisi + etkileşimli `/model` onayı metni, research R2); reddetme mesajları `reason`'a göre yerelleştirilmiş (`empty`, `default`, `notClaude`, `unknownVariant`)

**Checkpoint**: C4, C5, C8 geçer

---

## Phase 5: User Story 3 - Özel değerlerle doğru kilit kontrolü ve tasarruf (Priority: P3)

**Goal**: `/model` kontrolü ve kapı, `requested_model` + `compatible()` ile; tasarruf özeti "tahmin yok" bilgisini taşır.

**Independent Test**: quickstart.md C6, C9.

### Tests (önce yaz)

- [ ] T024 [P] [US3] `tests/unit/gateDecisions.test.ts`'e ekle: contracts tablosundaki her satır `decidePreModelSwitch` üzerinden (`requested_model` + `to_model`); `askOverride.targetModel` artık `ModelValue | undefined`; kapı `decideExpansion` oturum modeli karşılaştırmasında `compatible` kullanılır (`opus[1m]` kilit + oturum `opus` → mismatch)
- [ ] T025 [P] [US3] `tests/unit/sessionModels.test.ts`'e ekle: `observe(session, requested, to)` → `requested` geçerliyse onu, değilse `to` ailesini saklar
- [ ] T026 [US3] `tests/integration/finishFlow.test.ts`'e ekle: `opusplan` kilidi → özet %20, `savingsUnknown` yok; `fable` kilidi → %0 ve `savingsUnknown: true`; `showSummary` "tahmin yok" bilgisini alır (FR-010)

### Implementation

- [ ] T027 [US3] `src/domain/gateDecisions.ts`: `ModelSwitchInput.requested_model`; `decidePreModelSwitch` ve `decideExpansion` `compatible()` ile (T024)
- [ ] T028 [US3] `src/app/sessionModels.ts` + `src/app/tracker.ts`: `observe` imzası `requested_model` alır; `handlePreModelSwitch` "güncelle" yolunda yeni kilit değeri `requested_model`'dan (ModelValue) gelir; `gateContext` local `model` değerini `parseModelValue` ile okur ve oturum modelini kilitle `compatible` üzerinden karşılaştırır (analyze U3, SC-004) (T025)
- [ ] T029 [US3] `src/app/tracker.ts` `finish()` + `src/ui/summaries.ts`: `estimateSavings` sonucundaki `unknown` → `SpecSummary.savingsUnknown = true`; `summaryLine` bu durumda "~%X tahmini tasarruf" yerine "tahmin yok" gösterir (T026)

**Checkpoint**: Tüm hikâyeler; 001 testleri yeşil

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T030 [P] `l10n/bundle.l10n.tr.json`: yeni metinler; `tests/unit/l10nCoverage.test.ts` yeşil (001 FR-025)
- [ ] T031 [P] `README.md`: "Custom mode" bölümü (kabul edilen değerler tablosu, boş hücre = Balanced, Fable kredi uyarısı, `[1m]`/`opusplan` tasarruf ağırlıkları)
- [ ] T032 (SC-004) quickstart C6'yı gerçek `claude -p` ile maliyetsiz doğrula (001'deki `e2e_claude.js` yaklaşımı: kilit `opus[1m]`, `/model opus[1m]` sorulmadan izin, `/model sonnet` → "Geri al" ile engellenir; her çağrı engellendiği için maliyet 0); sonuçları `specs/002-custom-claude-models/quickstart.md` sonuna "Doğrulama kaydı" olarak ekle
- [ ] T033 `package.json` `version` → `0.2.0`; `npm test`, `runTests.js` (4 senaryo) ve `vsce package` temiz

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2**: T001 taban ölçüm
- **Phase 2**: T004 → T005 → (T006, T007 paralel) → T008; tüm hikâyeleri bloklar
- **US1 (Phase 3)**: MVP. US2 ve US3, US1'in `pickModel`/`review`/ayar okumasını kullanır, ama testleri ayrı fixture'larla bağımsız çalışır
- **Dosya çakışmaları (sıralı)**: `src/app/tracker.ts`: T008 → T014 → T022 → T028 → T029 · `src/ui/recommendation.ts`: T018 → T023 · `package.json`: T015 → T033 · `tests/integration/customMode.test.ts`: T011 → T021

## Parallel Example: Phase 2 + US1

```text
T002 modelValue.test · T003 modelCompatibility.test       (birlikte)
T006 claudeSettingsDoc · T007 savings                      (T005 sonrası birlikte)
T009 customMapping.test · T010 settingsValidation.test     (birlikte)
```

## Implementation Strategy

1. Phase 1–2 → 001 testleri hâlâ yeşil (SC-002 güvencesi)
2. US1 → C2/C3 elle dene → **dur ve dene** (MVP: Özel mod ile `opus[1m]`)
3. US2 → US3 → Polish. Her adım küçük commit, mesajda FR numarası (Anayasa I, V)

## Notlar

<!-- T001 başlangıç ölçümü buraya -->
