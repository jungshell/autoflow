import { NextResponse } from 'next/server';
import { getContacts, createContact, getTasksByContact } from '@/lib/firestore';
import { getUidFromRequest } from '@/lib/apiAuth';
import { API_MESSAGES } from '@/lib/apiMessages';

export async function GET(request: Request) {
  try {
    const uid = await getUidFromRequest(request);
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');

    if (contactId) {
      const tasks = await getTasksByContact(contactId, uid ?? undefined);
      return NextResponse.json(tasks);
    }

    const contacts = await getContacts(uid ?? undefined);
    return NextResponse.json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json({ error: API_MESSAGES.CONTACTS_FETCH_FAIL }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const uid = await getUidFromRequest(request);
    const body = await request.json();
    const ownerId = uid ?? body.ownerId ?? 'user1';
    const contactId = await createContact({ ...body, ownerId });
    return NextResponse.json({ id: contactId });
  } catch (error) {
    console.error('Error creating contact:', error);
    return NextResponse.json({ error: API_MESSAGES.CONTACT_CREATE_FAIL }, { status: 500 });
  }
}
