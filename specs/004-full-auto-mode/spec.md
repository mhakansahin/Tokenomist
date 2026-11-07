# Feature Specification: Tam Otomatik Mod

**Feature Branch**: `004-full-auto-mode`

**Created**: 2026-11-08

**Status**: Draft

**Input**: User description: "Tam otomatik mod: Kullanıcı Tokenomist'in model kararlarını kendisine sormadan arkada yönetmesini isteyebilmeli. Otomatik modda (1) önerilen model sorulmadan kilitlenir; (2) kilitli modelle çalışmayan bir konuşmada /speckit-plan, /speckit-tasks veya /speckit-implement yazılınca komut durdurulur, kilitli modelle yeni konuşma açılır ve aynı komut giriş kutusuna hazır yazılır; (3) /speckit-specify için de aynısı; (4) görevler bitince spec sorulmadan bitirilir. Teknik sınır: açık konuşmanın modeli dışarıdan değiştirilemez, hazır yazılan komut kendiliğinden gönderilmez; hazır metinle açma belgelenmemiş bir yetenektir, çalışmazsa yalnızca yeni konuşma açılır. Mevcut 'sorarak' davranış ayrı seçenek olarak kalmalı."

## Clarifications

### Session 2026-11-08

- Q: Yeni kurulumlarda otomasyonun varsayılanı ne olsun? → A: Otomatik.
- Q: Otomatik modda kilit sürerken kullanıcı `/model` ile başka modele geçerse ne olsun? → A: 001 FR-023'teki gibi yine sorulsun ("Kilidi güncelle / Geri al").
- (Plan bulgusu) Otomatik kilit ne zaman yapılsın? → Plan aşaması başlarken, o anki en son analizle. Spec yazımı (specify, clarify) sırasında spec defalarca kaydedildiği için ilk kayıtta kilitlemek yarım spec'e göre kilit koyar ve clarify konuşmalarını yazım modeli yerine kilitli modelle başlatırdı (FR-002 güncellendi).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sormadan kilit ve sormadan konuşma geçişi (Priority: P1)

Geliştirici otomasyonu açar. Spec yazılırken Tokenomist öneriyi status bar'da sessizce günceller. Geliştirici `/speckit-plan` yazınca Tokenomist en son öneriyi sormadan kilitler, komutu durdurur, kilitli modelle yeni bir konuşma açar ve `/speckit-plan` komutunu yeni konuşmanın giriş kutusuna hazır yazar. Geliştirici yalnızca Enter'a basar.

**Why this priority**: Kullanıcının asıl beklentisi model kararlarının arkada verilmesi. Bugün her adımda bir pencere çıkıyor ve bu, ürünün "elle model değiştirmekten farkı yok" diye algılanmasına yol açıyor.

**Independent Test**: Otomasyon açıkken bir spec kaydedilir. Hiçbir soru penceresi açılmadan model kilitlenmeli. Ardından eski bir konuşmada `/speckit-plan` yazılır: soru çıkmadan komut durdurulmalı, yeni konuşma açılmalı ve giriş kutusunda `/speckit-plan` yazılı olmalı.

**Acceptance Scenarios**:

1. **Given** otomasyon açık ve spec yazılıyor, **When** spec her kaydedildiğinde öneri hesaplanır, **Then** soru penceresi açılmaz; status bar öneriyi "otomatik" etiketiyle gösterir.
2. **Given** model kilitli ve konuşma kilitli modelle çalışmıyor (ya da bilinmiyor), **When** kullanıcı `/speckit-plan`, `/speckit-tasks` veya `/speckit-implement` yazar, **Then** komut soru sorulmadan durdurulur, yeni konuşma açılır ve aynı komut (argümanlarıyla birlikte) yeni konuşmanın giriş kutusuna hazır yazılır.
3. **Given** model kilitli değil, **When** kullanıcı `/speckit-plan` yazar, **Then** önerilen model sorulmadan kilitlenir ve 2. senaryodaki gibi yeni konuşmaya geçilir. Spec analiz edilemiyorsa otomasyon devre dışı kalır ve 001'deki soru gösterilir.
4. **Given** konuşma zaten kilitli modelle çalışıyor, **When** kullanıcı bir aşama komutu yazar, **Then** hiçbir şey yapılmaz ve komut çalışır.

