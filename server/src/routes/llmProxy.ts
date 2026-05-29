import express from 'express';

/**
 * LLM 转发代理
 *
 * 解决问题：浏览器直接访问跨域的模型 API 会被 CORS 拦截（尤其是管理员在 UI 里
 * 自己填的任意模型地址）。前端把 baseURL 改写为同源的 /api/llm-proxy，真实模型
 * 地址通过请求头 X-Target-Base 传过来，由 Node 后端转发（Node 无浏览器 CORS 限制）。
 *
 * 例：
 *   前端请求  POST /api/llm-proxy/chat/completions
 *            Header: X-Target-Base: http://15.77.255.198:22090/v1
 *   实际转发  POST http://15.77.255.198:22090/v1/chat/completions
 *
 * 注意：本路由必须挂在 express.json() 之前，自己读原始 body，避免 body 被消费/截断，
 * 同时支持流式（SSE）响应透传。
 */
const router = express.Router();

router.all(/.*/, async (req: express.Request, res: express.Response) => {
  const targetBase = String(req.header('x-target-base') || '').trim();
  if (!targetBase) {
    res.status(400).json({ error: 'Missing X-Target-Base header' });
    return;
  }

  // 挂载点 /api/llm-proxy 之后的子路径，例如 /chat/completions
  const subPath = req.path.replace(/^\/+/, '');
  const base = targetBase.replace(/\/+$/, '');
  const queryIndex = req.originalUrl.indexOf('?');
  const qs = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : '';
  const targetUrl = subPath ? `${base}/${subPath}${qs}` : `${base}${qs}`;

  // 读取原始请求体
  const chunks: Buffer[] = [];
  try {
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }
  } catch (e) {
    res.status(400).json({ error: 'Failed to read request body' });
    return;
  }
  const body = chunks.length ? Buffer.concat(chunks) : undefined;

  // 透传请求头，去掉会干扰转发的 hop-by-hop / 定位类头
  const headers: Record<string, string> = {};
  const dropHeaders = new Set([
    'host', 'origin', 'referer', 'connection', 'content-length', 'x-target-base',
  ]);
  for (const [k, v] of Object.entries(req.headers)) {
    if (dropHeaders.has(k.toLowerCase())) continue;
    if (typeof v === 'string') headers[k] = v;
    else if (Array.isArray(v)) headers[k] = v.join(', ');
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : body,
    });

    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      // 这些头由 Node/Express 自己管理，透传会导致响应损坏
      if (['content-encoding', 'transfer-encoding', 'connection', 'content-length'].includes(k)) {
        return;
      }
      res.setHeader(key, value);
    });

    if (!upstream.body) {
      res.end();
      return;
    }

    // 流式透传（支持 SSE，逐块写回）
    const reader = (upstream.body as ReadableStream<Uint8Array>).getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) res.write(Buffer.from(value));
    }
    res.end();
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error('[llm-proxy] forward error:', msg, '→', targetUrl);
    if (!res.headersSent) {
      res.status(502).json({ error: 'LLM proxy forward failed', detail: msg });
    } else {
      res.end();
    }
  }
});

export default router;
