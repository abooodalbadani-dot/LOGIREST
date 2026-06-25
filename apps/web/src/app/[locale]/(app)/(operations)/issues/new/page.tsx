import { setRequestLocale } from 'next-intl/server';
import { IssueForm } from "./issue-form";

export const metadata = { title: "صرف جديد | Otantik مطاعم" };

export default async function CreateIssuePage(props: { params: Promise<{ locale: string }> }) {
 const { locale } = await props.params;
 setRequestLocale(locale);
 
 return (
 <div className="space-y-4 min-w-0 gap-6 flex-1 px-0 py-6 sm:p-8 pt-6 flex flex-col w-full">
 <IssueForm />
 </div>
 );
}