---

### User Story 2 - Sormadan spec yazımı ve bitiş (Priority: P2)

Otomasyon açıkken `/speckit-specify` yazıldığında, konuşma spec yazımı modeliyle çalışmıyorsa Tokenomist aynı şekilde sormadan yeni konuşmaya geçer. Tüm görevler bitince spec sorulmadan bitirilir, önceki model geri yüklenir ve özet gösterilir.

**Why this priority**: Akışın baştan sona sorusuz olması için gerekli, ama kilit ve aşama geçişleri kadar sık değil.

**Independent Test**: Otomasyon açıkken `/speckit-specify` yazılır: soru çıkmadan yeni konuşma açılmalı ve komut giriş kutusunda hazır yazılı olmalı. Kilitli bir spec'in son görevi işaretlenir: soru çıkmadan orijinal model geri gelmeli ve özet gösterilmeli.

**Acceptance Scenarios**:

1. **Given** otomasyon açık ve konuşma spec yazımı modeliyle çalışmıyor, **When** kullanıcı `/speckit-specify <tarif>` yazar, **Then** komut durdurulur, yeni konuşma açılır ve `/speckit-specify <tarif>` giriş kutusuna hazır yazılır.
2. **Given** otomasyon açık ve spec kilitli, **When** görev listesindeki tüm görevler tamamlanır, **Then** spec sorulmadan bitirilir, orijinal model geri yüklenir ve özet bildirimi gösterilir.

---

### User Story 3 - Sorarak çalışmaya devam etmek (Priority: P3)

Her adımda onay vermek isteyen geliştirici otomasyonu kapalı tutar. Tokenomist 001/002'deki gibi sorarak çalışır.

**Why this priority**: Mevcut davranışın korunması gerekiyor, ama yeni bir şey yapmıyor.

**Independent Test**: Otomasyon kapalıyken 001'in tüm kabul senaryoları ve otomatik testleri değişmeden geçmeli.

**Acceptance Scenarios**:

1. **Given** otomasyon kapalı, **When** 001/002 akışları çalıştırılır, **Then** davranış birebir aynıdır.

### Edge Cases

