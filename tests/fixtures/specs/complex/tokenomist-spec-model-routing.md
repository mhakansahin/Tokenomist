# Feature Specification: Spec Bazlı Model Yönlendirme (Tokenomist)

**Feature Branch**: `001-spec-model-routing`

**Created**: 2026-11-03

**Status**: Draft

**Input**: User description: "Tarif .specify/ideaforge-brief.md dosyasındadır. Tokenomist: Claude Code kullanan geliştiriciler için SDD spec bazında karmaşıklık analizi yapıp Haiku/Sonnet/Opus arasından model seçen, plan→tasks→implement boyunca kilitleyen, spec bitince önceki modeli geri yükleyen ve spec bazlı tasarruf özeti gösteren VS Code eklentisi."

## Clarifications

### Session 2026-11-03

- Q: Tokenomist spec'in "hazır" olduğunu ne zaman anlayıp analizi başlatsın? → A: Plan dosyası yokken spec her kaydedildiğinde öneri arka planda güncellenir; öneri hazır olunca bildirim ve status bar ile onay istenir; kullanıcı elle de tetikleyebilir; teknik olarak mümkünse plan aşaması kilitsiz başlarsa ek uyarı gösterilir.
- Q: Spec bitince hangi model geri yüklensin? → A: Tokenomist'in o spec için ilk müdahalesinden (spec yazımı başlamadan) önceki model ("orijinal model"); spec yazımı modeli değil.
- Q: Eklentinin arayüz metinleri hangi dilde olsun? → A: İngilizce varsayılan + Türkçe; VS Code'un dil ayarına göre otomatik seçilir.
- Q: Dengeli modda, her şeyi Opus ile yapmaya kıyasla hangi ortalama tahmini tasarruf başarılı sayılır? → A: ≥ %40.
- Q: İlk sürümde opsiyonel Haiku hakem çağrısı olsun mu? → A: Hayır; ilk sürümde yalnızca yerel kural tabanlı skorlama, hakem sonraki sürüme ertelendi.
- Q: (Plan sonrası) Kilitli model açık konuşmaya da uygulanabilir mi? → A: Hayır; Claude Code modeli konuşma başında okur. Kilit yeni konuşmalarda geçerlidir, Tokenomist yeni konuşma başlatmayı önerir (FR-011).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Spec hazır olunca model önerisi ve kilit (Priority: P1)

Pro/Max aboneliğiyle Claude Code kullanan geliştirici, Spec Kit ile bir spec yazdırmıştır. Spec hazır olduğunda Tokenomist spec içeriğini analiz eder, karmaşıklık seviyesini (basit/orta/karmaşık) ve önerdiği modeli gösterir (örn. "Bu spec karmaşık → Opus"). Geliştirici öneriyi onaylar ya da başka bir model seçer; seçilen model plan → tasks → implement boyunca kilitlenir ve yolda değişmez. Status bar'da aktif spec, seviye ve kilitli model görünür.

**Why this priority**: Ürünün temel değeri budur: basit spec'lerde ucuz model kullanılarak kullanım limitinin gün sonuna kadar yetmesi. Bu hikâye tek başına bile limiti koruyan çalışan bir MVP'dir.

**Independent Test**: Hazır bir spec dosyası olan bir çalışma alanında, öneri ekranının çıktığı, onaydan sonra açılan yeni Claude Code konuşmasının seçilen modelle çalıştığı ve status bar'ın spec adı/seviye/modeli gösterdiği doğrulanarak test edilebilir.

**Acceptance Scenarios**:

1. **Given** aktif özelliğin spec dosyası yazılmış ve plan aşaması henüz başlamamış, **When** Tokenomist spec'i analiz eder, **Then** kullanıcıya karmaşıklık seviyesi, önerilen model ve önerinin kısa gerekçesi (hangi sinyallerin skoru etkilediği) gösterilir.
2. **Given** öneri gösterilmiş, **When** kullanıcı öneriyi onaylar, **Then** önerilen model bu çalışma alanında yeni açılan Claude Code konuşmaları için ayarlanır ve kilitlenir, kullanıcıya "Yeni konuşma başlat" seçeneği sunulur ve status bar'da "spec adı · seviye · model" görünür.
3. **Given** öneri gösterilmiş, **When** kullanıcı farklı bir model seçer, **Then** kullanıcının seçtiği model kilitlenir ve özette "elle değiştirildi" olarak işaretlenir.
4. **Given** model kilitli, **When** kullanıcı plan, tasks ve implement adımlarını çalıştırır, **Then** bu adımların hepsinde kilitli model kullanılır ve Tokenomist modeli değiştirmez.
5. **Given** skor iki seviye arasındaki sınıra düşüyor, **When** öneri hesaplanır, **Then** bir üst seviyenin modeli önerilir ("şüphede güçlü model").

