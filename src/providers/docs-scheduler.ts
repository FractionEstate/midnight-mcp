/**
 * Documentation Update Scheduler
 *
 * Provides automatic periodic checking and updating of documentation
 * from the official Midnight Docs repository.
 */

import {
  syncWithMetadata,
  getSyncStatus,
  getStaleSources,
  addUpdateListener,
  type UpdateCheckResult,
  type UpdateRecord,
} from "./docs-metadata.js"
import { checkForUpdates } from "./docs-sync.js"

// =============================================================================
// TYPES
// =============================================================================

export interface SchedulerConfig {
  /** Check interval in milliseconds (default: 1 hour) */
  checkInterval: number
  /** Force update interval in milliseconds (default: 24 hours) */
  forceUpdateInterval: number
  /** Whether to start immediately on creation */
  autoStart: boolean
  /** Whether to persist metadata after updates */
  persistMetadata: boolean
  /** Maximum consecutive failures before stopping */
  maxConsecutiveFailures: number
  /** Backoff multiplier for failures */
  failureBackoffMultiplier: number
  /** Maximum backoff time in milliseconds */
  maxBackoffTime: number
}

export interface SchedulerState {
  isRunning: boolean
  lastCheckTime: number
  lastUpdateTime: number
  nextCheckTime: number
  consecutiveFailures: number
  totalChecks: number
  totalUpdates: number
  lastError?: string
}

export interface SchedulerCallbacks {
  onCheckStart?: () => void
  onCheckComplete?: (result: UpdateCheckResult) => void
  onUpdateDetected?: (records: UpdateRecord[]) => void
  onError?: (error: Error) => void
  onStateChange?: (state: SchedulerState) => void
}

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_CONFIG: SchedulerConfig = {
  checkInterval: 60 * 60 * 1000, // 1 hour
  forceUpdateInterval: 24 * 60 * 60 * 1000, // 24 hours
  autoStart: false,
  persistMetadata: true,
  maxConsecutiveFailures: 5,
  failureBackoffMultiplier: 2,
  maxBackoffTime: 4 * 60 * 60 * 1000, // 4 hours
}

// =============================================================================
// SCHEDULER CLASS
// =============================================================================

export class DocsUpdateScheduler {
  private config: SchedulerConfig
  private callbacks: SchedulerCallbacks
  private state: SchedulerState
  private checkTimer: ReturnType<typeof setTimeout> | null = null
  private listenerCleanup: (() => void) | null = null

  constructor(
    config: Partial<SchedulerConfig> = {},
    callbacks: SchedulerCallbacks = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.callbacks = callbacks
    this.state = {
      isRunning: false,
      lastCheckTime: 0,
      lastUpdateTime: 0,
      nextCheckTime: 0,
      consecutiveFailures: 0,
      totalChecks: 0,
      totalUpdates: 0,
    }

    // Set up update listener
    this.listenerCleanup = addUpdateListener({
      onUpdate: (records) => {
        this.callbacks.onUpdateDetected?.(records)
      },
      onError: (error) => {
        this.callbacks.onError?.(error)
      },
    })

    if (this.config.autoStart) {
      this.start()
    }
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.state.isRunning) {
      return
    }

    this.state.isRunning = true
    this.notifyStateChange()

