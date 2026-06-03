# Static — ảnh thẻ (cấu trúc giống Pinata)

Đặt ảnh đã tải về vào đây. Backend sẽ import vào SQLite (hiển thị tức thì, không gọi Pinata).

## Cấu trúc khuyến nghị

```
Static/
├── Neo/                          (tên folder không phân biệt hoa thường)
│   └── Images/
│       ├── neo2/
│       │   ├── neo2-1.webp
│       │   └── neo2-2.webp
│       └── neo4/
│           └── ...
└── Swsh/
    ├── swsh1-1.webp              (ảnh phẳng — không có Images/ hay subfolder set)
    ├── swsh1-2.webp
    └── ...
```

- **NEO** (chỉ set `neo2`, `neo4`): `Neo/Images/{setId}/{cardId}.webp`
- **SWSH** (chỉ set `swsh1`): `Swsh/{cardId}.webp` (ảnh phẳng, không subfolder)

Game chỉ random/mint thẻ thuộc các set trên (cấu hình `COLLECTION_SETS` trong `src/config/rarity.js`).

Hỗ trợ thêm: `.png`, `.jpg` — tên file = `cardId` trong JSON (`downloaded_series`).

## Import vào SQLite

```bash
node scripts/sync-card-cache.js --from-static
node scripts/sync-card-cache.js NEO --from-static
```

Biến môi trường (tuỳ chọn): `STATIC_IMAGES_DIR=Static`