- **Hazır metinle açma çalışmazsa:** Claude Code bu yeteneği sunmuyorsa ya da çağrı hata verirse yalnızca yeni konuşma açılır. Durdurulan komutun mesajı, komutun yeni konuşmada tekrar yazılması gerektiğini söyler.
- **Kullanıcı Enter'a basmazsa:** Hazır yazılan komut gönderilmeden kalır; Tokenomist başka bir şey yapmaz.
- **Spec analiz edilemezse:** Öneri olmadığından otomatik kilit yapılamaz. 001'deki elle seçim akışı gösterilir.
- **Fable/`best` önerilirse:** Kilit otomatik yapılır, ama 002 FR-015'teki kredi uyarısı yine gösterilir.
- **Kilit sırasında `/model` ile elle geçiş:** Bu kullanıcının bilinçli bir hareketidir; otomatik modda da 001 FR-023'teki "Kilidi güncelle / Geri al" sorusu gösterilir (FR-011).
- **Aynı konuşmada art arda komutlar:** Yeni konuşma açıldıktan sonra eski konuşmada aynı komut tekrar yazılırsa yine durdurulur ve yine yeni konuşma açılır; ancak art arda gelen çağrılarda kısa süre içinde ikinci bir konuşma açılmaz.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistem bir "otomasyon" ayarı sunmalıdır: "otomatik" (sormadan yönet) ve "sorarak" (001/002 davranışı). Varsayılan değer **otomatik**tir. Ayarı daha önce değiştirmemiş mevcut kullanıcılar da güncellemeyle otomatik moda geçer.
- **FR-002**: Otomatik modda spec yazılırken öneri soru penceresi açılmadan güncellenmeli ve status bar'da gösterilmelidir. Önerilen model, plan aşaması başlarken (`/speckit-plan` komutunda ya da hook'lar çalışmıyorsa plan dosyası oluştuğunda) en son analizle sorulmadan kilitlenmeli ve bilgi bildirimi gösterilmelidir. Bildirim kullanıcıya kilitli modeli değiştirme olanağı sunmalıdır.
- **FR-003**: Otomatik modda kilitli modelle çalışmayan (ya da modeli bilinmeyen) bir konuşmada `/speckit-plan`, `/speckit-tasks` veya `/speckit-implement` yazılınca sistem soru sormadan komutu durdurmalı, yeni bir Claude Code konuşması açmalı ve kullanıcının yazdığı komutu (argümanlarıyla birlikte) yeni konuşmanın giriş kutusuna hazır yazmalıdır.
- **FR-004**: Otomatik modda kilit yokken `/speckit-plan` yazılırsa sistem önce FR-002'deki gibi kilitlemeli, sonra FR-003'ü uygulamalıdır.
- **FR-005**: Otomatik modda `/speckit-specify` için, konuşma spec yazımı modeliyle çalışmıyorsa FR-003'teki davranış uygulanmalıdır (001 FR-003'teki model kaydı ve yazım modeli değişmeden).
- **FR-006**: Otomatik modda tüm görevler tamamlandığında spec sorulmadan bitirilmeli, orijinal model geri yüklenmeli ve özet gösterilmelidir (001 FR-015–FR-017).
- **FR-007**: Yeni konuşmayı hazır komutla açmak mümkün olmazsa sistem yalnızca yeni konuşma açmalı ve durdurulan komutun mesajında komutun yeni konuşmada tekrar yazılması gerektiğini belirtmelidir.
- **FR-008**: Durdurulan her komut için kullanıcıya görünen mesaj, Tokenomist'in neden yeni konuşma açtığını ve hangi modelin kullanılacağını söylemelidir.
- **FR-009**: Sorarak modda 001 ve 002'nin tüm davranışları değişmeden korunmalıdır.
- **FR-011**: Otomatik modda da kilit sırasında kullanıcının `/model` ile başka modele geçmesi 001 FR-023'teki gibi sorulmalıdır.
- **FR-010**: Otomatik modda art arda gelen aynı komutlar için kısa bir süre içinde birden fazla yeni konuşma açılmamalıdır.

### Key Entities

- **Otomasyon Ayarı**: "otomatik" veya "sorarak".
- **Hazır Komut**: Durdurulan komutun metni (komut adı + argümanlar); yeni konuşmanın giriş kutusuna yazılır.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Otomatik modda bir spec'in yazımından bitişine kadar kullanıcıya gösterilen soru penceresi sayısı 0'dır (Fable kredi uyarısı, analiz edilemeyen spec ve kullanıcının kendi `/model` geçişi hariç).
- **SC-002**: Otomatik modda her aşama geçişi için kullanıcının yaptığı iş en fazla bir tuşa basmaktır (hazır komutu göndermek). Hazır metinle açma kullanılamıyorsa bu iş komutu bir kez yazmaktır.
- **SC-003**: Sorarak modda 001 ve 002'nin tüm otomatik testleri değişmeden geçer.
- **SC-004**: Hazır yazılan komut, kullanıcının yazdığı komutla karakteri karakterine aynıdır.

## Assumptions

- Claude Code'un yeni konuşmayı hazır metinle açma yeteneği, kurulu Claude Code eklentisinin (2.1.319) kodunda görülen ama belgelenmemiş bir komuta dayanır. Bu komut metni giriş kutusuna yazar, göndermez. Claude Code değişirse FR-007 devreye girer.
- Açık bir konuşmanın modeli dışarıdan değiştirilemez (001 research R1). Model değişikliği bu yüzden her zaman yeni konuşmayla olur.
- Otomatik mod, 002'deki Özel mod dahil bütün modlarla birlikte çalışır; hangi modelin önerileceğini değiştirmez, yalnızca sorulup sorulmayacağını değiştirir.
