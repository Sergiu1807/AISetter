import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const RAILWAY_API_URL = process.env.RAILWAY_API_URL;

// Proxy all API requests to Railway backend
async function proxyToRailway(request: NextRequest) {
  if (!RAILWAY_API_URL) {
    return NextResponse.json(
      { error: 'RAILWAY_API_URL not configured' },
      { status: 503 }
    );
  }

  const path = request.nextUrl.pathname;
  const search = request.nextUrl.search;
  const targetUrl = `${RAILWAY_API_URL}${path}${search}`;

  // Extract Supabase session token from cookies and forward as Bearer token
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  // Build headers for Railway
  const headers: Record<string, string> = {
    'Content-Type': request.headers.get('content-type') || 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // Forward any ManyChat signature header
  const manychatSig = request.headers.get('x-manychat-signature');
  if (manychatSig) {
    headers['x-manychat-signature'] = manychatSig;
  }

  try {
    const body = ['GET', 'HEAD'].includes(request.method)
      ? undefined
      : await request.text();

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
    });

    const responseBody = await response.text();

    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'application/json',
      },
    });
  } catch (error) {
    console.error('[PROXY] Error forwarding to Railway:', error);
    return NextResponse.json(
      { error: 'Backend unavailable' },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest) { return proxyToRailway(request); }
export async function POST(request: NextRequest) { return proxyToRailway(request); }
export async function PATCH(request: NextRequest) { return proxyToRailway(request); }
export async function DELETE(request: NextRequest) { return proxyToRailway(request); }
export async function PUT(request: NextRequest) { return proxyToRailway(request); }
