import { NextRequest } from "next/server";

const INTERNAL_API_BASE_URL = process.env.INTERNAL_API_BASE_URL ?? "http://api:8000";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function buildTargetUrl(request: NextRequest, path: string[]) {
  const target = new URL(path.join("/"), `${INTERNAL_API_BASE_URL}/`);
  target.search = request.nextUrl.search;
  return target;
}

function cloneForwardHeaders(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("host");
  return headers;
}

async function forward(request: NextRequest, context: { params: { path: string[] } }) {
  const { path } = context.params;
  const targetUrl = buildTargetUrl(request, path);
  const headers = cloneForwardHeaders(request);
  const canHaveBody = request.method !== "GET" && request.method !== "HEAD";

  const upstream = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: canHaveBody ? await request.arrayBuffer() : undefined,
    cache: "no-store",
    redirect: "manual",
  });

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");
  responseHeaders.delete("transfer-encoding");

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export async function GET(request: NextRequest, context: { params: { path: string[] } }) {
  return forward(request, context);
}

export async function POST(request: NextRequest, context: { params: { path: string[] } }) {
  return forward(request, context);
}

export async function PATCH(request: NextRequest, context: { params: { path: string[] } }) {
  return forward(request, context);
}

export async function PUT(request: NextRequest, context: { params: { path: string[] } }) {
  return forward(request, context);
}

export async function DELETE(request: NextRequest, context: { params: { path: string[] } }) {
  return forward(request, context);
}

export async function OPTIONS(request: NextRequest, context: { params: { path: string[] } }) {
  return forward(request, context);
}
