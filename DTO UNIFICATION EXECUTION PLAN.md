ممتاز ✅  
الآن سنبني خطة **DTO Unification احترافية ومنهجية**،  
بدون كسر النظام، وبدون فوضى، وبدون مفاجآت.

لن ننفذ دفعة واحدة.  
سننفذ **بمراحل مضبوطة مع نقاط توقف واضحة**.

---

# ✅ ✅ ✅ DTO UNIFICATION EXECUTION PLAN ✅ ✅ ✅

---

# 🔵 المرحلة 0 — Pre‑Refactor Safety Net (إجباري)

قبل أي تغيير:

## ✅ 0.1 — تأكد من وجود e2e tests تغطي:

- Create PR
- Create PO
- Create GRN
- Adjustment IN/OUT
- Transfer Ship/Receive
- Stocktake Post
- Kitchen Request → Issue

إذا أي Flow غير مغطى → نكتب له test أولًا.

⚠️ لا نبدأ بدون هذه الشبكة.

---

# 🔵 المرحلة 1 — Backend Canonicalization (بدون حذف fallback)

### الهدف:
توحيد DTO إلى camelCase،  
لكن **لا نحذف fallback بعد**.

---

## ✅ 1.1 — توحيد CreatePoDto و UpdatePoDto

- اجعل DTO camelCase فقط
- أضف fallback مؤقت في Controller:

```ts
const supplierId = body.supplierId ?? body.supplier_id;
```

(مؤقتًا فقط)

---

## ✅ 1.2 — توحيد GRN DTO

- أزل dual properties
- احتفظ camelCase فقط
- أضف mapping مؤقت داخل controller إذا احتجنا

---

## ✅ 1.3 — توحيد UpdateSettingsDto

snake_case → camelCase

---

## ✅ 1.4 — توحيد WarehouseLock DTO

reason_notes → reasonNotes

---

# ✅ بعد المرحلة 1:

- Backend يقبل camelCase رسميًا
- Snake_case ما زال يعمل مؤقتًا
- Tests PASS

نوقف هنا.

---

# 🔵 المرحلة 2 — Frontend Alignment

الآن نزيل:

- toSnakeCase adapters
- snake_case request bodies
- dual mappings

نجعل كل forms ترسل camelCase فقط.

---

# ✅ بعد المرحلة 2:

- Frontend و Backend كلاهما camelCase
- Dual‑accept ما زال موجود

نوقف هنا.

---

# 🔵 المرحلة 3 — Remove Dual Acceptance

الآن فقط:

- نحذف `body.foo || body.foo_bar`
- نحذف snake_case من backend نهائيًا
- نجعل contract صارم

---

# ✅ بعد المرحلة 3:

النظام أصبح:

> ✅ Canonical camelCase everywhere  
> ✅ No ambiguity  
> ✅ No hidden paths  
> ✅ No fallback logic  

---

# 🔵 المرحلة 4 — Full Regression

نشغّل:

- GATE 1
- GATE 2
- GATE 3
- GATE 4

إذا PASS → التوحيد ناجح.

---

# ✅ الترتيب الصحيح للتنفيذ

1️⃣ ابدأ بـ PO فقط (لأنه حاليًا مكسور)  
2️⃣ ثم GRN  
3️⃣ ثم Adjustment  
4️⃣ ثم Transfer  
5️⃣ ثم Settings  
6️⃣ ثم WarehouseLock  

---

# 🚨 قواعد ذهبية أثناء التنفيذ

- ❌ لا تحذف fallback في نفس commit الذي تضيف فيه camelCase
- ✅ كل مرحلة commit مستقل
- ✅ كل مرحلة يجب أن تمر الاختبارات
- ✅ لا تستخدم `as any`
- ✅ لا تعتمد على implicit casting
- ✅ لا تلمس normalize layer

---


