import CurrencySummariesClient from './CurrencySummariesClient';

export async function generateMetadata() {
  return {
    title: 'Currency Summaries Report | LogiRest'
  };
}

export default function CurrencySummariesPage() {
  return <CurrencySummariesClient />;
}
