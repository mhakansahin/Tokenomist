# Contract: Özel Mod Ayarları ve Model Eşleşme Kuralları

## VS Code ayarları (001'e eklenenler)

| Ayar | Tür | Varsayılan | Not |
|---|---|---|---|
| `tokenomist.mode` | enum | `balanced` | `custom` değeri eklenir ("Özel / Custom") |
| `tokenomist.custom.simple` | string | `""` | boş = Dengeli (Haiku) |
| `tokenomist.custom.medium` | string | `""` | boş = Dengeli (Sonnet) |
| `tokenomist.custom.complex` | string | `""` | boş = Dengeli (Opus) |
| `tokenomist.custom.writing` | string | `""` | boş = 001 FR-003 davranışı |

Şema `pattern` alanı (Ayarlar ekranında anında **biçim** uyarısı için):

```text
^\s*([A-Za-z0-9.\-]+(\[1[mM]\])?)?\s*$
```

Desen bilerek gevşek tutuldu: `engines.vscode ^1.94` (Chromium 124) satır içi `(?i:…)` bayrağını desteklemiyor (analyze I1). Anlam denetimi (Claude değeri mi, varyant geçerli mi) yalnızca `src/domain/modelValue.ts` içinde yapılır. Ayarın `patternErrorMessage` alanı `%config.custom.invalid%` olarak yerelleştirilir. Bir birim testi şunu denetler: `parseModelValue`'nun kabul ettiği hiçbir değeri desen reddetmez.

## Claude Code `settings.local.json`

001 sözleşmesi geçerlidir. Tek fark: `model` alanına artık doğrulanmış her ModelValue **aynen** yazılır, örneğin `"opus[1m]"`, `"opusplan"` ya da `"claude-opus-5-5"` (SC-005).

## PreModelSwitch eşleşmesi (R1)

`decidePreModelSwitch` hook'tan gelen değeri kilitli değerle şu sırayla karşılaştırır:

1. İstenen değer: `requested_model` normalize edilip ModelValue'ya çevrilir. Bu değer `null` ya da geçersizse istenen değer `to_model` ailesi kabul edilir (bağlam varyantı bilinmiyor).
2. Uyumlu sayılırsa (data-model `compatible`) → `allow`.
3. Uyumsuz ya da bilinmiyorsa → `askOverride`. "Kilidi güncelle" yalnızca istenen değer geçerli bir ModelValue ise sunulur.

| Kilit | `requested_model` | Sonuç |
|---|---|---|
| `opus` | `opus` / `claude-opus-5-5` | allow |
| `opus` | `opus[1m]` | ask (varyant farklı) |
| `opus[1m]` | `opus[1m]` | allow |
| `opus[1m]` | `null`, `to_model: claude-opus-5-5` | ask (varyant bilinmiyor) |
| `opusplan` | `opusplan` | allow |
| `opusplan` | `sonnet` | ask |
| `haiku` | `null` (`default`) | ask, "güncelle" yok |

## Oturum modeli (001 R4 genişletmesi)

`sessionModels.observe` için öncelik `requested_model`, yoksa `to_model` ailesidir. Kapıdaki "oturum kilitli modelle mi?" sorusu da aynı `compatible` kuralını kullanır. Ayar yazımından sonra açılan oturumlar için değer, ayardaki ModelValue'nun kendisidir.
