# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: unsaved-changes.spec.ts >> Unsaved Changes Guard (SC-001, SC-003) >> RTL: Dialog renders correctly in Arabic locale
- Location: apps\web\tests\e2e\unsaved-changes.spec.ts:123:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByPlaceholder(/код|CODE/i).first()

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
    - img [ref=e8]
  - alert [ref=e11]
  - main [ref=e12]:
    - generic [ref=e13]:
      - generic [ref=e14]:
        - img "مطبخ احترافي" [ref=e16]
        - generic [ref=e20]:
          - generic [ref=e21]:
            - img [ref=e22]
            - generic [ref=e24]: النظام متصل
          - button "الإنجليزية" [ref=e25]
        - generic [ref=e26]:
          - generic [ref=e27]:
            - img "شعار لوجي ريست" [ref=e29]
            - generic [ref=e31]: الإصدار v3.1.04
          - heading "LogiRest | لوجي ريست" [level=1] [ref=e32]
          - paragraph [ref=e33]: إدارة دقيقة للمطابخ عالية الأداء. تتبع المخزون في الوقت الفعلي والمشتريات المؤتمتة.
          - generic [ref=e34]:
            - generic [ref=e35]:
              - img [ref=e36]
              - generic [ref=e39]: تم تفعيل العمود الفقري الآمن V3
            - generic [ref=e40]:
              - generic [ref=e41]: OP
              - generic [ref=e42]: OP
              - generic [ref=e43]: OP
              - generic [ref=e44]: "+12"
            - generic [ref=e45]: المشغلون النشطون
      - generic [ref=e48]:
        - generic [ref=e49]:
          - heading "مطلوب تصريح دخول" [level=2] [ref=e50]
          - paragraph [ref=e51]: أدخل بيانات الاعتماد الخاصة بك للوصول إلى البوابة الآمنة.
        - generic [ref=e52]:
          - generic [ref=e53]:
            - generic [ref=e54]: معرف المشغل
            - generic [ref=e55]:
              - generic:
                - img
              - textbox "أدخل المعرف أو البريد الإلكتروني" [ref=e56]
          - generic [ref=e57]:
            - generic [ref=e58]:
              - generic [ref=e59]: بروتوكول الوصول
              - button "استعادة الوصول" [ref=e60]
            - generic [ref=e61]:
              - generic:
                - img
              - textbox "أدخل كلمة المرور" [ref=e62]
              - button [ref=e63]:
                - img [ref=e64]
          - generic [ref=e67]:
            - button "رابط القياس الحيوي" [ref=e68]:
              - img [ref=e69]
              - generic [ref=e78]: رابط القياس الحيوي
            - button "رمز الأمان المادي" [ref=e79]:
              - img [ref=e80]
              - generic [ref=e88]: رمز الأمان المادي
          - button "بدء الجلسة" [ref=e89]:
            - generic [ref=e90]:
              - img
              - text: بدء الجلسة
  - region "Notifications alt+T"
