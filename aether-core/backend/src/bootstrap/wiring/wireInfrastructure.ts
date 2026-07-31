import { registerEventHandlers } from '../eventHandlers';
import { assertAllRequiredHandlersRegistered } from '../../shared/events/eventHandlerRegistry';
import { createMessageBroker } from '../../shared/messaging/createMessageBroker';
import { OutboxRelayService, setOutboxRelayService } from '../../shared/messaging/OutboxRelayService';

export function wireInfrastructure(): void {
  registerEventHandlers();
  setOutboxRelayService(new OutboxRelayService(createMessageBroker()));
  assertAllRequiredHandlersRegistered();
}
