export interface SuppressionSyncJobData {
  // Empty - no input needed for sync job
  manual?: boolean // true if triggered manually
}

export interface SuppressionSyncResult {
  synced: number
  emailLogsUpdated: number
  duration: number
}
