/**
 * A lightweight, in-memory circuit breaker for tracking Redis / Upstash rate limits
 * and connection health. When a rate limit is exceeded, the circuit breaker pauses
 * Redis interactions globally within this node process, allowing services (like NotificationGateway)
 * to immediately bypass Redis and use synchronous fallbacks.
 */
export class RedisCircuitBreaker {
  private _isPaused = false;
  private _resumeAt = 0;

  /**
   * Pause Redis queue usage for a set duration.
   * @param durationMs Milliseconds to remain paused (default: 60s)
   */
  public pause(durationMs = 60000): void {
    this._isPaused = true;
    this._resumeAt = Date.now() + durationMs;
  }

  /**
   * Check if Redis queue operations should be bypassed.
   * If the pause duration has expired, it automatically resets to false.
   */
  public isPaused(): boolean {
    if (this._isPaused && Date.now() > this._resumeAt) {
      this._isPaused = false; // Auto-resume once duration expires
    }
    return this._isPaused;
  }
}

// Export as a singleton to share state across the monolith process
export const redisCircuitBreaker = new RedisCircuitBreaker();