    // Run first check immediately
    this.scheduleCheck(0)
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.state.isRunning) {
      return
    }

    this.state.isRunning = false

    if (this.checkTimer) {
      clearTimeout(this.checkTimer)
      this.checkTimer = null
    }

    this.state.nextCheckTime = 0
    this.notifyStateChange()
  }

  /**
   * Force an immediate check
   */
  async checkNow(force: boolean = false): Promise<UpdateCheckResult> {
    this.callbacks.onCheckStart?.()

    try {
      const result = await syncWithMetadata({
        force,
        persist: this.config.persistMetadata,
      })

      this.state.lastCheckTime = Date.now()
      this.state.totalChecks++

      if (result.hasUpdates) {
        this.state.lastUpdateTime = Date.now()
        this.state.totalUpdates++
      }

      // Reset failure count on success
      this.state.consecutiveFailures = 0
      delete this.state.lastError

      this.callbacks.onCheckComplete?.(result)
      this.notifyStateChange()

      return result
    } catch (error) {
      this.state.consecutiveFailures++
      this.state.lastError = error instanceof Error ? error.message : String(error)

      this.callbacks.onError?.(
        error instanceof Error ? error : new Error(String(error))
      )
      this.notifyStateChange()

      // Check if we should stop due to too many failures
      if (this.state.consecutiveFailures >= this.config.maxConsecutiveFailures) {
        console.error(
          `[DocsScheduler] Stopping after ${this.state.consecutiveFailures} consecutive failures`
        )
        this.stop()
      }

      throw error
    }
  }

  /**
   * Get current scheduler state
   */
  getState(): SchedulerState {
    return { ...this.state }
  }

  /**
   * Get scheduler configuration
   */
  getConfig(): SchedulerConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SchedulerConfig>): void {
    this.config = { ...this.config, ...config }

    // Reschedule if running
    if (this.state.isRunning && this.checkTimer) {
      clearTimeout(this.checkTimer)
      this.scheduleNextCheck()
    }
  }

  /**
   * Update callbacks
   */
  updateCallbacks(callbacks: Partial<SchedulerCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stop()

    if (this.listenerCleanup) {
      this.listenerCleanup()
      this.listenerCleanup = null
    }
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  private scheduleCheck(delay: number): void {
    if (!this.state.isRunning) {
      return
    }

    this.state.nextCheckTime = Date.now() + delay
    this.notifyStateChange()

    this.checkTimer = setTimeout(async () => {
      if (!this.state.isRunning) {
        return
      }

      try {
        // Determine if we should force update
        const syncStatus = getSyncStatus()
        const timeSinceLastUpdate = Date.now() - syncStatus.lastUpdate
        const forceUpdate = timeSinceLastUpdate > this.config.forceUpdateInterval

        await this.checkNow(forceUpdate)
      } catch (error) {
        // Error already handled in checkNow
      }

      // Schedule next check
      this.scheduleNextCheck()
    }, delay)
  }

  private scheduleNextCheck(): void {
    if (!this.state.isRunning) {
      return
    }

    // Calculate delay with backoff for failures
    let delay = this.config.checkInterval

    if (this.state.consecutiveFailures > 0) {
      const backoff =
        delay *
        Math.pow(this.config.failureBackoffMultiplier, this.state.consecutiveFailures)
      delay = Math.min(backoff, this.config.maxBackoffTime)
    }

    this.scheduleCheck(delay)
  }

  private notifyStateChange(): void {
    this.callbacks.onStateChange?.({ ...this.state })
  }
}

// =============================================================================
// SINGLETON SCHEDULER
// =============================================================================

let globalScheduler: DocsUpdateScheduler | null = null

/**
 * Get or create the global scheduler instance
 */
export function getGlobalScheduler(
  config?: Partial<SchedulerConfig>,
  callbacks?: SchedulerCallbacks
): DocsUpdateScheduler {
  if (!globalScheduler) {
    globalScheduler = new DocsUpdateScheduler(config, callbacks)
  } else if (config) {
    globalScheduler.updateConfig(config)
  }

  if (callbacks) {
    globalScheduler.updateCallbacks(callbacks)
  }

  return globalScheduler
}

/**
 * Start the global scheduler
 */
export function startGlobalScheduler(
  config?: Partial<SchedulerConfig>,
  callbacks?: SchedulerCallbacks
): DocsUpdateScheduler {
  const scheduler = getGlobalScheduler(config, callbacks)
  scheduler.start()
  return scheduler
}

/**
 * Stop the global scheduler
 */
export function stopGlobalScheduler(): void {
  globalScheduler?.stop()
}

/**
 * Destroy the global scheduler
 */
export function destroyGlobalScheduler(): void {
  globalScheduler?.destroy()
  globalScheduler = null
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Perform a one-time sync with optional callback
 */
export async function syncDocsOnce(
  options?: {
    force?: boolean
    onComplete?: (result: UpdateCheckResult) => void
    onError?: (error: Error) => void
  }
): Promise<UpdateCheckResult> {
  try {
    const result = await syncWithMetadata({
      force: options?.force,
      persist: true,
    })

    options?.onComplete?.(result)
    return result
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    options?.onError?.(err)
    throw err
  }
}

/**
 * Quick check if updates are available (without downloading)
 */
export async function hasUpdatesAvailable(): Promise<boolean> {
  const updateInfo = await checkForUpdates()
  return updateInfo.needsUpdate
}

/**
 * Get time until next scheduled check
 */
export function getTimeUntilNextCheck(): number | null {
  if (!globalScheduler) {
    return null
  }

  const state = globalScheduler.getState()
  if (!state.isRunning || state.nextCheckTime === 0) {
    return null
  }

  return Math.max(0, state.nextCheckTime - Date.now())
}
