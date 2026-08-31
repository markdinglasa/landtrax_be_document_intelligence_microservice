import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * SessionStatusInterceptor — Response Header Piggyback (Fallback Layer 3)
 *
 * Runs on every authenticated response. When the authenticated user has a
 * pending session eviction (`sessionEvictionAt` is set and in the future),
 * this interceptor injects two response headers:
 *
 *   X-Session-Status: eviction_pending
 *   X-Session-Seconds-Remaining: <N>
 *
 * The frontend's global HTTP interceptor reads these headers on every response
 * and can trigger the countdown modal without needing an active SSE stream or
 * polling interval — covering the case where the tab is idle.
 *
 * This is the stateless, zero-infra fallback that works regardless of
 * single-instance vs. multi-instance deployments.
 */
@Injectable()
export class SessionStatusInterceptor implements NestInterceptor {
  private readonly _logger = new Logger(SessionStatusInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpCtx = context.switchToHttp();
    const request = httpCtx.getRequest<{ user?: { sessionEvictionAt?: Date | null; isGracePeriodSession?: boolean } }>();
    const response = httpCtx.getResponse<{
      setHeader: (name: string, value: string) => void;
    }>();

    const evictionAt = request.user?.sessionEvictionAt;
    const isGracePeriodSession = request.user?.isGracePeriodSession;

    if (evictionAt && isGracePeriodSession) {
      const now = Date.now();
      const evictionMs = new Date(evictionAt).getTime();
      const secondsRemaining = Math.max(0, Math.round((evictionMs - now) / 1000));

      if (secondsRemaining > 0) {
        try {
          response.setHeader('X-Session-Status', 'eviction_pending');
          response.setHeader('X-Session-Seconds-Remaining', String(secondsRemaining));
        } catch (error: unknown) {
          // Headers may already be sent in streaming responses — safe to ignore
          this._logger.debug(
            `Could not set session status headers: ${(error as Error).message}`,
          );
        }
      }
    }

    return next.handle();
  }
}
