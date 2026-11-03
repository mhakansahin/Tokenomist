# Data Model: Spec Bazlı Model Yönlendirme

**Feature**: [spec.md](spec.md) · Kararlar: [research.md](research.md)

Tüm veri yereldir (anayasa: sunucu yok). `Model` = `"haiku" | "sonnet" | "opus"`, `Level` = `"simple" | "medium" | "complex"`.

## SpecRef

Bir Spec Kit özelliğini tanımlar. Kimlik: çalışma alanı kökü + özellik dizini.

| Alan | Tür | Not |
|---|---|---|
| `workspaceRoot` | string | mutlak yol |
| `featureDir` | string | `.specify/feature.json` → `feature_directory`, örn. `specs/001-spec-model-routing` |
| `name` | string | spec başlığı (`# Feature Specification: …`), yoksa dizin adı |

## SpecAnalysis (FR-004–FR-009)

| Alan | Tür | Kural |
|---|---|---|
| `spec` | SpecRef | |
| `specHash` | string | spec.md içeriğinin SHA-256'sı; değişince yeniden hesaplanır |
| `signals` | `{ requirements, stories, entities, integrations, ambiguities, edgeCases: number }` | ≥ 0 |
| `score` | number | 0–100 |
| `level` | Level | eşiklere göre |
| `borderlineBumped` | boolean | FR-008 nedeniyle bir üst seviyeye çıkarıldı mı |
| `recommendedModel` | Model | `ModeSettings.mapping[mode][level]` |
| `reasons` | string[] | en yüksek katkılı 3 sinyal, yerelleştirilmiş |
| `analyzedAt` | ISO tarih | |

Geçersiz durum: spec okunamaz/boş veya `requirements + stories == 0` → analiz `unavailable`, öneri yok, kullanıcıdan elle seçim istenir.

## ModelSnapshot (orijinal model, R6)

| Alan | Tür | Not |
|---|---|---|
| `localModel` | `{ present: false } \| { present: true, value: string }` | `.claude/settings.local.json` → `model` |
| `userModel` | aynı tür, opsiyonel | yalnızca `/model <ad>` user ayarını değiştirdiğinde alınır (R5) |
| `createdLocalFile` | boolean | dosyayı Tokenomist oluşturduysa geri yüklemede boşsa silinir |
| `takenAt` | ISO tarih | |

## PendingWriting (çalışma alanı başına, `workspaceState`)

`/speckit-specify` çalıştığı anda yeni özellik dizini henüz yoktur (`feature.json` sonra güncellenir). Spec yazımı müdahalesi geçici olarak bu kayıtta tutulur.

| Alan | Tür | Kural |
|---|---|---|
| `original` | ModelSnapshot | specify anında alınır |
| `writingModel` | Model | |
| `createdAt` | ISO tarih | 24 saat içinde bir `featureDir`'e bağlanmazsa local `model` `original`'e döner ve kayıt silinir |

Bağlanma: `featureChanged` olayında aktif `featureDir` izlenmiyorsa `PendingWriting` → yeni `SpecTracking { state: writing, original, writingModel }`. Çalışma alanında en fazla bir `PendingWriting` olur.

## SpecTracking (çalışma alanı başına, `workspaceState`)

Tokenomist'in izlediği her spec için bir kayıt. Aynı `featureDir` için tek kayıt olur.

| Alan | Tür | Not |
|---|---|---|
| `spec` | SpecRef | |
| `state` | TrackingState | aşağıdaki durum makinesi |
| `original` | ModelSnapshot | ilk müdahalede alınır (FR-003) veya kilitte (FR-011) |
| `writingModel` | Model? | spec yazımında uygulanan model |
| `analysis` | SpecAnalysis? | son analiz |
| `lock` | ModelLock? | |
| `startedAt` | ISO tarih | |

### ModelLock (FR-010–FR-014, FR-023)

| Alan | Tür | Not |
|---|---|---|
| `model` | Model | kilitli model |
| `recommendedModel` | Model | kilit anındaki öneri |
| `level` | Level | |
| `manualOverride` | boolean | öneri değiştirildi ya da kilit FR-023 ile güncellendi |
| `lockedAt` | ISO tarih | |
| `segments` | `{ model: Model, from: ISO, to?: ISO }[]` | tasarrufun süreyle ağırlıklandırılması için (R9) |

### TrackingState geçişleri

```text
(yok) ──specify algılandı──▶ PendingWriting ──feature.json yeni dizin──▶ writing ──spec kaydedildi, plan yok──▶ awaitingApproval
writing/awaitingApproval ──onay veya elle seçim──▶ locked
awaitingApproval ──spec değişti──▶ awaitingApproval (öneri yeniden hesaplanır)
locked ──tüm görevler [x] algılandı──▶ completionPending
completionPending ──kullanıcı reddetti──▶ locked
locked/completionPending ──"spec'i bitir" onayı──▶ completed  (orijinal model geri yüklenir, SpecSummary yazılır, kayıt silinir)
herhangi ──aktif özellik başka spec'e geçti──▶ suspended (local model orijinale döndürülür)
suspended ──özellik tekrar aktif──▶ önceki durum (kilit varsa kilitli model yeniden yazılır)
```

Kurallar:
- `locked` iken spec değişikliği analizi günceller ama kilidi değiştirmez.
- Aynı anda yalnızca aktif özelliğin kaydı `model` anahtarını yönetir. `suspended` kayıtlar ayara dokunmaz.
- VS Code yeniden açılışında durum `workspaceState`'ten yüklenir. `locked` ise local `model` anahtarının hâlâ kilitli modeli gösterdiği doğrulanır.

## ModeSettings (VS Code ayarları, FR-020, FR-021, FR-003)

| Ayar | Tür | Varsayılan | Doğrulama |
|---|---|---|---|
| `tokenomist.mode` | `"saver" \| "balanced" \| "quality"` | `balanced` | enum; arayüz adları: saver = Tasarruf, balanced = Dengeli, quality = Kalite |
| `tokenomist.thresholds.medium` | number | 35 | 1–98, < `complex` |
| `tokenomist.thresholds.complex` | number | 65 | 2–99, > `medium` |
| `tokenomist.borderlineMargin` | number | 5 | 0–20 |
| `tokenomist.writingModel.followMode` | boolean | false | `false` → Sonnet; `true` → saver=Haiku, balanced=Sonnet, quality=Opus |

Seviye→model eşlemesi (sabit tablo, FR-020):

| Mod | simple | medium | complex |
|---|---|---|---|
| saver | haiku | haiku | sonnet |
| balanced | haiku | sonnet | opus |
| quality | sonnet | opus | opus |

Geçersiz eşik çifti kaydedilmez. Ayar ekranı hatayı gösterir, motor son geçerli değerleri kullanır.

## SpecSummary (FR-017–FR-019, `globalState`)

| Alan | Tür |
|---|---|
| `id` | string (`workspaceRoot#featureDir#completedAt`) |
| `specName`, `workspaceName` | string |
| `level` | Level |
| `recommendedModel`, `usedModel` | Model (`usedModel` = süreyle baskın model) |
| `manualOverride` | boolean |
| `estimatedSavingsPct` | number 0–100 (R9) |
| `startedAt`, `completedAt` | ISO tarih |

Saklama: en fazla son 500 özet (FIFO). Telemetri yok (FR-022).