```

# Test source

```ts
  28  |   test('SC-003: After successful form submission, navigating away does NOT trigger the dialog', async ({
  29  |     page,
  30  |   }) => {
  31  |     await page.goto('/en/master-data/units-of-measure/new');
  32  |     await page.waitForSelector('form');
  33  | 
  34  |     const codeInput = page.getByPlaceholder(/code|CODE/i).first();
  35  |     await codeInput.fill('TESTUOM');
  36  | 
  37  |     const nameEn = page.getByPlaceholder(/name.*en/i).first();
  38  |     await nameEn.fill('Test Unit');
  39  | 
  40  |     const nameAr = page.getByPlaceholder(/name.*ar/i).first();
  41  |     await nameAr.fill('وحدة اختبار');
  42  | 
  43  |     const saveButton = page.getByRole('button', { name: /save/i }).first();
  44  |     await saveButton.click();
  45  | 
  46  |     await page.waitForURL('**/master-data/units-of-measure', { timeout: 10000 });
  47  | 
  48  |     const dialog = page.getByRole('dialog');
  49  |     await expect(dialog).not.toBeVisible();
  50  |   });
  51  | 
  52  |   test('Clicking "Stay on Page" in the dialog keeps the user on the current form', async ({
  53  |     page,
  54  |   }) => {
  55  |     await page.goto('/en/master-data/units-of-measure/new');
  56  |     await page.waitForSelector('form');
  57  | 
  58  |     const codeInput = page.getByPlaceholder(/code|CODE/i).first();
  59  |     await codeInput.fill('STAYTEST');
  60  | 
  61  |     await page.getByRole('link', { name: /dashboard/i }).first().click().catch(() => {});
  62  | 
  63  |     const dialog = page.getByRole('dialog');
  64  |     await expect(dialog).toBeVisible();
  65  | 
  66  |     const stayButton = page.getByRole('button', { name: /stay/i });
  67  |     await stayButton.click();
  68  | 
  69  |     await expect(dialog).not.toBeVisible();
  70  |     await expect(page).toHaveURL(/units-of-measure/);
  71  |   });
  72  | 
  73  |   test('Clicking "Discard & Leave" navigates the user away', async ({ page }) => {
  74  |     await page.goto('/en/master-data/warehouses/new');
  75  |     await page.waitForSelector('form');
  76  | 
  77  |     const codeInput = page.getByPlaceholder(/code|CODE/i).first();
  78  |     await codeInput.fill('DISCARDTEST');
  79  | 
  80  |     await page.getByRole('link', { name: /dashboard/i }).first().click().catch(() => {});
  81  | 
  82  |     const dialog = page.getByRole('dialog');
  83  |     await expect(dialog).toBeVisible();
  84  | 
  85  |     const leaveButton = page.getByRole('button', { name: /discard|leave/i });
  86  |     await leaveButton.click();
  87  | 
  88  |     await expect(page).not.toHaveURL(/warehouses/);
  89  |   });
  90  | 
  91  |   test('Cancel button with skipGuard bypasses the dialog', async ({ page }) => {
  92  |     await page.goto('/en/master-data/warehouses/new');
  93  |     await page.waitForSelector('form');
  94  | 
  95  |     const codeInput = page.getByPlaceholder(/code|CODE/i).first();
  96  |     await codeInput.fill('CANCELTEST');
  97  | 
  98  |     const cancelButton = page.getByRole('button', { name: /cancel/i }).first();
  99  |     await cancelButton.click();
  100 | 
  101 |     const dialog = page.getByRole('dialog');
  102 |     await expect(dialog).not.toBeVisible();
  103 | 
  104 |     await expect(page).not.toHaveURL(/warehouses\/new/);
  105 |   });
  106 | 
  107 |   test('Browser back button triggers the dialog when form is dirty', async ({
  108 |     page,
  109 |   }) => {
  110 |     await page.goto('/en/master-data/warehouses');
  111 |     await page.goto('/en/master-data/warehouses/new');
  112 |     await page.waitForSelector('form');
  113 | 
  114 |     const codeInput = page.getByPlaceholder(/code|CODE/i).first();
  115 |     await codeInput.fill('BACKTEST');
  116 | 
  117 |     await page.goBack().catch(() => {});
  118 | 
  119 |     const dialog = page.getByRole('dialog');
  120 |     await expect(dialog).toBeVisible();
  121 |   });
  122 | 
  123 |   test('RTL: Dialog renders correctly in Arabic locale', async ({ page }) => {
  124 |     await page.goto('/ar/master-data/units-of-measure/new');
  125 |     await page.waitForSelector('form');
  126 | 
  127 |     const codeInput = page.getByPlaceholder(/код|CODE/i).first();
> 128 |     await codeInput.fill('RTLTEST');
      |                     ^ Error: locator.fill: Test timeout of 30000ms exceeded.
  129 | 
  130 |     await page.getByRole('link', { name: /dashboard/i }).first().click().catch(() => {});
  131 | 
  132 |     const dialog = page.getByRole('dialog');
  133 |     await expect(dialog).toBeVisible();
  134 | 
  135 |     const dialogContent = dialog.locator('..');
  136 |     const direction = await dialogContent.evaluate(
  137 |       (el) => getComputedStyle(el).direction
  138 |     );
  139 |     expect(direction).toBe('rtl');
  140 |   });
  141 | });
```