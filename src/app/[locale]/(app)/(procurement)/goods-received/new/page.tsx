import { GRNForm } from "./grn-form";

export const metadata = {
  title: "Create GRN | LogiRest",
  description: "Create a new Goods Receipt Note.",
};

export default function CreateGRNPage({ params: { locale } }: { params: { locale: 'ar' | 'en' } }) {
  return <GRNForm locale={locale} />;
}
