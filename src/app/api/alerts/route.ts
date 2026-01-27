import { NextResponse } from 'next/server';
import { getAlerts, createAlert } from '@/lib/firestoreAdmin';
import { getUidFromRequest } from '@/lib/apiAuth';
import { API_MESSAGES } from '@/lib/apiMessages';

export async function GET(request: Request) {
  try {
    const uid = await getUidFromRequest(request);
    const alerts = await getAlerts(uid ?? undefined);
    return NextResponse.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json({ error: API_MESSAGES.ALERTS_FETCH_FAIL }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const uid = await getUidFromRequest(request);
    const body = await request.json();
    const ownerId = uid ?? body.ownerId ?? 'user1';
    const alertId = await createAlert({ ...body, ownerId });
    return NextResponse.json({ id: alertId });
  } catch (error) {
    console.error('Error creating alert:', error);
    return NextResponse.json({ error: API_MESSAGES.ALERT_CREATE_FAIL }, { status: 500 });
  }
}