---

### User Story 2 - Spec bitince geri yükleme ve özet (Priority: P2)

Spec'in tüm işi tamamlandığında Tokenomist, orijinal modeli (Tokenomist'in bu spec için ilk müdahalesinden önceki model) geri yükler ve spec bazlı bir özet gösterir: kullanılan model, seviye, önerinin onaylanıp değiştirilmediği ve tahmini limit tasarrufu. Geliştirici geçmiş spec'lerin özetlerini de görebilir.

**Why this priority**: Claude Code'un ayarlarının kalıcı olarak bozulmaması bir kısıttır; tasarrufun görünür olması da kullanıcının ürüne güvenmesini sağlar. P1 olmadan anlamsızdır ama P1'in güvenle kullanılabilmesi için gereklidir.

**Independent Test**: Kilitli bir spec'i tamamlanmış duruma getirip, orijinal modelin geri geldiği ve özetin göründüğü doğrulanarak test edilebilir.

**Acceptance Scenarios**:

1. **Given** model kilitli ve Tokenomist'in bu spec için ilk müdahalesinden önce Claude Code'da kullanıcının seçtiği bir model (orijinal model) var, **When** spec tamamlanmış sayılır, **Then** orijinal model aynen geri yüklenir (spec yazımı modeli değil) ve status bar kilit bilgisini göstermeyi bırakır.
2. **Given** spec tamamlandı, **When** geri yükleme biter, **Then** kullanıcıya o spec için kullanılan model, seviye ve tahmini limit tasarrufu gösterilir.
3. **Given** daha önce birden fazla spec tamamlanmış, **When** kullanıcı kullanım özetini açar, **Then** her spec için ayrı satırda model ve tahmini tasarruf listelenir.

---

### User Story 3 - Modlar ve eşiklerin özelleştirilmesi (Priority: P3)

Geliştirici ilk kurulumda Tasarruf / Dengeli / Kalite modlarından birini seçer ve her karmaşıklık seviyesinde hangi modelin kullanılacağını görür. İsterse karmaşıklık skor eşiklerini özelleştirebilir. Spec yazım aşamasında (specify, clarify) kullanılacak sabit modeli de belirler: varsayılan Sonnet, istenirse moda bağlı.

**Why this priority**: Varsayılan Dengeli mod ve varsayılan eşiklerle P1 çalışır; özelleştirme ileri kullanıcı içindir.

**Independent Test**: Mod değiştirilip aynı spec için önerilen modelin moda göre değiştiği ve özel eşiklerin seviye sonucunu değiştirdiği doğrulanarak test edilebilir.

**Acceptance Scenarios**:

1. **Given** eklenti yeni kuruldu, **When** kullanıcı ilk ayar ekranını açar, **Then** üç mod ve her modda basit/orta/karmaşık seviyeye karşılık gelen model tablosu görünür.
2. **Given** kullanıcı Tasarruf modunu seçti, **When** "spec yazımında moda bağlı model" seçeneği açıksa ve specify/clarify aşamasına girilir, **Then** Haiku kullanılır (Dengeli → Sonnet, Kalite → Opus); seçenek kapalıysa Sonnet kullanılır.
3. **Given** kullanıcı eşikleri değiştirdi, **When** bir spec analiz edilir, **Then** seviye yeni eşiklere göre belirlenir.
4. **Given** kullanıcı geçersiz eşik girer (örn. alt eşik üst eşikten büyük), **When** kaydetmeye çalışır, **Then** kayıt reddedilir ve nedeni gösterilir.

---

### User Story 4 - Kurulum ve Claude Code algılama (Priority: P4)

Geliştirici eklentiyi VS Code Marketplace'ten kurar; Tokenomist Claude Code'un yüklü olup olmadığını algılar ve yüklü değilse ne yapılması gerektiğini söyler.

**Why this priority**: Diğer hikâyelerin önkoşuludur ama kendi başına değer üretmez.

**Independent Test**: Claude Code yüklü ve yüklü değilken eklenti açılarak verilen geri bildirim kontrol edilir.

**Acceptance Scenarios**:

1. **Given** Claude Code yüklü, **When** eklenti etkinleşir, **Then** ilk ayar adımı (User Story 3) önerilir.
2. **Given** Claude Code yüklü değil, **When** eklenti etkinleşir, **Then** kullanıcıya Claude Code'un gerekli olduğu bildirilir ve Tokenomist hiçbir model değişikliği yapmaz.

