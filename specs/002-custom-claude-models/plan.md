# Implementation Plan: Özel Claude Model Eşlemesi

**Branch**: `002-custom-claude-models` | **Date**: 2026-11-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-custom-claude-models/spec.md`

## Summary

001'in üç sabit modunun yanına dördüncü bir **Özel** mod eklenir. Bu modda her seviyeye (ve spec yazımına) bir Claude model değeri atanabilir; boş hücre Dengeli'nin değerini alır. Değerler tek bir saf modülde (`domain/modelValue.ts`) doğrulanır. Kabul edilenler yalnızca Claude Code'un kabul ettiği Claude değerleridir: takma adlar, `[1m]` varyantları, `opusplan` ve `claude-…` kimlikleri. Doğrulanan değer ayara aynen yazılır.

Kilit sırasında `/model` kontrolü Claude Code'un `requested_model` alanına dayanır, çünkü `to_model` alanı `[1m]` bilgisini taşımıyor (research R1, ölçüldü). Fable ve `best` ek kullanım kredisi gerektirdiği için kullanıcı bir kez uyarılır (R2).

## Technical Context

**Language/Version**: TypeScript 5.x (strict). 001 ile aynı.

**Primary Dependencies**: VS Code Extension API. Yeni bağımlılık yok.

**Storage**: Yeni VS Code ayarları `tokenomist.custom.*`. `workspaceState` ve `globalState` kayıtlarında model alanları string `ModelValue` oluyor; göç gerekmiyor (R5).

**Testing**: `node:test` (birim + node entegrasyon) ve `@vscode/test-electron`. Gerçek `claude -p` ile maliyetsiz uçtan uca kontrol: quickstart C6.

**Target Platform / Project Type**: 001 ile aynı (VS Code eklentisi).

**Performance Goals**: Doğrulama her çağrıda 1 ms'nin altında, ihmal edilebilir.

**Constraints**: Anayasa Kısıt 2: yalnızca Claude değerleri. SC-002: 001 testleri değişmeden geçmeli.

**Scale/Scope**: Yaklaşık 14 dosyaya dokunuluyor (research "Etkilenen 001 modülleri"). Yeni modül: `domain/modelValue.ts`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| İlke / Kısıt | Durum | Not |
|---|---|---|
| I. Spec önce gelir | ✅ | 002 spec + clarify. Plan bulgusundan çıkan iki spec düzeltmesi (FR-009, FR-015) spec'e işlendi |
| II. Belirsizlik işaretlenir | ✅ | `NEEDS CLARIFICATION` yok |
| III. Test önce | ✅ | Gramer ve eşleşme tabloları önce birim testine dönüşür |
| IV. Sadelik / teknoloji | ✅ | Yeni bağımlılık ve altyapı yok |
| V. Küçük adımlar | ✅ | `ModelValue` tipi geriye uyumlu. Önce domain, sonra ayarlar, en son UI |
| Kısıt 1 (hakem) | ✅ | Değişmedi |
| Kısıt 2 (yalnız Anthropic) | ✅ | Claude dışı değerler gramerle reddediliyor (SC-001) |
| Kısıt 3 (şüphede güçlü) | ✅ | Seviye kuralı değişmedi |
| Kısıt 4 (Claude Code'a dokunmama) | ✅ | Değer aynen yazılır ve aynen geri yüklenir (001 mekanizması) |

**Post-design re-check**: ✅

## Project Structure

### Documentation (this feature)

```text
specs/002-custom-claude-models/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/settings-and-matching.md
├── checklists/requirements.md
└── tasks.md            # /speckit-tasks
```

### Source Code (repository root)

```text
src/domain/modelValue.ts        # YENİ: gramer, normalize, aile, görünen ad, ağırlık, compatible()
src/domain/types.ts             # ModelValue, Mode += "custom", SpecSummary.savingsUnknown
src/domain/classification.ts    # resolveMapping(mode, custom), writingValueFor()
src/domain/settingsValidation.ts# custom hücre doğrulaması (son geçerli değer)
src/domain/savings.ts           # ağırlık = modelValue.weight; savingsUnknown
src/domain/gateDecisions.ts     # requested_model + compatible() (contract tablosu)
src/domain/claudeSettingsDoc.ts # applyModel(ModelValue)
src/app/sessionModels.ts        # requested_model öncelikli gözlem
src/app/tracker.ts              # ModelValue akışı, fable uyarısı, özel tablo
src/ui/labels.ts, recommendation.ts, setup.ts, summaries.ts, statusBar.ts
src/extension.ts                # custom ayarları okuma
package.json, package.nls*.json, l10n/bundle.l10n.tr.json
tests/unit/modelValue.test.ts (YENİ), mevcut testlerin genişletilmesi
tests/integration/customMode.test.ts (YENİ)
```

**Structure Decision**: 001'in yapısı korunuyor. Değer kuralları tek bir saf modülde toplanıyor; UI, ayarlar ve hook kararları bu modülü kullanıyor.

## Complexity Tracking

Yok: anayasa ihlali yok.
