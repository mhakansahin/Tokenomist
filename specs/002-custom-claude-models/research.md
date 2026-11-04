# Research: Özel Claude Model Eşlemesi

**Feature**: [spec.md](spec.md) · **Date**: 2026-11-04 · Önceki kararlar: [001 research](../001-spec-model-routing/research.md)

## R1. Claude Code özel değerleri hook'larda nasıl bildiriyor? (spike)

Ortam: Claude Code CLI 2.1.316, `claude -p "/model <değer>"`, `PreModelSwitch` http hook'u `deny` döndürdü (her çağrı maliyet 0).

| `/model` değeri | `requested_model` | `to_model` | Not |
|---|---|---|---|
| `opus[1m]` | `opus[1m]` | `claude-opus-5-5` | `[1m]` yalnızca `requested_model`'da |
| `sonnet[1m]` | `sonnet[1m]` | `claude-sonnet-5-5` | aynı |
| `opusplan` | `opusplan` | `claude-sonnet-5-5` | plan modu dışında Sonnet |
| `claude-opus-5-5` | `claude-opus-5-5` | `claude-opus-5-5` | |
| `default` | `null` | `claude-opus-5-5` | |
| `fable`, `best` | — | — | Hook çağrılmadı: "Fable 5.1 uses usage credits and needs a one-time consent · pick Fable from /model in an interactive session" |

**Decision**:
- Kilit karşılaştırması `requested_model` değerini birincil kaynak olarak kullanır. Bu değer yoksa (`null`) `to_model` ailesine düşer.
- İki değer **uyumlu** sayılır: (a) normalize edilmiş halleri birebir aynıysa, ya da (b) ikisi de aynı aileden ve aynı bağlam varyantındaysa. Örneğin kilit `opus`, istek `claude-opus-5-5` → uyumlu. Kilit `opus[1m]`, istek `opus` → uyumsuz.
- `opusplan` yalnızca `opusplan` ile uyumludur. Kullanıcının istediği `/model sonnet` bir değişiklik sayılır ve kullanıcıya sorulur. Claude Code'un plan moduna girip çıkarken kendi yaptığı geçişler yalnızca `PostModelSwitch` (`source: "auto"`) olayına düşer. Tokenomist bunları ihlal saymaz; zaten engelleyemez de.
- **Spec etkisi**: FR-009'daki "Opus ve Sonnet ailelerine geçişlerin ikisi de uyumludur" cümlesi yalnızca kendiliğinden geçişler için geçerlidir. Bu cümle buna göre daraltılır (spec güncellemesi, bkz. R5).

**Rationale**: `to_model` alanı bağlam varyantını kaybediyor. Yalnız ona bakılırsa `opus[1m]` kilidiyle `/model opus` ayırt edilemez.

## R2. Fable / `best` kullanım kredisi

**Decision**: `fable`, `fable[1m]` ve `best` FR-003'e göre kabul edilmeye devam eder. Ancak bu değerlerden biri bir hücreye yazıldığında ya da öneri ekranında seçildiğinde kullanıcı **bir kez uyarılır**: "Fable abonelik limitinin dışında kullanım kredisiyle ücretlendirilir ve etkileşimli `/model` ile tek seferlik onay ister." Tasarruf ağırlığı 1,0, tasarruf durumu "tahmin yok" (spec Q2).

**Rationale**: Tokenomist'in amacı limit ve maliyet düşürmek. Fable'ın fark ettirmeden ek ücretle kilitlenmesi bu amaca ters düşer. Değeri yasaklamak ise kullanıcının bilinçli tercihini engeller.

**Alternatives considered**: Fable'ı reddetmek. Spec, Claude Code'un kabul ettiği her Claude değerini istiyor; reddetmek kapsam daraltır.

## R3. Değer grameri ve normalizasyon (FR-003–FR-005)

**Decision**: `normalize(v) = v.trim().toLowerCase()`. Ardından şu kurallara bakılır:

