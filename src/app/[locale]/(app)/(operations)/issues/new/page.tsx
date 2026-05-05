import { setRequestLocale } from 'next-intl/server';
import { IssueForm } from "./issue-form";

export const metadata = { title: "صرف جديد | LogiRest" };

export default async function CreateIssuePage(props: { params: Promise<{ locale: string }> }) {
 const { locale } = await props.params;
 setRequestLocale(locale);
 
 return (
 <div className="flex-1 space-y-4 p-8 pt-6">
 <IssueForm />
 </div>
 );
}