---

### Edge Cases

- Çalışma alanında Spec Kit yapısı (aktif özellik bilgisi) yoksa Tokenomist pasif kalır, model değiştirmez ve bunu status bar'da belirtir.
- Model kilitliyken aktif özellik başka bir spec'e geçerse: önceki spec'in kilidi askıya alınır, yeni spec için analiz/öneri akışı başlar; önceki spec'e dönülünce kilitli model yeniden uygulanır.
- Kilit sırasında kullanıcı Claude Code'da modeli elle değiştirirse: sistem değişikliği algılar, kullanıcıyı uyarır ve iki seçenek sunar: "Kilidi bu modelle güncelle" (yeni model kilitlenir, özette elle değiştirildi olarak işaretlenir) veya "Geri al" (kilitli model yeniden uygulanır). Kullanıcı seçim yapana kadar kilit kaydı değişmez (bkz. FR-023).
- VS Code kilit sırasında kapanırsa veya çökerse: kilit durumu ve orijinal model kalıcı olarak saklanır; yeniden açılışta kilit sürdürülür ve spec bitince orijinal model yine geri yüklenir.
- Spec dosyası analiz sırasında okunamaz, boş veya çok kısaysa: seviye belirlenemez, kullanıcıya bildirilir ve modeli elle seçmesi istenir.
- Spec analiz edildikten sonra (kilitten önce) spec dosyası değişirse öneri yeniden hesaplanır; kilitten sonra değişirse kilit bozulmaz.
- Kullanıcı öneriyi ne onaylar ne değiştirirse (pencereyi kapatırsa): model kilitlenmez, status bar "onay bekliyor" gösterir ve kullanıcı öneriyi istediği zaman yeniden açabilir.

## Requirements *(mandatory)*

### Functional Requirements

**Algılama ve aşamalar**

- **FR-001**: Sistem etkinleştiğinde Claude Code'un yüklü olup olmadığını algılamalı; yüklü değilse kullanıcıyı bilgilendirmeli ve hiçbir model değişikliği yapmamalıdır.
- **FR-002**: Sistem çalışma alanındaki aktif Spec Kit özelliğini ve o özelliğin hangi aşamada olduğunu (spec yazımı: specify/clarify; uygulama: plan/tasks/implement; tamamlandı) belirleyebilmelidir.
- **FR-003**: Spec yazımı aşamasına girerken sistem, Tokenomist'in o spec için yaptığı ilk müdahaleden önce Claude Code'da etkin olan modeli "orijinal model" olarak kaydetmeli ve ardından sabit bir model kullanmalıdır: varsayılan Sonnet; kullanıcı "moda bağlı" seçeneğini açarsa Tasarruf=Haiku, Dengeli=Sonnet, Kalite=Opus.

**Karmaşıklık analizi**

- **FR-004**: Aktif özelliğin plan dosyası henüz yokken spec dosyası her kaydedildiğinde sistem spec içeriğini arka planda yeniden analiz edip sayısal bir karmaşıklık skoru üretmelidir. Skor en az şu sinyalleri hesaba katmalıdır: fonksiyonel gereksinim sayısı, kullanıcı hikâyesi sayısı, etkilenen bileşen/alan sayısı, harici entegrasyon sayısı, belirsizlik işaretleri ve uç durum sayısı.
- **FR-005**: Sistem skoru iki eşik kullanarak basit / orta / karmaşık seviyelerinden birine ayırmalıdır.
- **FR-006**: Karmaşıklık analizi tamamen yerel ve kural tabanlı olmalı, kullanıcının Claude Code kullanım limitini tüketmemelidir.
- **FR-007**: İlk sürümde sistem karmaşıklık analizi için hiçbir model çağrısı yapmamalıdır; sınır durumları yalnızca FR-008 kuralıyla çözülür. (Opsiyonel tek kısa Haiku "hakem" çağrısı sonraki sürüme ertelenmiştir.)
- **FR-008**: Skor bir eşiğe tanımlı sınır payı kadar yakınsa sistem bir üst seviyenin modelini önermelidir.
- **FR-009**: Sistem öneriyle birlikte skoru en çok etkileyen sinyalleri kullanıcıya okunabilir bir gerekçe olarak göstermelidir.

**Öneri, onay ve kilit**

