---

description: "Task list for Tek Konuşma Modu"
---

# Tasks: Tek Konuşma Modu

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md) · **Tests**: önce yazılır (Anayasa III). Yeni konuşma yönteminde 001–004 testleri değişmeden geçmeli (SC-004).

## Phase 1: Foundational

- [x] T001 [P] `tests/unit/skillFrontmatter.test.ts`: başlıklı dosyaya satır ekleme; kullanıcının `model:` satırının yerini alma; Tokenomist satırını güncelleme; başlıksız dosyaya başlık oluşturma; CRLF koruma; `hasTokenomistModel` (R6)
- [x] T002 `src/domain/skillFrontmatter.ts` (T001)
- [x] T003 [P] `tests/integration/skillModelStore.test.ts` (gerçek geçici git deposu): `locate` iki biçimi bulur (R5); izlenen dosyada `apply` → `git status --porcelain` boş (FR-004); `restore` → içerik bayt bayt aynı ve skip-worktree kalktı (SC-003); izlenmeyen ve git'siz klasörde de çalışır; özgün içerik ilk yazımda saklanır, ikinci `apply` onu ezmez; defter kaydı
- [x] T004 `src/app/skillModelStore.ts` + `src/app/restoreLedger.ts` (`skills` girdisi) (T003)

## Phase 2: User Story 1 - Bütün akış tek konuşmada (Priority: P1) 🎯 MVP

- [x] T005 [US1] `tests/integration/sameConversation.test.ts`: `conversation: "same"`, `automation: "auto"` iken (a) başlangıçta yazım tanımlarında yazım modeli, aşama tanımlarında satır yok; (b) spec kaydı → aşama tanımlarında öneri; (c) `/speckit-specify`, `/speckit-plan`, `/speckit-tasks` → hepsi `{}`, `newConversation` hiç çağrılmaz (SC-001), plan'da kilit konur; (d) `settings.local.json` `model` hiç yazılmaz (FR-003); (e) bitişte tanımlar bayt bayt eski hal (SC-003); (f) `/model` güncellemesi tanımları günceller (FR-008); (g) tanımı olmayan komut 004 akışına düşer (FR-007)
- [x] T006 [US1] `src/app/tracker.ts`: `TrackerSettings.conversation`, `syncSkills()`, `handleExpansion` `same` dalları, `syncModelKey` `same` iken sahiplik bırakma (T005)
- [x] T007 [US1] `src/ui/settings.ts`, `package.json` (`tokenomist.conversation`, `default: "same"`), `src/extension.ts` (skill store bağlantısı), `tests/integration/helpers.ts` (varsayılan `new`, böylece 001–004 testleri değişmez)

## Phase 3: User Story 2 - Proje dosyalarında iz kalmaması (Priority: P2)

- [x] T008 [US2] `tests/integration/cleanup.test.ts` + `tests/unit/uninstall.test.ts`'e ekle: temizleme komutu ve kaldırma betiği tanımları bayt bayt geri alır ve gizlemeyi kaldırır; kullanıcının kendi `model:` satırı geri gelir (FR-005)
- [x] T009 [US2] `src/app/tracker.ts` (`cleanClaudeSettings` → `restoreAll`), `src/uninstall.ts` (defterdeki `skills`) (T008)

## Phase 4: User Story 3 - Sorarak modda tek konuşma (Priority: P3)

- [x] T010 [US3] `tests/integration/sameConversation.test.ts`'e ekle: sorarak mod, kilitsiz `/speckit-plan` → onay → `block`, mesaj "bu konuşmada tekrar yaz", `newConversation` çağrılmaz; ikinci çağrı `{}` (FR-006)
- [x] T011 [US3] `src/app/tracker.ts` sorarak dalı (T010)

## Phase 5: Polish

- [x] T012 [P] l10n, `README.md` (tek konuşma, git gizleme, `git pull` notu), ilk ayar ekranında yöntem seçimi, status bar ipucu
- [x] T013 Gerçek CLI kontrolü: geçici git deposunda Spec Kit + `claude -p` ile aşama komutunun kilitli modelle çalıştığını ve `git status`'un temiz olduğunu doğrula (Haiku, küçük); `npm test`, `runTests.js`, `vsce package` (0.4.0)

## Notlar

- **Uygulamada eklendi (FR-007 düzeltmesi):** Projede `speckit-plan` tanımı yoksa çalışma alanı tamamen "yeni konuşma" yöntemine düşer; Claude Code'un model ayarı da 004'teki gibi yazılır. İlk uygulamada ayar yazılmıyordu ve yeni konuşma kilitli modelle başlamıyordu; VS Code testi yakaladı.
- **T013 (2026-11-08, gerçek CLI):** Geçici git deposunda, oturum `--model sonnet` ile başlatıldı; `/speckit-plan` durdurulmadan çalıştı ve turu yalnızca `claude-haiku-5-5` işledi; kilit sormadan kondu; yeni konuşma açılmadı; bitişte tanım bayt bayt geri geldi. `git status` çıktısında değiştirilen skill dosyası görünmedi; görünen iki giriş deneme betiğinin kendi hatasıydı (commit'ten sonra yazılan spec ve depo içindeki test defteri).
