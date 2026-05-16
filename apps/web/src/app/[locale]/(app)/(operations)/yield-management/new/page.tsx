import { setRequestLocale } from 'next-intl/server';
import { YieldNewBatchClient } from './YieldNewBatchClient';

export const metadata = {
  title: 'New Production Batch | LogiRest',
  description: 'Track yield and efficiency for a new production batch'
};

export default async function NewYieldBatchPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  
  return <YieldNewBatchClient />;
}