- **FR-024**: Öneri hazır olduğunda sistem bir bildirimle ve status bar'da "onay bekliyor" durumuyla kullanıcıdan onay istemeli; kullanıcı analizi ve onay penceresini bir komutla istediği zaman elle de açabilmelidir. Teknik olarak algılanabiliyorsa, kilit yokken plan aşaması başlarsa sistem ek bir uyarı göstermelidir.
- **FR-010**: Sistem kilitlemeden önce önerilen modeli göstermeli; kullanıcı öneriyi onaylayabilmeli ya da Haiku/Sonnet/Opus arasından başka bir model seçebilmelidir.
- **FR-011**: Onay veya elle seçimden sonra sistem, orijinal model daha önce kaydedilmemişse (örn. spec yazımı Tokenomist kurulmadan yapıldıysa) o anda etkin olan modeli orijinal model olarak kaydetmeli, ardından seçilen modeli bu çalışma alanında yeni açılan Claude Code konuşmaları için ayarlamalı, kilitlemeli ve kullanıcıya tek adımda yeni konuşma başlatma seçeneği sunmalıdır. Açık konuşmanın modeli dışarıdan değiştirilemediği için kilit yeni konuşmada geçerli olur.
- **FR-012**: Kilitli model plan, tasks ve implement aşamaları boyunca spec tamamlanana kadar Tokenomist tarafından değiştirilmemelidir.
- **FR-013**: Status bar kilit sırasında aktif spec adını, karmaşıklık seviyesini ve kilitli modeli; kilit yokken durumu (pasif, spec yazımı, onay bekliyor) göstermelidir.
- **FR-014**: Kilit durumu (spec, seviye, kilitli model, orijinal model) yerelde kalıcı olarak saklanmalı ve VS Code yeniden başlatıldığında sürdürülmelidir.
- **FR-023**: Kilit sırasında Claude Code'un modeli Tokenomist dışında değiştirilirse sistem kullanıcıyı uyarmalı ve "Kilidi bu modelle güncelle" ya da "Geri al" seçeneklerini sunmalıdır; sistem kullanıcı seçmeden modeli kendiliğinden değiştirmemelidir.

**Bitiş, geri yükleme ve özet**

- **FR-015**: Sistem, aktif spec'in görev listesindeki tüm görevler tamamlandı olarak işaretlendiğinde bunu algılamalı ve kullanıcıdan "spec'i bitir" onayı istemelidir; spec yalnızca kullanıcı onayladığında tamamlanmış sayılır. Kullanıcı ayrıca istediği zaman "spec'i bitir" komutuyla spec'i elle tamamlayabilmelidir. Onay reddedilirse kilit sürer.
- **FR-016**: Spec tamamlandığında sistem spec yazımı modelini değil, orijinal modeli aynen geri yüklemeli ve Claude Code'un ayarlarında Tokenomist kaynaklı kalıcı bir model değişikliği bırakmamalıdır. Tokenomist'in Claude Code'a bildirim almak için eklediği hook kayıtları eklenti kurulu olduğu sürece kalır; temizleme komutu veya eklentinin kaldırılmasıyla silinir.
- **FR-017**: Spec tamamlandığında sistem spec bazlı özet göstermelidir: spec adı, seviye, önerilen model, kullanılan model, önerinin elle değiştirilip değiştirilmediği ve tahmini limit tasarrufu.
- **FR-018**: Tahmini limit tasarrufu, aynı işin tamamen Opus ile yapıldığı varsayımına göre hesaplanmalıdır: kullanılan modelin Opus'a göre göreli limit/maliyet ağırlığından türetilen yüzde olarak gösterilir (Opus kullanıldıysa tasarruf %0'dır).
- **FR-019**: Kullanıcı tamamlanmış tüm spec'lerin özet listesini görebilmelidir; özet verisi yalnızca yerelde tutulmalıdır.

**Modlar ve eşikler**

- **FR-020**: Kullanıcı Tasarruf / Dengeli / Kalite modlarından birini seçebilmeli ve seçilen modda her seviyenin hangi modele karşılık geldiğini görebilmelidir. Varsayılan eşleme:

  | Mod | Basit | Orta | Karmaşık |
  |---|---|---|---|
  | Tasarruf | Haiku | Haiku | Sonnet |
  | Dengeli (varsayılan) | Haiku | Sonnet | Opus |
  | Kalite | Sonnet | Opus | Opus |

- **FR-021**: Kullanıcı karmaşıklık skor eşiklerini özelleştirebilmeli ve varsayılana döndürebilmelidir; geçersiz eşikler (alt eşik ≥ üst eşik, aralık dışı değer) reddedilmelidir.

**Dil**