```text
alias      := haiku | sonnet | opus | fable | best
long       := (sonnet | opus | fable) "[1m]"
plan       := opusplan
fullId     := "claude-" [a-z0-9.-]+ ("[1m]")?
value      := alias | long | plan | fullId
```

Reddedilenler: `default`, boş değer, `haiku[1m]` (Claude Code listesinde yok), `[1m]` dışındaki son ekler, `claude-` ile başlamayan her şey.

Aile çıkarımı: alias/long → kendi adı; `opusplan` → özel; fullId → `haiku|sonnet|opus|fable` alt dizgisi tam olarak bir kez geçiyorsa o aile, aksi halde "bilinmiyor".

## R4. Tasarruf ağırlıkları (FR-010)

| Değer | Ağırlık | Tahmin |
|---|---|---|
| `haiku`, `claude-haiku-*` | 0.2 | var |
| `sonnet`, `sonnet[1m]`, `claude-sonnet-*` | 0.6 | var |
| `opus`, `opus[1m]`, `claude-opus-*` | 1.0 | var |
| `opusplan` | 0.8 | var |
| `fable*`, `best`, ailesi bilinmeyen fullId | 1.0 | **yok** |

Bir spec'in herhangi bir kilit segmenti "tahmin yok" ise özetin tasarrufu "tahmin yok" olarak işaretlenir. Sayısal değer yine hesaplanır (bu segmentler %0 katkı verir) ama özette yüzdenin yanında not gösterilir.

`[1m]` varyantlarının 200K token üzerindeki ek fiyatı hesaba katılmaz (spec Assumptions: varyant kendi ailesinin ağırlığını kullanır).

## R5. Tip değişikliği: `Model` → `ModelValue`

**Decision**: Kilit, öneri, segment ve özetteki model alanları `Model` (`"haiku"|"sonnet"|"opus"`) yerine doğrulanmış bir `ModelValue` (marka tipli string) olur. Aile işlemleri `modelFamily(value)` ile yapılır. Mevcut kayıtlar (`"opus"` vb.) geçerli `ModelValue` olduğu için **göç (migration) gerekmez**. `SpecSummary`'ye isteğe bağlı `savingsUnknown?: true` eklenir; eski kayıtlarda alan yoktur, yani tahmin var sayılır.

**Rationale**: Değer Claude Code ayarına aynen yazılmak zorunda (SC-005). Aileye indirgemek bilgi kaybettirir.

## R6. Ayarlar ve arayüz (FR-001, FR-002, FR-012–FR-014)

**Decision**:
- `tokenomist.mode` enum'una `custom` eklenir.
- Yeni ayarlar: `tokenomist.custom.simple`, `.medium`, `.complex`, `.writing`. Hepsi `string`, varsayılanları `""` (boş = Dengeli / 001 davranışı).
- Ayar şemasında bir `pattern` alanı R3 gramerini VS Code Ayarlar ekranında anında doğrular. Çalışma zamanı doğrulaması yine `domain/` içindeki tek kaynaktan (`modelValue.ts`) yapılır.
- İlk ayar ekranı: Özel seçilince sırayla 4 hücre için QuickPick açılır. Seçenekler: hazır değerler, "Boş bırak (Dengeli)", "Başka bir değer yaz…". Son seçenek doğrulamalı bir InputBox açar.
- Öneri ekranı (FR-014): önerilen → Haiku/Sonnet/Opus → Özel tablodaki değerler (tekrarlar bir kez) → "Başka bir Claude modeli yaz…".

## Etkilenen 001 modülleri

`domain/types`, `classification` (custom mod + `resolveMapping`), `settingsValidation` (custom hücreler), `savings` (ağırlık tablosu → fonksiyon), `gateDecisions` (uyumluluk kuralı R1), `claudeSettingsDoc.applyModel` (ModelValue), `app/sessionModels` (requested_model), `app/tracker`, `ui/labels`, `ui/recommendation`, `ui/setup`, `ui/summaries`, `package.json` + l10n.
