import StockMovementsClient from './StockMovementsClient';

export async function generateMetadata() {
  return {
    title: 'Stock Movements Report | LogiRest'
  };
}

export default function StockMovementsPage() {
  return <StockMovementsClient />;
}
