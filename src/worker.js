import tsv from './catalog.tsv';
import { parse, search, armstat } from './search.mjs';

const rows = parse(tsv);

const TOOLS = [
  {
    name: 'find_indicator',
    description:
      `Search ${rows.length} ArmStatBank statistical tables by keyword. Returns table paths to pass ` +
      `to describe_table/get_data, with the date each was last updated. Start here.`,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Keywords, e.g. "consumer price index" or "unemployment rate"' },
        limit: { type: 'integer', default: 15 },
      },
      required: ['query'],
    },
  },
  {
    name: 'describe_table',
    description: 'Dimensions, value codes and labels for one table. Required before get_data.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Table path from find_indicator' },
        lang: { type: 'string', enum: ['en', 'hy'], default: 'en' },
      },
      required: ['path'],
    },
  },
  {
    name: 'get_data',
    description:
      'Fetch data as JSON-stat 2.0. Omit a dimension to get all its values. ' +
      'Limits: 1000 values per dimension, 100000 cells per call.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        selection: {
          type: 'object',
          description: 'Map of dimension code to array of value codes, e.g. {"years":["33"]}',
          additionalProperties: { type: 'array', items: { type: 'string' } },
        },
        lang: { type: 'string', enum: ['en', 'hy'], default: 'en' },
      },
      required: ['path'],
    },
  },
];

async function call(name, args = {}) {
  if (name === 'find_indicator') {
    const hits = search(rows, args.query, args.limit ?? 15);
    if (!hits.length) return `No table matches "${args.query}". Try broader terms.`;
    return hits.map(h => `${h.path}\n  ${h.title}\n  updated ${h.updated}`).join('\n\n');
  }
  if (name === 'describe_table') {
    return JSON.stringify(await armstat(args.path, { lang: args.lang }), null, 1);
  }
  if (name === 'get_data') {
    const query = Object.entries(args.selection ?? {}).map(([code, values]) => ({
      code,
      selection: { filter: 'item', values },
    }));
    const body = { query, response: { format: 'json-stat2' } };
    return JSON.stringify(await armstat(args.path, { lang: args.lang, body }), null, 1);
  }
  throw new Error(`Unknown tool ${name}`);
}

export async function rpc(msg) {
  const { id, method, params } = msg;
  const ok = result => ({ jsonrpc: '2.0', id, result });

  if (method === 'initialize')
    return ok({
      protocolVersion: params?.protocolVersion ?? '2025-06-18',
      capabilities: { tools: {} },
      serverInfo: { name: 'armstat', version: '1.0.0' },
    });
  if (method === 'ping') return ok({});
  if (method === 'tools/list') return ok({ tools: TOOLS });
  if (method === 'tools/call') {
    try {
      return ok({ content: [{ type: 'text', text: await call(params.name, params.arguments) }] });
    } catch (e) {
      return ok({ content: [{ type: 'text', text: e.message }], isError: true });
    }
  }
  if (method?.startsWith('notifications/')) return null; // notifications get no reply
  return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown method ${method}` } };
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, mcp-session-id, mcp-protocol-version',
};

export default {
  async fetch(req) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const { pathname } = new URL(req.url);
    if (pathname === '/health') return new Response(`ok, ${rows.length} tables`, { headers: CORS });
    if (pathname !== '/mcp') return new Response('POST /mcp', { status: 404, headers: CORS });
    if (req.method !== 'POST') return new Response('POST /mcp', { status: 405, headers: CORS });

    let msg;
    try { msg = await req.json(); }
    catch { return Response.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, { headers: CORS }); }
    // ponytail: stateless. No session store, no Durable Object — every tool is a
    // pure lookup. Add McpAgent only if a tool ever needs per-client state.
    const out = Array.isArray(msg)
      ? (await Promise.all(msg.map(rpc))).filter(Boolean)
      : await rpc(msg);
    if (!out || (Array.isArray(out) && !out.length)) return new Response(null, { status: 202, headers: CORS });
    return Response.json(out, { headers: CORS });
  },
};
