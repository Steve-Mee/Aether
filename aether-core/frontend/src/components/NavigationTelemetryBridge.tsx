import { useNavigationTelemetry } from '../lib/useNavigationTelemetry';

/** Must render inside Router. */
export default function NavigationTelemetryBridge() {
  useNavigationTelemetry();
  return null;
}
