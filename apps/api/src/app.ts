import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";

// ---------------------------------------------------------------------------
// 契约（TODO Sprint 2: 出现第二个接口时抽到 packages/contracts 供 client 共享）
// ---------------------------------------------------------------------------

interface HealthResponse {
  status: "ok";
  uptimeSec: number;
  version: string;
  timestamp: string;
}

type ApiErrorCode = "VALIDATION_ERROR" | "NOT_FOUND" | "INTERNAL_ERROR";

interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    requestId: string;
  };
}

/**
 * 上游中间件（如 express.json）抛出的错误会带 status / statusCode。
 * 这类 4xx 是「客户端请求有问题」，不能一律当 500——否则客户端会误以为是服务端故障。
 * 只有真正未预期的异常才归 500。
 */
function resolveHttpStatus(err: unknown): number {
  if (typeof err === "object" && err !== null) {
    const candidate = err as { status?: unknown; statusCode?: unknown };
    const raw = candidate.status ?? candidate.statusCode;
    if (typeof raw === "number" && raw >= 400 && raw < 500) return raw;
  }
  return 500;
}

function errorCodeFor(status: number): ApiErrorCode {
  if (status === 404) return "NOT_FOUND";
  // 4xx 全部归为「请求本身有问题」：400 非法 JSON、413 body 过大等
  if (status >= 400 && status < 500) return "VALIDATION_ERROR";
  return "INTERNAL_ERROR";
}

function messageFor(code: ApiErrorCode): string {
  if (code === "VALIDATION_ERROR") return "Request is invalid";
  if (code === "NOT_FOUND") return "Resource not found";
  return "Internal server error";
}

// ---------------------------------------------------------------------------
// 版本号从 package.json 读，避免与发布版本漂移。
// dev 时 import.meta.url 在 src/，build 后在 dist/，'../package.json' 两者都能命中
// apps/api/package.json。读不到就退化为 'unknown'，不让进程起不来。
// ---------------------------------------------------------------------------
const appVersion = ((): string => {
  try {
    const raw = readFileSync(
      new URL("../package.json", import.meta.url),
      "utf8",
    );
    const parsed = JSON.parse(raw) as { version?: string };
    return parsed.version ?? "unknown";
  } catch {
    return "unknown";
  }
})();

const app: Express = express();

// ---------------------------------------------------------------------------
// 1. 不暴露技术栈指纹
// ---------------------------------------------------------------------------
app.disable("x-powered-by");

// ---------------------------------------------------------------------------
// 2. 安全响应头
//    必须注册在所有路由之前，才能覆盖每一个响应（包括 404 和错误响应）
// ---------------------------------------------------------------------------
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

// ---------------------------------------------------------------------------
// 3. 请求 ID
//    必须在日志之前注册，否则日志里没有 ID 可打。
//    同时回写响应头，用户报错时截图就能对应到日志的那一行。
// ---------------------------------------------------------------------------
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = randomUUID();
  req.id = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
});

// ---------------------------------------------------------------------------
// 4. 访问日志
//    用 hrtime.bigint() 而不是 Date.now()：单调时钟，不受系统时间调整影响。
//    必须监听 res 的 'finish' 事件——只有响应真正写完，才知道最终状态码和耗时。
// ---------------------------------------------------------------------------
app.use((req: Request, res: Response, next: NextFunction) => {
  const startNs = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startNs) / 1e6;
    console.log(
      JSON.stringify({
        level: "info",
        msg: "request",
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Number(durationMs.toFixed(1)),
        requestId: req.id,
      }),
    );
  });

  next();
});

// ---------------------------------------------------------------------------
// 5. JSON body 解析
//    body-parser 默认上限是 100kb（已核实 body-parser@2.4.0 的 102400 字节）。
//    收紧到 10kb 不是「防止没上限」，而是把项目的预期边界写进代码：
//    本服务的接口只收小 JSON，超过 10kb 的请求八成是异常流量，早拒绝比晚解析省资源。
//    另外 JSON 解析是同步的，超大 body 会阻塞事件循环、拖慢所有并发请求。
// ---------------------------------------------------------------------------
app.use(express.json({ limit: "10kb" }));

// ---------------------------------------------------------------------------
// 6. 路由
// ---------------------------------------------------------------------------
app.get("/health", (_req: Request, res: Response<HealthResponse>) => {
  res.json({
    status: "ok",
    // floor 而不是四舍五入：语义是「已运行多少秒」
    uptimeSec: Math.floor(process.uptime()),
    version: appVersion,
    // 永远是 UTC，时区转换交给客户端
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// 7. 404：放在所有路由之后。
//    不要写 app.get('*')——Express 5 的 path-to-regexp v8 已移除裸 '*'，会直接抛错。
// ---------------------------------------------------------------------------
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: `Route not found: ${req.method} ${req.path}`,
      requestId: req.id ?? "unknown",
    },
  } satisfies ApiErrorBody);
});

// ---------------------------------------------------------------------------
// 8. 统一错误处理：必须 4 个参数，少一个 Express 就不认它是错误处理器。
//    响应里绝不能出现 err.stack、SQL 原文或环境变量；细节只进服务端日志。
// ---------------------------------------------------------------------------
app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  // 响应头已发出时再改状态码会抛 "Cannot set headers after they are sent"。
  // 这种情况只能交回 Express 默认处理器，让它中断连接。
  if (res.headersSent) {
    next(err);
    return;
  }

  const status = resolveHttpStatus(err);
  const code = errorCodeFor(status);

  console[status >= 500 ? "error" : "warn"](
    JSON.stringify({
      level: status >= 500 ? "error" : "warn",
      msg: "request failed",
      requestId: req.id,
      status,
      errorName: err instanceof Error ? err.name : typeof err,
      errorMessage: err instanceof Error ? err.message : String(err),
      // stack 只进服务端日志，绝不进响应体
      stack: err instanceof Error ? err.stack : undefined,
    }),
  );

  res.status(status).json({
    error: {
      code,
      message: messageFor(code),
      requestId: req.id ?? "unknown",
    },
  } satisfies ApiErrorBody);
});

export default app;
