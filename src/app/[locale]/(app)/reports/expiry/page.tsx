import ExpiryReportClient from './ExpiryReportClient';

export async function generateMetadata() {
  return {
    title: 'Expiry Report | LogiRest'
  };
}

export default function ExpiryReportPage() {
  return <ExpiryReportClient />;
}
