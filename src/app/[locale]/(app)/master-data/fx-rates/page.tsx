import { getMessages } from 'next-intl/server';
import FXRateListClient from './FXRateListClient';

export async function generateMetadata() {
  return {
    title: 'FX Rates | LogiRest'
  };
}

export default async function FXRatesPage() {
  return <FXRateListClient />;
}
