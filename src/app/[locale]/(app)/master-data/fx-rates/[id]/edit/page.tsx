import { getMessages } from 'next-intl/server';
import { FXRateFormClient } from '../../FXRateFormClient';

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props) {
  return {
    title: `Edit FX Rate ${params.id} | LogiRest`
  };
}

export default async function EditFXRatePage({ params }: Props) {
  const { id } = params;
  const messages: any = await getMessages();
  const createTitle = messages.master_data.fx_rates.create_title;
  const editTitle = messages.master_data.fx_rates.edit_title;

  return (
    <FXRateFormClient 
      id={id} 
      createTitle={createTitle} 
      editTitle={editTitle} 
    />
  );
}
