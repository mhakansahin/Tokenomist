# Tokenomist

Bu proje **GitHub Spec Kit** ile Spec Driven Development yürütür. Kod yazmadan önce oku:

1. [.specify/memory/constitution.md](.specify/memory/constitution.md): bağlayıcı ilkeler ve teknoloji standartları
2. Aktif özellik: `.specify/feature.json` → `specs/NNN-ad/` (spec, plan, tasks)

## İş akışı

- İlk özellik henüz yoksa tarifi [.specify/ideaforge-brief.md](.specify/ideaforge-brief.md) dosyasındadır: `/speckit-specify <tarif>`.
- Her özellik: `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`.

## Çalışma kuralları

- Spec'i olmayan bir davranış değişikliği yapma; önce `/speckit-specify`.
- Anayasadaki teknoloji standartlarının dışına çıkma; gerekiyorsa önce `/speckit-constitution` ile anayasayı güncellemeyi öner.
- `tasks.md`'de biten görevi `[x]` yap.
