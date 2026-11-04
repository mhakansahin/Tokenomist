# Feature Specification: Özel Claude Model Eşlemesi

**Feature Branch**: `002-custom-claude-models`

**Created**: 2026-11-03

**Status**: Draft

**Input**: User description: "Özel Claude model eşlemesi: Kullanıcı, Tokenomist'in her mod ve karmaşıklık seviyesi (basit/orta/karmaşık) için ve spec yazımı aşaması için kullanacağı modeli yalnızca haiku/sonnet/opus takma adlarıyla sınırlı kalmadan kendisi tanımlayabilmeli. Desteklenecek değerler yalnızca Claude Code'un kabul ettiği Claude modelleri olmalı: takma adlar (haiku, sonnet, opus, fable, best), geniş bağlam sürümleri (örn. opus[1m], sonnet[1m]), opusplan ve tam Claude model kimlikleri (örn. claude-opus-5-5). Claude dışı modeller kabul edilmemeli (anayasa Kısıt 2 bozulmamalı). Öneri ekranı, kilit, status bar, kilit sırasında /model kontrolü ve tasarruf özeti bu özel değerlerle doğru çalışmalı; tasarruf tahmini için her değerin Opus'a göre göreli ağırlığı belirlenmeli. Varsayılan davranış değişmemeli. Mevcut özellik: specs/001-spec-model-routing."

## Clarifications

### Session 2026-11-03

- Q: Özel atama nerede tanımlansın? → A: Kendi 3 hücreli tablosu (ve spec yazımı hücresi) olan dördüncü bir "Özel" mod; boş hücreler Dengeli moddaki değeri alır. Tasarruf/Dengeli/Kalite değişmez.
- Q: Tokenomist'in maliyetini bilmediği değerlerde tasarruf nasıl hesaplansın? → A: Ağırlık 1,0 (tasarruf %0) sayılır ve özette "tahmin yok" notu gösterilir.

### Session 2026-11-04

- Q: Özel modun hücrelerini kullanıcı nereden düzenlesin? → A: Her hücre bir VS Code ayarıdır; ayrıca ilk ayar ekranında "Özel" seçilince hücre hücre hazır değer listesi + serbest yazım sunulur.
- Q: Öneri ekranında elle model seçerken listede hangi değerler görünsün? → A: Haiku/Sonnet/Opus + Özel tablodaki değerler + en altta "Başka bir Claude modeli yaz…" serbest yazım satırı (FR-003 doğrulamalı).
- (Plan bulgusu) Claude Code hook'larında `[1m]` bilgisi yalnızca istenen değerde geliyor; `opusplan` kilidinde kullanıcının `/model sonnet` isteği uyumlu mu? → Hayır; yalnızca Claude Code'un plan moduna girip çıkarken kendiliğinden yaptığı geçişler uyumludur (FR-009 güncellendi). Fable/`best` ek kullanım kredisi gerektirdiği için seçildiğinde kullanıcı uyarılır (FR-015).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Bir seviyeye özel Claude modeli atamak (Priority: P1)

Geliştirici, karmaşık spec'lerde geniş bağlamlı Opus'u (`opus[1m]`), orta spec'lerde ise planı Opus ile yapıp uygulamayı Sonnet ile yürüten `opusplan`'ı kullanmak istiyor. "Özel" modu seçer ve bu değerleri o modun tablosundaki seviyelere atar; boş bıraktığı basit seviye Dengeli'deki gibi Haiku kalır. Tokenomist bu atamaları öneride, kilitte, status bar'da ve özette aynen kullanır.

**Why this priority**: Özelliğin tek amacı budur. Bu hikâye tek başına değer üretir.

**Independent Test**: Karmaşık seviyeye `opus[1m]` atanır ve karmaşık bir spec analiz edilir. Öneride `opus[1m]` görünür, onaydan sonra Claude Code ayarına `opus[1m]` yazılır ve status bar bu değeri gösterir.

**Acceptance Scenarios**:

