---

description: "Task list for Spec Bazlı Model Yönlendirme (Tokenomist)"
---

# Tasks: Spec Bazlı Model Yönlendirme (Tokenomist)

**Input**: Design documents from `specs/001-spec-model-routing/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Anayasa III (Test önce) gereği her hikâyede testler önce yazılır ve önce kırmızı olmalıdır. Birim: `node:test` (`tests/unit/`), entegrasyon: `@vscode/test-electron` (`tests/integration/`).

**Organization**: Görevler kullanıcı hikâyesine göre gruplandı. Her görev ilgili FR/SC numarasını referans verir (Anayasa I).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Paralel çalışabilir (farklı dosya, tamamlanmamış göreve bağımlılık yok)
- **[Story]**: US1–US4 (spec.md kullanıcı hikâyeleri)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Proje iskeleti, araçlar ve kritik varsayımın doğrulanması

- [x] T000 Depo kökünde `git init`, ana dal `main`, ilk commit olarak mevcut `.specify/`, `specs/`, `AGENTS.md`, `CLAUDE.md` dosyaları (Anayasa I, V: commit/PR'lar FR numarası taşır; T004 CI için gerekli)
- [x] T001 `package.json` oluştur: `name: tokenomist`, `engines.vscode: ^1.94.0`, `main: ./out/src/extension.js`, `activationEvents: ["onStartupFinished", "workspaceContains:.specify/feature.json"]`, `extensionDependencies` YOK (Claude Code yoksa da etkinleşmeli, FR-001), `l10n: ./l10n`, scriptler `compile` (tsc), `watch`, `test` (`node --test out/tests/unit`), `test:integration`, `package` (vsce), `vscode:uninstall: node ./out/src/uninstall.js`; devDependencies yalnızca `typescript`, `@types/vscode`, `@types/node`, `@vscode/test-electron`, `@vscode/vsce` (plan.md Technical Context)
- [x] T002 [P] `tsconfig.json` oluştur: `strict: true`, `target: ES2022`, `module: commonjs`, `rootDir: .`, `outDir: out`, `include: ["src", "tests"]`
- [x] T003 [P] `.gitignore` (out/, node_modules/, *.vsix, .vscode-test/) ve `.vscode/launch.json` ("Run Extension", "Extension Tests") oluştur
- [x] T004 [P] `.github/workflows/ci.yml` oluştur: ubuntu + windows matrisi, `npm ci` → `npm run compile` → `npm test` → `xvfb-run -a npm run test:integration` (linux) → `npm run package`
- [x] T005 [P] Yerelleştirme iskeleti: `package.nls.json`, `package.nls.tr.json`, `l10n/bundle.l10n.tr.json` (boş anahtar kümeleri; FR-025)
- [x] T006 **Spike (research "Açık riskler")**: `tests/manual/hook-probe/` altına geçici bir `settings.local.json` örneği ve `node:http` ile 20 satırlık dinleyici betiği `tests/manual/hook-probe/probe.js` yaz; kurulu Claude Code 2.1.314'te `UserPromptExpansion` (`/speckit-plan`), `PreModelSwitch`/`PostModelSwitch` (`/model haiku`) ve `SessionStart` olaylarının HTTP POST ile geldiğini, gövde alanlarını (`command_name`, `to_model`, `source`, `session_id`, `model`) ve `decision:"block"` yanıtının prompt'u engellediğini doğrula; sonuçları `specs/001-spec-model-routing/research.md` sonuna "Spike sonucu" başlığıyla ekle. Olaylardan biri gelmiyorsa ilgili kapı görevleri (T034, T055) için research.md R2/R5'teki geri düşüş (yalnızca dosya izleme + bildirim) uygulanır

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Tüm hikâyelerin dayandığı saf alan tipleri, Claude Code ayar yönetimi, durum deposu ve izleyiciler

**⚠️ CRITICAL**: Bu faz bitmeden hiçbir hikâyeye başlanmaz

### Tests (önce yaz, kırmızı olduğunu gör)

- [x] T007 [P] `tests/unit/claudeSettingsDoc.test.ts`: (a) `model` yokken yazma → eklenir, diğer anahtarlar korunur; (b) kullanıcı hook'ları aynı olay dizisinde korunur, yalnızca URL yolu `/tokenomist/` içeren girdiler değişir; (c) snapshot `{present:false}` ile geri yükleme `model`'i siler, `{present:true,value}` aynen geri koyar; (d) geçersiz JSON → `ParseError` döner, yazma önerilmez; (e) `model` yalnızca `haiku|sonnet|opus` kabul eder (contracts/claude-settings-and-hooks.md §1)
- [x] T008 [P] `tests/unit/tracking.test.ts`: data-model.md "TrackingState geçişleri" tablosundaki her geçiş ve geçersiz geçişlerin reddi; `locked` iken spec değişikliği kilidi değiştirmez; `suspended` kayıt ayara dokunmaz
- [x] T009 [P] `tests/unit/tasksProgress.test.ts`: `- [ ]`/`- [x]`/`- [X]` sayımı, kod bloğu içindekiler hariç; 0 görev → tamamlanmış sayılmaz (FR-015)

### Implementation

- [x] T010 [P] `src/domain/types.ts`: `Model = "haiku"|"sonnet"|"opus"`, `Level = "simple"|"medium"|"complex"`, `Mode = "saver"|"balanced"|"quality"`, `SpecRef`, `SpecAnalysis`, `ModelSnapshot` (`localModel: {present:false}|{present:true,value:string}`, opsiyonel `userModel`, `createdLocalFile`, `takenAt`), `ModelLock` (`segments: {model, from, to?}[]`), `SpecTracking`, `TrackingState`, `SpecSummary` (data-model.md)
- [x] T011 `src/domain/claudeSettingsDoc.ts`: saf fonksiyonlar `parse`, `applyModel`, `restoreModel(snapshot)`, `upsertTokenomistHooks(port, token)`, `removeTokenomistHooks`, `takeSnapshot`; contract §1 JSON yapısı birebir, girinti 2 boşluk (T007'yi yeşile çevirir)
- [x] T012 `src/app/claudeSettingsStore.ts`: `<workspace>/.claude/settings.local.json` atomik okuma/yazma (geçici dosya + rename), dosyayı Tokenomist oluşturduysa `.git/info/exclude`'a `.claude/settings.local.json` ekle (varsa tekrar ekleme), `~/.claude/settings.json` için yalnızca `model` anahtarı oku/geri yaz (R5, R6)
- [x] T013 [P] `src/domain/tracking.ts`: durum makinesi geçiş fonksiyonu `transition(tracking, event)` (T008'i yeşile çevirir)
- [x] T014 [P] `src/domain/tasksProgress.ts`: `isComplete(tasksMd): boolean` (T009'u yeşile çevirir)
- [x] T015 [P] `src/persistence/trackingStore.ts`: `workspaceState` üzerinde `featureDir` başına tek `SpecTracking` kaydı; yükle/kaydet/sil (FR-014)
- [x] T016 `src/app/specKitWatcher.ts`: `FileSystemWatcher` ile `.specify/feature.json`, aktif özelliğin `spec.md`, `plan.md`, `tasks.md`; olaylar `featureChanged`, `specSaved`, `planCreated`, `tasksChanged`; Spec Kit yoksa `unavailable` (FR-002)
- [x] T017 `src/app/claudeDetector.ts`: `vscode.extensions.getExtension("anthropic.claude-code")` ile varlık; override guard'ları: `process.env.ANTHROPIC_MODEL`, `claudeCode.environmentVariables` içinde `ANTHROPIC_MODEL`, managed settings'te `model`/`availableModels`; sonuç `{installed, overriddenBy?}` (FR-001, research R6)
- [x] T018 `src/extension.ts`: `activate` içinde detector → watcher → store bağlantısı; Claude Code yoksa veya override varsa pasif mod (dosyaya yazma yok); `deactivate` kaynakları serbest bırakır

**Checkpoint**: `npm test` yeşil; eklenti F5 ile pasif/aktif durumu loglar

---

## Phase 3: User Story 1 - Spec hazır olunca model önerisi ve kilit (Priority: P1) 🎯 MVP

**Goal**: Spec analiz edilir, seviye + model önerilir, onay/elle seçim ile model yeni konuşmalar için kilitlenir, plan/tasks/implement boyunca değişmez, status bar durumu gösterir.

**Independent Test**: quickstart.md S5, S6, S7, S8, S9. Hazır spec'li çalışma alanında öneri çıkar, onaydan sonra local `model` önerilen modeldir, yeni konuşma o modelle açılır, status bar `🔒 spec · seviye · model` gösterir.

### Tests (önce yaz)

- [x] T019 [P] [US1] `tests/fixtures/specs/{simple,medium,complex}/` altına her seviyeden en az 4 elle etiketli spec (bu deponun `specs/001-spec-model-routing/spec.md` kopyası `complex` olarak dahil) ve `tests/fixtures/specs/labels.json`
- [x] T020 [P] [US1] `tests/unit/scoring.test.ts`: sinyal çıkarımı (`**FR-\d+**`, `### User Story`, Key Entities maddeleri, entegrasyon anahtar sözcükleri, `[NEEDS CLARIFICATION`/belirsiz/TBD, Edge Cases maddeleri) ve doyma değerleri (25/6/8/6/5/12) research.md R8 tablosu; skor 0–100; boş spec → `unavailable`; 1 MB spec < 50 ms
- [x] T021 [P] [US1] `tests/unit/classification.test.ts`: varsayılan eşikler 35/65; sınır payı 5 → eşiğin 5 puan altındaki skor bir üst seviyeye (`borderlineBumped=true`, FR-008); üç modun eşleme tablosu (FR-020); SC-005: fixture setinde ≥ %80 etiketle aynı, hiçbiri etiketin altında değil
- [x] T022 [P] [US1] `tests/unit/gateDecisions.test.ts`: contracts/claude-settings-and-hooks.md `/tokenomist/expansion` ve `/tokenomist/pre-model-switch` tablolarının her satırı (izlenmeyen `cwd` → `{}`, kilitsiz plan → modal kararı, kilitli + farklı/bilinmeyen oturum modeli → modal, "Geri al" → `deny` + systemMessage, süre dolumu → expansion `{}`, pre-model-switch `deny`)
- [x] T023 [US1] `tests/integration/lockFlow.test.ts` (node:test; gerçek dosya sistemi + gerçek hook sunucusu, sahte diyaloglar) ve `tests/integration/suite/index.ts` (gerçek VS Code içinde etkinleşme + komut smoke testi): fixture çalışma alanında spec kaydet → `awaitingApproval`; `tokenomist.showRecommendation` onay → `settings.local.json` `model` = önerilen, kullanıcı anahtarları korunmuş; sahte `/tokenomist/expansion` POST'u (`speckit-plan`) kilitliyken oturum modeli eşleşiyorsa `{}`; yeniden etkinleştirmede kilit sürer (FR-010–FR-014); aktif özellik B'ye geçince A `suspended` olur ve local `model` orijinal değere döner, A'ya dönünce kilitli model yeniden yazılır (Edge Cases)
- [x] T024 [US1] `tests/integration/hookServer.test.ts`: sunucu yalnızca `127.0.0.1`'de; yanlış/eksik `X-Tokenomist-Token` → 401; 25 sn karar zaman aşımı; port değişince hook URL'leri güncellenir (research R7)

