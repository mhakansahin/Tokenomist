# Data Model: Özel Claude Model Eşlemesi

001 veri modelinin üzerine yapılan değişiklikler ([001 data-model](../001-spec-model-routing/data-model.md)). Kararlar: [research.md](research.md).

## ModelValue (yeni)

Doğrulanmış, normalize edilmiş Claude model değeri (R3 grameri). Saf fonksiyonlar `src/domain/modelValue.ts` dosyasındadır.

| Türetilen alan | Tür | Kural |
|---|---|---|
| `kind` | `"alias" \| "long" \| "plan" \| "fullId"` | R3 |
| `family` | `"haiku" \| "sonnet" \| "opus" \| "fable" \| undefined` | `opusplan` → undefined, `best` → undefined |
| `longContext` | boolean | `[1m]` son eki |
| `displayName` | string | `opus` → "Opus", `opus[1m]` → "Opus 1M", `opusplan` → "Opus Plan", `best` → "Best", fullId → olduğu gibi |
| `weight` | number | R4 tablosu |
| `savingsKnown` | boolean | R4 tablosu |
| `usesCredits` | boolean | `fable*`, `best` → true (R2) |

İşlemler: `parseModelValue(raw) → { ok: true, value } | { ok: false, reason: "empty" \| "notClaude" \| "unknownVariant" \| "default" }`, `compatible(locked, requested)` (R1 kuralı).

## Mod ve eşleme

- `Mode` = `"saver" | "balanced" | "quality" | "custom"`.
- `CustomTable` = `{ simple?, medium?, complex?, writing? : ModelValue }`. Ayarlardan okunur; geçersiz hücre son geçerli değerini korur (FR-004).
- `resolveMapping(mode, custom)`: `custom` → her seviye için `custom[level] ?? MODE_MAPPING.balanced[level]`; diğer modlar → 001 tablosu (FR-006).
- `writingValueFor(mode, followMode, custom)`: `custom` ve `custom.writing` doluysa o değer; aksi halde 001 `writingModelFor` (FR-002).

## 001 varlıklarında değişen alanlar

| Varlık | Alan | Eski | Yeni |
|---|---|---|---|
| SpecAnalysis | `recommendedModel` | Model | ModelValue |
| ModelLock | `model`, `recommendedModel` | Model | ModelValue |
| LockSegment | `model` | Model | ModelValue |
| PendingWriting / SpecTracking | `writingModel` | Model | ModelValue |
| SpecSummary | `recommendedModel`, `usedModel` | Model | ModelValue |
| SpecSummary | `savingsUnknown` | — | `true?` (yoksa tahmin var) |

Göç yok: eski kayıtlardaki `"haiku" | "sonnet" | "opus"` geçerli ModelValue'dur.

## Kilit kuralı (FR-011)

Özel tablo değişince `awaitingApproval` önerisi yeniden hesaplanır (001 `onSettingsChanged`). `locked` kayıt değişmez.
