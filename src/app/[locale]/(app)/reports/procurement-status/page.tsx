import ProcurementStatusClient from './ProcurementStatusClient';

export async function generateMetadata() {
  return {
    title: 'Procurement Status Report | LogiRest'
  };
}

export default function ProcurementStatusPage() {
  return <ProcurementStatusClient />;
}