1. **Given** mod "Özel" ve karmaşık seviyeye `opus[1m]` atanmış, **When** karmaşık bir spec analiz edilir, **Then** önerilen model `opus[1m]` olarak gösterilir.
2. **Given** öneri onaylandı, **When** model kilitlenir, **Then** Claude Code'un modeli bu çalışma alanının yeni konuşmaları için `opus[1m]` olur ve status bar `… · Karmaşık · Opus 1M` gösterir.
3. **Given** öneri ekranı açık, **When** kullanıcı model seçer, **Then** listede Haiku/Sonnet/Opus, Özel tablodaki dolu değerler ve en altta "Başka bir Claude modeli yaz…" satırı bulunur; bu satıra yazılan değer FR-003'e uymuyorsa kabul edilmez.
4. **Given** mod Tasarruf, Dengeli veya Kalite, **When** bir spec analiz edilir, **Then** davranış 001 özelliğindeki mod tablolarıyla birebir aynıdır (Özel tablodaki değerler kullanılmaz).
5. **Given** mod "Özel" ve basit seviye boş, **When** basit bir spec analiz edilir, **Then** Dengeli moddaki değer (Haiku) önerilir.

---

### User Story 2 - Claude dışı değerlerin reddedilmesi (Priority: P2)

Geliştirici yanlışlıkla `gpt-5` ya da yazım hatalı bir değer girer. Tokenomist bu değeri kabul etmez, nedenini söyler ve önceki geçerli atamayla devam eder.

**Why this priority**: Anayasa Kısıt 2'nin (spec içeriği Anthropic dışına gitmez) bu özellikte de korunmasını sağlar.

**Independent Test**: Bir seviyeye `gpt-5` yazılır. Hata mesajı görünür ve öneriler önceki geçerli değerle devam eder.

**Acceptance Scenarios**:

1. **Given** kullanıcı bir seviyeye `gpt-5` yazdı, **When** ayar kaydedilir, **Then** değer reddedilir, hata mesajı gösterilir ve o seviye için önceki geçerli değer kullanılır.
2. **Given** kullanıcı `claude-opus-5-5` gibi tam bir Claude kimliği yazdı, **When** ayar kaydedilir, **Then** değer kabul edilir.
3. **Given** kullanıcı `opus[2m]` gibi Claude Code'un tanımadığı bir varyant yazdı, **When** ayar kaydedilir, **Then** değer reddedilir.

---

### User Story 3 - Özel değerlerle doğru kilit kontrolü ve tasarruf (Priority: P3)

Kilit `opus[1m]` iken kullanıcı oturumda `/model opus[1m]` yazar. Bu aynı model sayılır ve soru sorulmaz. `/model sonnet` yazarsa 001'deki "Kilidi güncelle / Geri al" sorusu çıkar. Spec bitince özet, kullanılan özel değer için tasarruf tahminini gösterir.

**Why this priority**: Özel değerlerle kilit ve özet tutarlı çalışmazsa kullanıcı gereksiz sorularla karşılaşır ya da yanlış tasarruf görür.

**Independent Test**: Kilitliyken aynı ve farklı modele geçiş denenir. Spec bitirilip özetteki tasarruf yüzdesi kontrol edilir.

**Acceptance Scenarios**:

1. **Given** kilit `opus[1m]`, **When** oturum aynı modele geçer, **Then** kullanıcıya sorulmaz.
2. **Given** kilit `opus[1m]`, **When** oturum `sonnet`'e geçmek ister, **Then** "Kilidi güncelle / Geri al" sorusu çıkar.
3. **Given** kilit `opusplan`, **When** Claude Code plan ve uygulama arasında kendiliğinden Opus ↔ Sonnet geçişi yapar, **Then** Tokenomist bunu kilit ihlali saymaz.
4. **Given** spec `sonnet[1m]` ile bitti, **When** özet gösterilir, **Then** tasarruf bu değerin ağırlığına göre hesaplanır.

### Edge Cases

