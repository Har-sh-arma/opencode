import { Provider } from "../provider/provider"
import { NamedError } from "@opencode-ai/util/error"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import type { ErrorHandler, MiddlewareHandler } from "hono"
import { HTTPException } from "hono/http-exception"
import { NotFoundError } from "../storage/db"
import type { Log } from "../util/log"

export function errorHandler(log: Log.Logger): ErrorHandler {
  return (err, c) => {
    log.error("failed", {
      error: err,
    })
    if (err instanceof NamedError) {
      let status: ContentfulStatusCode
      if (err instanceof NotFoundError) status = 404
      else if (err instanceof Provider.ModelNotFoundError) status = 400
      else if (err.name === "ProviderAuthValidationFailed") status = 400
      else if (err.name.startsWith("Worktree")) status = 400
      else status = 500
      return c.json(err.toObject(), { status })
    }
    if (err instanceof HTTPException) return err.getResponse()
    const message = err instanceof Error && err.stack ? err.stack : err.toString()
    return c.json(new NamedError.Unknown({ message }).toObject(), {
      status: 500,
    })
  }
}

export function requestLogger(log: Log.Logger): MiddlewareHandler {
  return async (c, next) => {
    const skip = c.req.path === "/log"
    if (!skip) {
      log.info("request", {
        method: c.req.method,
        path: c.req.path,
      })
    }
    const timer = log.time("request", {
      method: c.req.method,
      path: c.req.path,
    })
    await next()
    if (!skip) {
      timer.stop()
    }
  }
}
