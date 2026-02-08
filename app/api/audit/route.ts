import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { logAuditEvent, getAuditLog, AuditAction } from '@/lib/audit';

// POST: Log an audit event (from client-side actions)
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    await logAuditEvent({
      userId: user.id,
      documentId: body.documentId,
      action: body.action as AuditAction,
      description: body.description,
      metadata: body.metadata,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to log event' }, { status: 500 });
  }
}

// GET: Retrieve audit log
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const url = new URL(request.url);

    const { data } = await getAuditLog(user.id, {
      documentId: url.searchParams.get('documentId') || undefined,
      action: (url.searchParams.get('action') as AuditAction) || undefined,
      limit: parseInt(url.searchParams.get('limit') || '50'),
      offset: parseInt(url.searchParams.get('offset') || '0'),
    });

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Failed to get audit log' }, { status: 500 });
  }
}
