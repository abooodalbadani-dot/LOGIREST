import { PurchaseRequestForm } from "@/features/purchasing/components/pr-form";
import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function NewPurchaseRequestPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations("procurement.pr");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-headline-lg font-bold text-foreground">
          {t("create_title")}
        </h2>
        <p className="text-muted-foreground mt-2">{t("create_desc")}</p>
      </div>

      <PurchaseRequestForm />
    </div>
  );
}