### Implementation

- [x] T025 [P] [US1] `src/domain/scoring.ts`: `extractSignals(markdown)`, `score(signals)` — ağırlıklar 2.0/4.0/3.0/5.0/4.0/1.5, doyma 25/6/8/6/5/12, 0–100 normalizasyon, en yüksek katkılı 3 sinyal gerekçe anahtarı (FR-004, FR-006, FR-009; T020)
- [x] T026 [P] [US1] `src/domain/classification.ts`: `classify(score, {medium, complex, margin})` ve `MODE_MAPPING` (saver: haiku/haiku/sonnet; balanced: haiku/sonnet/opus; quality: sonnet/opus/opus) (FR-005, FR-008, FR-020; T021)
- [x] T027 [P] [US1] `src/domain/gateDecisions.ts`: `decideExpansion(input, tracking, sessionModel)` ve `decidePreModelSwitch(input, tracking)`; çıktı `respond(json)` veya `ask(promptKind)` (T022)
- [x] T028 [P] [US1] `src/app/sessionModels.ts`: `session_id → son bilinen model` bellek içi eşleme; `PreModelSwitch.from_model` ve `PostModelSwitch.to_model` ile güncellenir; tam model kimliğinden (`claude-sonnet-5-5`) aile çıkarımı `src/domain/types.ts` içinde `modelFamily(id)` (research R4, Spike sonucu)
- [x] T029 [US1] `src/app/hookServer.ts`: `node:http` sunucusu, `127.0.0.1` rastgele port, `X-Tokenomist-Token` doğrulama, 3 uç nokta (`/tokenomist/expansion`, `/pre-model-switch`, `/post-model-switch`), karar bekleme sınırı 25 sn; her zaman 200 + JSON (contract §2; T024)
- [x] T030 [US1] `src/app/tracker.ts` (analiz + kilit kısmı): `specSaved` (plan yokken) → analiz, `specHash` değişmediyse tekrar hesaplama yok; `awaitingApproval` geçişi + bildirim (FR-004, FR-024); `lock(model, manualOverride)` → orijinal snapshot yoksa al (FR-011), `applyModel`, segment başlat; `locked` iken spec değişikliği yalnızca analizi günceller
- [x] T031 [US1] Aynı dosyada `src/app/tracker.ts` hook entegrasyonu: etkinleşmede `upsertTokenomistHooks(port, token)` (token `workspaceState`'te kalıcı), `featureChanged` → önceki kayıt `suspended` + local `model` orijinale, yeni özellik tekrar aktifse kilitli model yeniden yazılır (Edge Cases)
- [x] T032 [P] [US1] `src/ui/statusBar.ts`: contracts/vscode-contributions.md "Status bar" tablosundaki her durum ve tıklama komutu; kapı pasifse `$(debug-disconnect)` (FR-013)
- [x] T033 [P] [US1] `src/ui/recommendation.ts`: QuickPick başlığı `"<spec> · <Seviye> (skor N)"`, önerilen model ilk sırada `(önerilen)`, diğer ikisi elle seçim (`manualOverride=true`), açıklamada ≤ 3 gerekçe; seçimden sonra "Model X olarak kilitlendi. [Yeni konuşma başlat]" → `claude-vscode.newConversation`; kapatılırsa `awaitingApproval` kalır; analiz `unavailable` ise elle seçim istenir (FR-009, FR-010, FR-011)
- [x] T034 [US1] `src/ui/gatePrompts.ts`: kapı modal'ları — kilitsiz plan [Onayla ve yeni konuşma aç] [Modeli değiştir] [Kilitsiz devam et]; kilitli + farklı oturum [Yeni konuşma aç] [Bu oturumda devam et]; `/model` geçişi [Kilidi bu modelle güncelle] [Geri al] (güncellemede `source=="command"` ise önce `userModel` snapshot, FR-023); `block` yanıtlarının yerelleştirilmiş `reason` metinleri
- [x] T035 [US1] `package.json` `contributes.commands`: `tokenomist.analyzeSpec`, `tokenomist.showRecommendation` ve `src/extension.ts` içinde kayıt + hookServer/tracker/statusBar bağlantısı (contracts/vscode-contributions.md)
- [x] T036 [US1] US1 metinlerini `l10n/bundle.l10n.tr.json` ve `package.nls*.json` dosyalarına ekle (FR-025)

**Checkpoint**: quickstart S5–S9 geçer; MVP kullanılabilir (bitiş/geri yükleme elle `cleanClaudeSettings` ile T057'ye kadar)

---

## Phase 4: User Story 2 - Spec bitince geri yükleme ve özet (Priority: P2)

**Goal**: Tüm görevler bitince onay istenir; onayla orijinal model geri yüklenir ve spec özeti (tahmini tasarruf dahil) gösterilir/saklanır.

**Independent Test**: quickstart.md S10, S11. Kilitli spec'te son görevi `[x]` yap → onay isteği; onayla → local `model` S4 öncesi haline döner, özet listede görünür.

### Tests (önce yaz)

- [ ] T037 [P] [US2] `tests/unit/savings.test.ts`: ağırlıklar haiku 0.2 / sonnet 0.6 / opus 1.0; tek segment Opus → %0, Sonnet → %40, Haiku → %80; çok segmentte süreyle ağırlıklı ortalama; `usedModel` = süreyle baskın model; Dengeli + eşit dağılım fixture → ortalama ≥ %40 (FR-018, SC-006)
- [ ] T038 [P] [US2] `tests/unit/summaryStore.test.ts`: en fazla 500 kayıt, FIFO; `id = workspaceRoot#featureDir#completedAt` (FR-019)
- [ ] T039 [US2] `tests/integration/finishFlow.test.ts`: tüm görevler `[x]` → `completionPending` + istek; reddet → `locked`; onayla → `restoreModel` (snapshot `present:false` ise `model` silinir; `createdLocalFile` ve dosya boşsa dosya silinir), `userModel` snapshot varsa user `model` geri konur; özet `globalState`'e yazılır; `tokenomist.finishSpec` elle de çalışır (FR-015, FR-016, FR-017, SC-003)

### Implementation

- [ ] T040 [P] [US2] `src/domain/savings.ts`: `MODEL_WEIGHT` sabit tablosu, `estimateSavings(segments)`, `dominantModel(segments)` (T037)
- [ ] T041 [P] [US2] `src/persistence/summaryStore.ts`: `globalState`, 500 FIFO (T038)
- [ ] T042 [US2] `src/app/tracker.ts` (bitiş kısmı): `tasksChanged` + `isComplete` → `completionPending` + bildirim [Spec'i bitir] [Henüz değil]; `finish()` → segment kapat, `restoreModel`, `SpecSummary` oluştur ve kaydet, tracking kaydını sil (FR-015, FR-016, FR-017)
- [ ] T043 [P] [US2] `src/ui/summaries.ts`: bitiş sonrası özet bildirimi (spec, seviye, önerilen/kullanılan model, elle değiştirildi, tahmini tasarruf %) ve `tokenomist.showSummaries` için en yeni üstte QuickPick/webview'siz liste (FR-017, FR-019)
- [ ] T044 [US2] `package.json` + `src/extension.ts`: `tokenomist.finishSpec`, `tokenomist.showSummaries` komutları; US2 metinlerini l10n dosyalarına ekle (FR-025)

**Checkpoint**: US1 + US2 birlikte uçtan uca: spec → kilit → bitiş → geri yükleme → özet

---

## Phase 5: User Story 3 - Modlar ve eşiklerin özelleştirilmesi (Priority: P3)

**Goal**: Kullanıcı modu seçer, seviye→model tablosunu görür, eşikleri özelleştirir; spec yazımı modeli (varsayılan Sonnet / moda bağlı) uygulanır.

**Independent Test**: quickstart.md S2, S3, S4. Mod değişince aynı spec için öneri değişir; geçersiz eşik reddedilir; `/speckit-specify` ile spec yazımı modeli local ayara yazılır.

### Tests (önce yaz)

- [ ] T045 [P] [US3] `tests/unit/settingsValidation.test.ts`: `medium` 1–98, `complex` 2–99, `medium < complex`, `borderlineMargin` 0–20; geçersizde son geçerli değerler kullanılır (FR-021)
- [ ] T046 [P] [US3] `tests/unit/writingModel.test.ts`: `followMode=false` → sonnet; `true` → saver=haiku, balanced=sonnet, quality=opus (FR-003)
- [ ] T047 [US3] `tests/integration/writingPhase.test.ts`: sahte `/tokenomist/expansion` (`speckit-specify`) → çalışma alanı düzeyinde `pendingWriting` oluşur (snapshot + yazım modeli), local `model` = yazım modeli; ardından `.specify/feature.json` yeni dizine geçince `pendingWriting` o `featureDir`'in `SpecTracking` kaydına `writing` durumuyla bağlanır; zaten izlenen bir spec için specify çağrısı snapshot'ı yeniden almaz; `pendingWriting` 24 saat içinde bağlanmazsa local `model` snapshot'a döner ve kayıt silinir (FR-003, clarify Q2, data-model PendingWriting)

### Implementation

- [ ] T048 [US3] `package.json` `contributes.configuration`: `tokenomist.mode` (enum `saver|balanced|quality`, varsayılan `balanced`), `tokenomist.thresholds.medium` (35), `tokenomist.thresholds.complex` (65), `tokenomist.borderlineMargin` (5), `tokenomist.writingModel.followMode` (false); `scope: "window"`; açıklamalar `%…%` ile yerelleştirilmiş (data-model.md ModeSettings)
- [ ] T049 [P] [US3] `src/domain/settingsValidation.ts` ve `src/domain/classification.ts` içine `writingModelFor(mode, followMode)` (T045, T046)
- [ ] T050 [US3] `src/app/tracker.ts` (yazım aşaması): expansion `speckit-specify` → aktif özellik zaten izleniyorsa yalnızca durum `writing`; değilse `pendingWriting` (snapshot, `applyModel(writingModel)`) oluştur ve `featureChanged` olayında yeni `featureDir`'e bağla, 24 saatte bağlanmazsa geri al; `src/persistence/trackingStore.ts`'e `pendingWriting` okuma/yazma ekle; `onDidChangeConfiguration` → geçersiz eşikte uyarı + son geçerli değer, geçerli değişiklikte `awaitingApproval` önerisini yeniden hesapla (FR-003, FR-020, FR-021)
- [ ] T051 [US3] `src/ui/setup.ts`: `tokenomist.openSetup` — mod QuickPick'i, her mod için "Basit → X · Orta → Y · Karmaşık → Z" açıklaması, seçimde `tokenomist.mode` güncellenir; eşikler için "Ayarlarda düzenle" bağlantısı (`workbench.action.openSettings` `tokenomist.`) (FR-020)
- [ ] T052 [US3] US3 komut/ayar metinlerini l10n dosyalarına ekle (FR-025)

**Checkpoint**: quickstart S2–S4 geçer

---

## Phase 6: User Story 4 - Kurulum ve Claude Code algılama (Priority: P4)

**Goal**: Kurulumda Claude Code algılanır; yoksa veya model dışarıdan sabitlenmişse kullanıcı bilgilendirilir ve hiçbir şey yazılmaz; varsa ilk ayar önerilir.

**Independent Test**: quickstart.md S1, S13, S14.

### Tests (önce yaz)

- [ ] T053 [US4] `tests/integration/activation.test.ts`: Claude Code yokken (eklenti sahte olarak devre dışı) → bildirim + status bar `passive`, `settings.local.json` oluşturulmaz; `ANTHROPIC_MODEL` tanımlı → pasif + açıklama; bozuk JSON → yazılmaz + uyarı; `.specify/feature.json` olmayan çalışma alanı → pasif, dosyaya yazılmaz (Edge Cases); ilk etkinleşmede (globalState bayrağı yok) Claude Code varsa "İlk ayarı aç" önerisi (FR-001, research R6)

### Implementation

- [ ] T054 [US4] `src/extension.ts`: ilk çalıştırma bayrağı (`globalState`), Claude Code yoksa "Claude Code gerekli" bildirimi + Marketplace bağlantısı, varsa `tokenomist.openSetup` önerisi; pasif nedenini status bar tıklamasında açıkla (FR-001, contracts/vscode-contributions.md Activation)
- [ ] T055 [US4] Spike sonucu (T006) kapılardan birini desteklemiyorsa: `src/app/hookServer.ts` için "kapı pasif" durumu ve `src/app/tracker.ts` içinde yalnızca dosya izleme + bildirim geri düşüşü; destekleniyorsa bu görevi "uygulanamaz" notuyla kapat
- [ ] T056 [US4] US4 metinlerini l10n dosyalarına ekle (FR-025)

**Checkpoint**: Tüm hikâyeler bağımsız çalışır

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T057 [P] `src/app/tracker.ts` + `package.json`: `tokenomist.cleanClaudeSettings` komutu — aktif kilit varsa onay ister, orijinal modeli geri yükler, `removeTokenomistHooks`, kullanıcı girdileri korunur (Kısıt 4, quickstart S15)
- [ ] T058 [P] `src/uninstall.ts` + `package.json` `scripts.vscode:uninstall: node ./out/src/uninstall.js` (T001'den buraya taşındı; dosya yokken betik tanımlı olmasın): `vscode:uninstall` betiği — VS Code kullanıcı veri dizinindeki `workspaceStorage/*/workspace.json` kayıtlarından çalışma alanı köklerini bul, her birinin `.claude/settings.local.json` dosyasından Tokenomist hook girdilerini kaldır; vscode API kullanmaz, yalnızca `src/domain/claudeSettingsDoc.ts` (research R7)
- [ ] T059 [P] `tests/unit/uninstall.test.ts`: geçici dizinde sahte workspaceStorage ile T058 davranışı
- [ ] T060 [P] Tüm `vscode.l10n.t` anahtarlarının `l10n/bundle.l10n.tr.json` içinde karşılığı olduğunu doğrulayan `tests/unit/l10nCoverage.test.ts` (FR-025, quickstart S12)
- [ ] T061 [P] Ağ erişimi denetimi: `tests/unit/noNetwork.test.ts` — `src/` altında `http.request`, `https`, `fetch`, `net.connect` kullanımının olmadığını, yalnızca `hookServer.ts` içinde `127.0.0.1` dinleyicisi bulunduğunu doğrula (FR-022)
- [ ] T062 `README.md`: kurulum, modlar tablosu, "model yeni konuşmada geçerli olur" açıklaması, Claude Code ayarlarında hangi girdilerin yazıldığı ve temizleme komutu, gizlilik (telemetri yok)
- [ ] T063 quickstart.md S1–S15'i elle çalıştır; sonuçları `specs/001-spec-model-routing/quickstart.md` sonuna "Doğrulama kaydı" olarak ekle

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: bağımlılık yok. T006 (spike) T034 ve T055'ten önce bitmeli
- **Foundational (Phase 2)**: Setup'a bağlı; tüm hikâyeleri bloklar
- **US1 (Phase 3)**: Foundational'a bağlı; MVP
- **US2 (Phase 4)**: Foundational'a bağlı; uçtan uca değer için US1'in kilidini kullanır (test fixture'ı kilitli durumu doğrudan kurabilir → bağımsız test edilebilir)
- **US3 (Phase 5)**: Foundational'a bağlı; T050, T030/T031 ile aynı dosyada olduğu için US1'den sonra
- **US4 (Phase 6)**: Foundational'a bağlı; T055, T006 ve T029'a bağlı
- **Polish (Phase 7)**: istenen hikâyeler bittikten sonra

### Dosya çakışmaları (sıralı yapılmalı)

- `src/app/tracker.ts`: T030 → T031 → T042 → T050 → T055 → T057
- `src/extension.ts`: T018 → T035 → T044 → T054
- `package.json`: T001 → T035 → T044 → T048 → T057
- l10n dosyaları: T005 → T036 → T044 → T052 → T056

### Within Each User Story

- Testler önce yazılır ve kırmızı olmalıdır (Anayasa III)
- `domain/` → `app/` → `ui/` → kayıt (`extension.ts`, `package.json`) → l10n

## Parallel Example: User Story 1

```text
# Testler birlikte:
T019 fixtures · T020 scoring.test · T021 classification.test · T022 gateDecisions.test

# Saf modüller birlikte:
T025 scoring.ts · T026 classification.ts · T027 gateDecisions.ts · T028 sessionModels.ts

# UI birlikte (T030 sonrası):
T032 statusBar.ts · T033 recommendation.ts
```

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 (özellikle T006 spike: hook olaylarının gerçekten geldiğini doğrula)
2. Phase 2
3. Phase 3 → quickstart S5–S9 ile doğrula → **dur ve dene**

### Incremental Delivery

US1 (öneri + kilit) → US2 (geri yükleme + özet; Kısıt 4'ün tam karşılanması) → US3 (modlar/eşikler) → US4 (kurulum deneyimi) → Polish → Marketplace paketi. Her adım tek küçük PR (Anayasa V), commit mesajında FR numarası.
