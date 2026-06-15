/**
 * Primitives — shared, presentation-only building blocks.
 *
 *   SystemMeter       — single recovery-system readout (label, bar, countdown)
 *   StressorLedgerRow — single stressor input row with live contribution
 *   ProtocolStep      — single directive in the recovery prescription
 *
 * These are the foundation of the new instrument language. They are
 * intended to be composed by screens, not to know about app state.
 */

export { SystemMeter } from "./SystemMeter";
export type { SystemMeterProps } from "./SystemMeter";

export { StressorLedgerRow } from "./StressorLedgerRow";
export type { StressorLedgerRowProps } from "./StressorLedgerRow";

export { ProtocolStep } from "./ProtocolStep";
export type { ProtocolStepProps } from "./ProtocolStep";
