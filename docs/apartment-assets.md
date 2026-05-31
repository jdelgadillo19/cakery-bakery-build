# Apartment customization assets

Story-mode apartment shop and home scenes use locale-themed art under `public/sprites/apartment/`.

## Style references

- [Gojito Executive Style Guide](../../gojito-platform/docs/styleguide/styleguide.md) — storybook arcade, warm readable illustration, semi-flat painterly shading.
- [Cakery Bakery Style Guide](styleguide/styleguide.md) — cozier bakery palette (cream, cinnamon, butter yellow), wood/tile materials, game-first readability.

Backgrounds match existing bakery counter scenes (`public/sprites/scenes/`, 768×512). Prop sprites match baked-goods painterly outlines (`public/sprites/baked_goods/`).

## Layout

```
public/sprites/apartment/
  catalog.json
  backgrounds/
    {locale}_empty.png          # 768×512 empty room
  {locale}/
    furniture/   bed_basic, bed_upgrade, dresser, armchair
    wall_decor/  wall_clock, framed_art, wall_shelf
    tables/      dining_table, side_table
    kitchen/     stove, coffee_maker, kitchen_sink
    carpets/     rug_round, rug_runner
```

Locales: `paris`, `london`, `ming_china`, `frontier_us`.

## Code

- URLs: [`src/lib/apartmentAssets.js`](../src/lib/apartmentAssets.js)
- Regenerate procedural fallbacks: `python3 scripts/generate-apartment-sprites.py`
- Process AI sprites (black → transparent): `python3 scripts/process-apartment-ai-sprite.py <src> <locale> <category> <id>`
- Batch AI ingest: `python3 scripts/process-apartment-ai-batch.py`

## Implementation notes

- Backgrounds are **empty** rooms (no purchasable furniture baked in) so players can equip props from the market.
- Props are **transparent PNGs** with consistent front / 3⁄4 facing and category max sizes (see `process-apartment-ai-sprite.py`).
- Wire into `GameSave.apartment` and market UI when Phase 5 apartment shop ships ([STORY_MODE_IMPLEMENTATION_PLAN.md](STORY_MODE_IMPLEMENTATION_PLAN.md)).
