import { getMessages } from 'next-intl/server';
import { FXRateFormClient } from '../FXRateFormClient';

export async function generateMetadata() {
 return {
 title: 'New FX Rate | LogiRest'
 };
}

export default async function NewFXRatePage() {
 const messages: any = await getMessages();
 const createTitle = messages.master_data.fx_rates.create_title;
 const editTitle = messages.master_data.fx_rates.edit_title;

 return (
 <FXRateFormClient 
 id={null} 
 createTitle={createTitle} 
 editTitle={editTitle} 
 />
 );
}