- **FR-025**: Tüm kullanıcıya görünen metinler (bildirimler, status bar, ayar ekranı, özet) İngilizce ve Türkçe olarak sunulmalıdır; dil VS Code'un arayüz diline göre otomatik seçilmeli, Türkçe dışındaki tüm dillerde İngilizce gösterilmelidir.

**Gizlilik**

- **FR-022**: Spec içeriği Anthropic dışında hiçbir üçüncü tarafa gönderilmemeli; sistem telemetri veya analitik toplamamalıdır.

### Key Entities

- **Spec Analizi**: Bir spec için hesaplanan skor, sinyal değerleri, seviye, önerilen model ve gerekçe.
- **Model Kilidi**: Aktif spec, kilitli model, orijinal model (Tokenomist'in bu spec için ilk müdahalesinden önceki model), kilitlenme zamanı, önerinin elle değiştirilip değiştirilmediği. Bir spec için en fazla bir etkin kilit olur.
- **Mod Ayarı**: Seçili mod (Tasarruf/Dengeli/Kalite), seviye→model eşlemesi, iki skor eşiği, sınır payı, spec yazımı için moda bağlı model seçeneği.
- **Spec Özeti**: Tamamlanmış bir spec için seviye, önerilen ve kullanılan model, başlangıç/bitiş zamanı ve tahmini limit tasarrufu.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Spec hazır olduktan sonra kullanıcı modeli onaylayıp kilitlemeyi 3 tıklama/adımdan az ve 30 saniyeden kısa sürede tamamlayabilir.
- **SC-002**: Karmaşıklık analizi tipik bir spec için 2 saniyeden kısa sürede sonuç verir ve kullanım limitinden hiç tüketmez.
- **SC-003**: Tamamlanan spec'lerin %100'ünde orijinal model doğru geri yüklenir; Claude Code'da Tokenomist kaynaklı kalıcı ayar değişikliği kalmaz.
- **SC-004**: Kilit süresince, kullanıcının açıkça "bu oturumda devam et" veya "kilitsiz devam et" seçtiği oturumlar hariç, plan/tasks/implement aşamalarının %100'ünde kilitli model kullanılır.
- **SC-005**: Örnek bir spec setinde (basit/orta/karmaşık olarak elle etiketlenmiş) sistemin önerdiği seviye en az %80 oranında etiketle aynıdır; kalan durumlarda en fazla bir üst seviyededir, etiketin altında bir seviye önerilmez.
- **SC-006**: Dengeli modda, basit/orta/karmaşık spec'lerin karışık olduğu bir sette tamamlanan spec'lerin ortalama tahmini limit tasarrufu, her şeyin Opus ile yapıldığı duruma göre en az %40'tır; özet ekranı her spec için bu tahmini gösterir.
- **SC-007**: Kurulumdan ilk kilitli spec'e kadar geçen sürede kullanıcı yardım belgesine bakmadan ilerleyebilir (ilk ayar 1 dakikadan kısa sürer).

## Assumptions

- Hedef kullanıcı şimdilik Pro/Max aboneliğiyle Claude Code kullanan bireysel geliştiricidir; ekip/kurumsal kullanım kapsam dışıdır.
- Kullanıcı tüm projelerinde Spec Kit ile çalışır; Spec Kit kullanmayan çalışma alanlarında Tokenomist pasif kalır (prompt bazında yönlendirme kapsam dışıdır).
- Tokenomist yalnızca Claude Code'un modelini değiştirir; başka bir LLM sağlayıcısı veya API'si kullanılmaz.
- Claude Code modeli yalnızca konuşma başında okur; bu nedenle Tokenomist'in model değişiklikleri (spec yazımı modeli, kilit, geri yükleme) yeni açılan konuşmalarda geçerli olur. Mekanizma: [research.md](research.md) R1.
- Model seçenekleri Haiku, Sonnet ve Opus'tur; her ailenin o anki güncel sürümü kullanılır.
- Tahmini tasarruf kesin bir ölçüm değil, modellerin göreli maliyet/limit ağırlıklarına dayanan bir tahmindir.
- İlk sürümde kapsam dışı: Haiku hakem çağrısı (LLM destekli karmaşıklık analizi), çoklu çalışma alanında eşzamanlı birden fazla kilit, bulut senkronizasyonu, ekip raporları, aşama içinde (implement ortasında) model yükseltme/düşürme.
- Hedef performans için özel bir gereksinim yoktur; eklenti VS Code'un açılışını ve düzenleme deneyimini fark edilir şekilde yavaşlatmamalıdır.
