# Implementation Plan: Spec Bazlı Model Yönlendirme (Tokenomist)

**Branch**: `001-spec-model-routing` | **Date**: 2026-11-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-spec-model-routing/spec.md`

## Summary

Tokenomist bir VS Code eklentisidir. Aktif Spec Kit özelliğini dosya izleme ile takip eder, `spec.md`'yi yerel kural tabanlı skorla basit/orta/karmaşık olarak sınıflar, seçili moda göre Haiku/Sonnet/Opus önerir ve onaydan sonra modeli çalışma alanının `.claude/settings.local.json` dosyasındaki `model` anahtarı ile kilitler. Spec bitince yalnızca bu anahtarı orijinal haline döndürür.

Claude Code ayar dosyasındaki `model`'i yalnızca **oturum başında** okur. Bu yüzden kilit, yeni açılan konuşmalarda geçerli olur. Tokenomist SDD komutlarını (`/speckit-specify|plan|tasks|implement`) ve `/model` geçişlerini Claude Code'un **HTTP hook'ları** ile, eklenti içinde çalışan `127.0.0.1` sunucusunda yakalar. Gerekirse kullanıcıya "yeni konuşma aç / bu oturumda devam et" sorar. Ayrıntılar: [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Node 20 (VS Code Electron çalışma zamanı)

**Primary Dependencies**: VS Code Extension API (`engines.vscode ^1.94.0`); çalışma zamanı bağımlılığı yok (Node `http`, `crypto`, `fs`). Geliştirme: `typescript`, `@types/vscode`, `@types/node`, `@vscode/test-electron`, `@vscode/vsce`

**Storage**: `workspaceState` (izleme/kilit), `globalState` (spec özetleri), VS Code ayarları (`tokenomist.*`); Claude Code'un `.claude/settings.local.json` dosyasında sahip olunan girdiler ([contract](contracts/claude-settings-and-hooks.md))

**Testing**: Birim: `node:test` (vscode'suz saf modüller). Entegrasyon: `@vscode/test-electron`

**Target Platform**: VS Code masaüstü (Windows, macOS, Linux), Claude Code VS Code eklentisi ≥ hook olaylarını destekleyen sürüm

**Project Type**: VS Code eklentisi (tek proje, istemci tarafı)

**Performance Goals**: Analiz < 2 sn (SC-002; hedef < 50 ms). Etkinleşme `onStartupFinished` ile açılışı geciktirmez

**Constraints**: Analizde model çağrısı yok (FR-006/007). Telemetri yok, ağ yalnızca `127.0.0.1` (FR-022). Claude Code ayarlarında yalnızca sahip olunan girdiler, tam geri yükleme (Kısıt 4)

**Scale/Scope**: Tek kullanıcı. Çalışma alanı başına 1 aktif kilit. ≤ 500 özet kaydı

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| İlke / Kısıt | Durum | Not |
|---|---|---|
| I. Spec önce gelir | ✅ | spec.md + clarify tamam; görevler FR numaralarını referans verecek |
| II. Belirsizlik işaretlenir | ✅ | Spec'te `NEEDS CLARIFICATION` yok; teknik bilinmeyenler research.md'de çözüldü |
| III. Test önce | ✅ | Birim + entegrasyon katmanları; kabul senaryoları → [quickstart.md](quickstart.md) eşlemesi |
| IV. Sadelik / teknoloji | ✅ | TypeScript + VS Code API; çalışma zamanı bağımlılığı yok, backend yok. Geliştirme araçları ve loopback hook dinleyicisi anayasa 1.2.0 Technology Standards'ta tanımlı |
| V. Küçük adımlar | ✅ | Katmanlı modüller; her kullanıcı hikâyesi bağımsız teslim edilebilir |
| Mimari (sunum → uygulama → yerel kalıcılık) | ✅ | `ui/` → `app/` + `domain/` → `persistence/` |
| Kısıt 1: hakem pahalı olmasın | ✅ | Yalnızca yerel skorlama (R8) |
| Kısıt 2: spec içeriği 3. tarafa gitmez | ✅ | Ağ çağrısı yok; HTTP sunucusu yalnızca loopback, token korumalı |
| Kısıt 3: şüphede güçlü model | ✅ | Sınır payı ile bir üst seviye (R8, FR-008) |
| Kısıt 4: Claude Code'a dokunmama | ✅ | Yalnızca local dosyadaki sahip olunan girdiler. User ayarına yalnızca `/model` onu değiştirdiyse ve sadece geri yüklemek için dokunulur (R5, R6). Temizlik komutu + uninstall betiği (R7) |

**Post-design re-check (Phase 1 sonrası)**: ✅ Tüm satırlar geçerli; yeni ihlal yok.

## Project Structure

### Documentation (this feature)

```text
specs/001-spec-model-routing/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── vscode-contributions.md
│   └── claude-settings-and-hooks.md
├── checklists/requirements.md
└── tasks.md              # /speckit-tasks
```

### Source Code (repository root)

```text
package.json                 # contributes: commands, configuration; activationEvents; vscode:uninstall
package.nls.json / package.nls.tr.json
l10n/bundle.l10n.tr.json
tsconfig.json
src/
├── extension.ts             # activate/deactivate, bileşenlerin bağlanması
├── domain/                  # saf, vscode'suz (birim testli)
│   ├── types.ts             # Model, Level, Mode, kayıt tipleri
│   ├── scoring.ts           # sinyal çıkarımı + skor (R8)
│   ├── classification.ts    # eşik, sınır payı, mod eşlemesi (FR-005, FR-008, FR-020)
│   ├── settingsValidation.ts# eşik doğrulama (FR-021)
│   ├── savings.ts           # tasarruf tahmini (R9)
│   ├── tracking.ts          # TrackingState durum makinesi (data-model)
│   ├── tasksProgress.ts     # tasks.md tamamlanma algısı (FR-015)
│   ├── claudeSettingsDoc.ts # settings.local.json birleştir/geri yükle (saf JSON dönüşümü)
│   └── gateDecisions.ts     # hook isteği + durum → kapı kararı (contract tabloları)
├── app/
│   ├── claudeDetector.ts    # Claude Code eklentisi + model override guard'ları (FR-001, R6)
│   ├── specKitWatcher.ts    # feature.json / spec / plan / tasks izleme (FR-002)
│   ├── claudeSettingsStore.ts # atomik okuma/yazma, .git/info/exclude
│   ├── hookServer.ts        # 127.0.0.1 HTTP sunucusu, token, zaman aşımı (R2–R5)
│   ├── tracker.ts           # orkestrasyon: analiz, kilit, bitiş, askıya alma
│   └── sessionModels.ts     # session_id → son bilinen model (R4)
├── ui/
│   ├── statusBar.ts         # FR-013
│   ├── recommendation.ts    # onay QuickPick (FR-009, FR-010)
│   ├── gatePrompts.ts       # kapı modal'ları
│   ├── setup.ts             # ilk ayar / mod tablosu (FR-020)
│   └── summaries.ts         # özet listesi (FR-017, FR-019)
├── persistence/
│   ├── trackingStore.ts     # workspaceState (FR-014)
│   └── summaryStore.ts      # globalState, 500 FIFO
└── uninstall.ts             # vscode:uninstall temizliği (R7)
tests/
├── unit/                    # node:test; domain/* için
├── integration/             # @vscode/test-electron; app/ + ui/ akışları, sahte hook POST'ları
└── fixtures/
    ├── specs/{simple,medium,complex}/*.md   # SC-005 etiketli set
    └── workspace/           # Spec Kit yapılı test çalışma alanı
.github/workflows/ci.yml     # derleme + birim + entegrasyon (xvfb) + vsce package
```

**Structure Decision**: Tek proje VS Code eklentisi. Anayasa katmanları: `ui/` (sunum) → `app/` + `domain/` (uygulama mantığı; `domain/` saf ve birim testli) → `persistence/` + `app/claudeSettingsStore.ts` (yerel kalıcılık).

## Complexity Tracking

| Karar | Neden gerekli | Daha basit alternatif neden reddedildi |
|---|---|---|
| Eklenti içi loopback HTTP sunucusu (Node `http`, ek bağımlılık yok) | Claude Code komutlarını ve `/model` geçişlerini yakalamanın kabuktan bağımsız tek yolu `http` hook'u (FR-023, FR-024) | `command` hook: Windows'ta kabuk/Node bağımlılığı. Yalnızca dosya izleme: plan'ın yanlış modelle başlamasını ve `/model` geçişini engelleyemez |
| Geliştirme araçları (`@vscode/test-electron`, `@vscode/vsce`) | Anayasa III entegrasyon testi ve Marketplace dağıtımı ister | Alternatifi yok; çalışma zamanına girmezler. Anayasa 1.2.0 Technology Standards'a eklendi |
