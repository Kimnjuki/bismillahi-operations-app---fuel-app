/**
 * Utility function to wrap async operations with a timeout
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds (default: 10000ms)
 * @param timeoutMessage - Optional custom timeout message
 * @returns Promise that rejects if timeout is exceeded
 */
export function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs: number = 10000,
  timeoutMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    ),
  ]);
}

/**
 * Utility function to create a timeout promise
 * @param ms - Milliseconds to wait
 * @returns Promise that resolves after specified time
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
