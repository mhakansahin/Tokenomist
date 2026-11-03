Bu tarif IdeaForge mülakatından geldi. Spec'i Spec Kit şablonunun İngilizce bölüm başlıklarıyla, içeriği Türkçe olarak yaz. Teknoloji seçimleri anayasada (.specify/memory/constitution.md) tanımlı; spec'te yalnızca ne ve neden olsun. Tarifte olmayan bir şeyi uydurma; gerekirse belirsizlik işareti kullan.

# Tokenomist

Claude Code kullanan geliştiriciler için, basit işlerde ucuz modeli, zor işlerde güçlü modeli otomatik seçerek kullanım limitini ve maliyeti düşürür.

**Tür:** VS Code eklentisi · VS Code eklentisi; sadece Claude Code'un modellerini (karmaşıklığa göre) değiştirecek. Başka API'lerim yok.

## Bağlam

### Konu
VS Code eklentisi; sadece Claude Code'un modellerini (karmaşıklığa göre) değiştirecek. Başka API'lerim yok.

### Kullanıcı
Şimdilik bireysel geliştirici: Pro/Max aboneliğiyle Claude Code kullanan, her şeyi Opus ile yaptığı için gün ortasında limiti dolan ve limitini akşama kadar yetirmek isteyen bir geliştirici.

### Ana yolculuk
1) Kurulum: VS Code Marketplace'ten kurulur, Claude Code'un yüklü olduğunu algılar. 2) İlk ayar: Tasarruf / Dengeli / Kalite modlarından biri seçilir; hangi karmaşıklık seviyesinde hangi modelin (Haiku/Sonnet/Opus) kullanılacağı görülür. 3) Spec yazımı aşaması: Kullanıcı prompt verir, AI spec'i yazar (/speckit.specify, clarify). Bu aşamada henüz spec olmadığından sabit bir model kullanılır (varsayılan Sonnet; istenirse moda bağlı: Tasarruf=Haiku, Kalite=Opus). 4) Spec hazır olunca: Tokenomist spec içeriğini analiz eder, karmaşıklık seviyesini ve önerdiği modeli gösterir (örn. 'Bu spec karmaşık → Opus'). 5) Kullanıcı öneriyi onaylar ya da elle değiştirir; ardından model plan → tasks → implement boyunca kilitlenir ve yolda değişmez; status bar'da aktif spec, seviye ve kilitli model görünür. 6) Spec bitince önceki model geri yüklenir ve spec bazlı özet (kullanılan model, tahmini limit tasarrufu) gösterilir.

## Kullanıcıların yapabilmesi gerekenler

- **Ana yolculuk**: Bir kullanıcı olarak 1) Kurulum: VS Code Marketplace'ten kurulur, Claude Code'un yüklü olduğunu algılar. 2) İlk ayar: Tasarruf / Dengeli / Kalite modlarından biri seçilir; hangi karmaşıklık seviyesinde hangi modelin (Haiku/Sonnet/Opus) kullanılacağı görülür. 3) Spec yazımı aşaması: Kullanıcı prompt verir, AI spec'i yazar (/speckit.specify, clarify). Bu aşamada henüz spec olmadığından sabit bir model kullanılır (varsayılan Sonnet; istenirse moda bağlı: Tasarruf=Haiku, Kalite=Opus). 4) Spec hazır olunca: Tokenomist spec içeriğini analiz eder, karmaşıklık seviyesini ve önerdiği modeli gösterir (örn. 'Bu spec karmaşık → Opus'). 5) Kullanıcı öneriyi onaylar ya da elle değiştirir; ardından model plan → tasks → implement boyunca kilitlenir ve yolda değişmez; status bar'da aktif spec, seviye ve kilitli model görünür. 6) Spec bitince önceki model geri yüklenir ve spec bazlı özet (kullanılan model, tahmini limit tasarrufu) gösterilir. (Sistem ana yolculuğun her adımını desteklemelidir.)
- **Spec bazlı karar**: Model kararı prompt bazında değil, SDD spec bazında verilir (kullanıcı tüm projelerde SDD/Spec Kit kullanıyor; spec'i de AI yazıyor). Spec yazım aşamasında (specify, clarify) sabit model kullanılır (varsayılan Sonnet, istenirse moda bağlı); karar spec yazıldıktan sonra, plan/tasks/implement öncesi verilir.
- **Spec karmaşıklık analizi**: Sistem spec dosyasının içeriğini (gereksinim sayısı, etkilenen bileşenler, entegrasyonlar, belirsizlik vb.) analiz edip basit/orta/karmaşık seviyesine ayırmalıdır.
- **Model kararı ve kilit**: Spec hazır olunca seviyeye göre model (Haiku/Sonnet/Opus) seçilir ve plan → tasks → implement boyunca, spec bitene kadar değişmez.
- **Başta onay / elle düzeltme**: Bir kullanıcı olarak önerilen modeli kilitlenmeden önce görüp onaylayabilmeli ya da değiştirebilmeliyim; sonrasında model kilitlenir.
- **Modlar ve eşikler**: Bir kullanıcı olarak Tasarruf / Dengeli / Kalite modlarından birini seçebilmeli ve skor eşiklerini özelleştirebilmeliyim.
- **Spec bazlı kullanım özeti**: Bir kullanıcı olarak her spec için kullanılan modeli ve tahmini limit tasarrufunu görebilmeliyim.

## Kısıtlar

1) Hakem pahalı olmasın: karmaşıklık analizi limit yemesin; kural tabanlı/yerel skorlama, LLM gerekirse en fazla tek kısa Haiku çağrısı. 2) Spec içeriği Anthropic dışında hiçbir üçüncü tarafa gitmesin (spec zaten Claude tarafından yazıldığı için Haiku hakem çağrısı yeni bir gizlilik riski oluşturmaz; telemetri/analitik yok). 3) Şüphede güçlü model: skor sınırdaysa bir üst model seçilsin. 4) Claude Code'a dokunmama: Claude Code'un kendi ayarları kalıcı olarak bozulmasın; spec bitince önceki model geri yüklensin.

## Henüz karar verilmedi

- Başarı ölçütleri (KPI) ve hedef değerleri
- İlk sürümde bilinçli olarak yapılmayacaklar
- Hedef performans (yanıt süresi / FPS / eşzamanlı kullanıcı)
