import os
files=[
  'apps/web/src/app/[locale]/(app)/(operations)/stocktake/[id]/post/StocktakePostClient.tsx',
  'apps/web/src/app/[locale]/(app)/(operations)/stocktake/[id]/variance/StocktakeVarianceClient.tsx',
  'apps/web/src/app/[locale]/(app)/(operations)/stocktake/[id]/start/StocktakeStartClient.tsx',
  'apps/web/src/app/[locale]/(app)/(procurement)/goods-received/[id]/scan-mode/GRNScanClient.tsx',
  'apps/web/src/features/purchasing/components/purchase-order-form.tsx'
]
for f in files:
  if os.path.exists(f):
    with open(f, 'r', encoding='utf-8') as file:
      c = file.read()
    nc = c.replace('.nameAr', '.name_ar').replace('.nameEn', '.name_en')
    if nc != c:
      with open(f, 'w', encoding='utf-8') as file:
        file.write(nc)
      print(f'Updated {f}')
