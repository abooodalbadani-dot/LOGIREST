import { setRequestLocale } from 'next-intl/server';
import { UoMDetailClient } from '../UoMDetailClient';

export default async function UoMDetailPage(props: { params: Promise<{ locale: string; id: string }> }) {
 const params = await props.params;
 setRequestLocale(params.locale);
 
 return (
<UoMDetailClient
  id={params.id}
  />
 );
}
