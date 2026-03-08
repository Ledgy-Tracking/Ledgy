/**
 * Trigger Execution Engine
 * Story 4-4: Autonomous Triggers
 * 
 * Handles trigger detection and execution with loop prevention
 */

import { nodeEngine } from './nodeEngine';

export interface TriggerExecutionContext {
    triggerId: string;
    entryId: string;
    ledgerId: string;
    eventType: 'on-create' | 'on-edit';
    depth: number;
    profileId: string;
    projectId: string;
    data?: any;
}

/**
 * Execute a trigger by re-running the project's data graph
 * This ensures that when a ledger triggers, the entire downstream data flow is updated
 */
export async function executeTrigger(
    context: TriggerExecutionContext
): Promise<void> {
    console.log(`Executing trigger ${context.triggerId} for ledger ${context.ledgerId}`);

    // In our simplified model, any trigger simply re-executes the global state for that project
    // to ensure dashboard and nodes are consistent with the new entry
    await nodeEngine.executeProjectGraph();
}

/**
 * Check if a trigger would create an infinite loop
 */
export function wouldCreateLoop(
    triggerLedgerId: string,
    _triggerEventType: string,
    actionCreatesEntry: boolean,
    actionLedgerId: string
): boolean {
    // Simple loop detection: if action creates entry in same ledger that triggered it
    return actionCreatesEntry && triggerLedgerId === actionLedgerId;
}