- Kullanıcı aynı değeri farklı yazımla girerse (`Opus[1M]`, ` opus `) değer normalize edilip kabul edilir.
- Özel atama kilit sürerken değiştirilirse mevcut kilit değişmez; yeni atama yalnızca sonraki öneriler için geçerli olur.
- Claude Code tam kimliği tanımıyorsa (örn. hesap o modele erişemiyorsa) Tokenomist bunu önceden bilemez. Claude Code'un hatasını kullanıcı görür. Tokenomist en azından kimliğin Claude biçiminde olduğunu doğrular.
- Tasarruf ağırlığı bilinmeyen bir değer (örn. `fable`, `best`, ailesi tanınmayan bir tam kimlik) kilitlenirse tasarruf %0 sayılır ve özet "tahmin yok" notu gösterir.
- Hook'larda gelen tam kimlik (örn. `claude-opus-5-5`) kilitteki takma adla (`opus`) aynı aileden ve aynı bağlam varyantındaysa eşleşmiş sayılır.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistem Tasarruf, Dengeli ve Kalite'nin yanında dördüncü bir **"Özel"** mod sunmalıdır. Özel modun basit, orta ve karmaşık seviyeler için birer hücresi vardır; kullanıcı her hücreye FR-003 kümesinden bir değer yazabilir ya da hücreyi boş bırakabilir. Boş hücre Dengeli moddaki değeri kullanır.
- **FR-002**: Özel modun bir de spec yazımı hücresi olmalıdır. Hücre doluysa Özel mod seçiliyken spec yazımında bu değer kullanılır; boşsa 001 FR-003 davranışı (Sonnet; "moda bağlı" açıksa Dengeli'nin değeri Sonnet) geçerlidir. Diğer modlarda spec yazımı 001'deki gibidir.
- **FR-003**: Kabul edilen değerler yalnızca şunlardır: takma adlar `haiku`, `sonnet`, `opus`, `fable`, `best`; geniş bağlam varyantları `sonnet[1m]`, `opus[1m]`, `fable[1m]`; `opusplan`; `claude-` ile başlayan ve yalnızca küçük harf, rakam, `-`, `.` ve isteğe bağlı `[1m]` son eki içeren tam Claude model kimlikleri.
- **FR-004**: Bu kümenin dışındaki her değer (Claude dışı modeller, bilinmeyen varyantlar, boş değer) reddedilmeli; kullanıcıya nedeni gösterilmeli; reddedilen değerin yerine o seviye için son geçerli değer kullanılmalıdır.
- **FR-005**: Değerler kaydedilmeden önce normalize edilmelidir: baştaki ve sondaki boşluklar silinir, harfler küçültülür.
- **FR-006**: Tasarruf, Dengeli ve Kalite modlarının tabloları ve davranışı 001 FR-020 ile birebir aynı kalmalıdır; Özel tablodaki değerler yalnızca Özel mod seçiliyken kullanılır. Özel tablo tamamen boşsa Özel mod Dengeli ile aynı davranır.
- **FR-012**: İlk ayar ekranı Özel modu da listelemeli ve seçildiğinde o anki etkin tabloyu (dolu hücreler + Dengeli'den gelen boş hücreler) göstermelidir.
- **FR-013**: Özel modun dört hücresi (basit, orta, karmaşık, spec yazımı) ayrı ayrı VS Code ayarı olarak düzenlenebilmelidir. Ek olarak ilk ayar ekranında Özel seçildiğinde kullanıcı her hücre için hazır değerler listesinden (FR-003'teki takma adlar, geniş bağlam varyantları, `opusplan`, "boş bırak = Dengeli") seçim yapabilmeli ya da serbest değer yazabilmelidir. Her iki yoldan girilen değer FR-003/FR-004 doğrulamasından geçer; ilk ayar ekranında geçersiz değer kaydedilmeden önce reddedilir.
- **FR-014**: Öneri ekranındaki model seçim listesi sırasıyla şunları içermelidir: önerilen değer (en üstte, "önerilen" etiketiyle), Haiku/Sonnet/Opus, Özel tablodaki dolu hücrelerin değerleri (tekrarlar bir kez) ve "Başka bir Claude modeli yaz…" satırı. Serbest yazılan değer FR-003/FR-004 doğrulamasından geçmeden kilitlenmez; önerilenden farklı her seçim "elle değiştirildi" sayılır.
- **FR-007**: Öneri ekranı, model seçim listesi, status bar, kilit bildirimleri ve özetler özel değerleri okunabilir adlarla göstermelidir (örn. `opus[1m]` → "Opus 1M", `opusplan` → "Opus Plan").
- **FR-008**: Kilitlenen özel değer Claude Code ayarına aynen yazılmalı; spec bitince 001'deki orijinal model geri yükleme davranışı değişmeden çalışmalıdır.
- **FR-009**: Kilit sırasında kullanıcının istediği model geçişi, istenen değer kilitli değerle aynıysa ya da aynı aile ve aynı bağlam varyantındaysa uyumlu sayılmalıdır; bağlam varyantı bilinmiyorsa uyumsuz sayılır ve kullanıcıya sorulur. Kilit `opusplan` ise yalnızca `opusplan` isteği uyumludur; Claude Code'un plan moduna girip çıkarken kendiliğinden yaptığı Opus ↔ Sonnet geçişleri kilit ihlali sayılmaz.
- **FR-015**: `fable`, `fable[1m]` veya `best` bir hücreye yazıldığında ya da öneri ekranında seçildiğinde sistem kullanıcıyı bir kez uyarmalıdır: bu modeller abonelik limiti dışında kullanım kredisiyle ücretlendirilir ve etkileşimli `/model` ile tek seferlik onay ister. Değer yine kabul edilir.
- **FR-010**: Her kabul edilen değerin, Opus'a göre göreli bir tasarruf ağırlığı olmalıdır. Bilinen aileler 001 R9'daki ağırlıkları kullanır (Haiku 0.2, Sonnet 0.6, Opus 1.0). Geniş bağlam varyantları kendi ailelerinin ağırlığını kullanır. `opusplan`, Opus ve Sonnet ağırlıklarının ortalamasını (0.8) kullanır. Ağırlığı bilinmeyen değerler (`fable`, `best`, ailesi tanınmayan tam kimlikler) 1,0 sayılır ve özet o spec için "tahmin yok" notu gösterir.
- **FR-011**: Kilit sürerken özel atama değişirse mevcut kilit değişmemelidir; yeni atama yalnızca sonraki analizlerde kullanılmalıdır.

### Key Entities

- **Model Değeri**: Kullanıcının yazdığı normalize edilmiş Claude model değeri. Özellikleri: tür (takma ad / geniş bağlam / opusplan / tam kimlik), aile (haiku/sonnet/opus/fable/bilinmiyor), bağlam varyantı (standart / 1m), görünen ad, tasarruf ağırlığı.
- **Özel Mod Tablosu**: Seviyeden (basit/orta/karmaşık) Model Değeri'ne, her biri isteğe bağlı atamalar; ayrıca spec yazımı için isteğe bağlı bir Model Değeri. Boş hücre Dengeli'nin değerini kullanır.
- **Spec Özeti (001'den)**: tasarruf tahmini bilinmiyorsa "tahmin yok" bilgisi taşır.
- **Model Kilidi (001'den)**: kilitli model artık herhangi bir Model Değeri olabilir.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: FR-003 kümesindeki her değer kabul edilir. Claude dışı model adlarından ve hatalı varyantlardan oluşan bir test kümesinin %100'ü reddedilir.
- **SC-002**: Tasarruf, Dengeli ve Kalite modlarında 001'in tüm kabul senaryoları ve otomatik testleri değişmeden geçer.
- **SC-003**: Kullanıcı bir seviyeye özel değer atamayı ve bunun öneride göründüğünü doğrulamayı 1 dakikadan kısa sürede yapar.
- **SC-004**: Kilitli değerle aynı modele geçişte kullanıcıya hiç soru sorulmaz (%0 gereksiz soru); farklı modele geçişte her seferinde sorulur.
- **SC-005**: Kilitlenen her özel değer Claude Code ayarına karakteri karakterine aynen yazılır ve spec bitince orijinal model %100 doğru geri gelir.

## Assumptions

- Claude Code'un kabul ettiği model değerleri, 2026-11-03'te okunan model-config dokümanındaki listedir: `default`, `best`, `fable`, `sonnet`, `opus`, `haiku`, `sonnet[1m]`, `opus[1m]`, `opusplan` ve tam model kimlikleri. `default` bir model değil, geçersiz kılmayı kaldıran bir değer olduğu için kabul edilmez; özel atamayı kaldırmak, alanı boş bırakmak demektir.
- `fable[1m]`, Claude Code'un `/model` yardım çıktısında görüldüğü için (2.1.316) kabul listesine alındı.
- Bedrock ARN'leri ve Foundry deployment adları bu özelliğin kapsamı dışındadır (önceki konuşmadaki seçenek 2).
- Tokenomist bir tam kimliğin hesabın erişebildiği gerçek bir model olup olmadığını çevrimdışı doğrulayamaz; yalnızca biçimini doğrular.
- Skorlama, eşikler ve sınır payı kuralı değişmez; özel atama yalnızca "hangi seviyeye hangi model" sorusunu etkiler.
