import { OutboxMonitoringClient } from './OutboxMonitoringClient';

export const metadata = {
  title: 'Outbox Event Monitoring | LogiRest',
  description: 'Monitor failed communications outbox events and retry queued deliveries.',
};

export default function OutboxMonitoringPage() {
  return <OutboxMonitoringClient />;
}
