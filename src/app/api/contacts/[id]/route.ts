import { NextResponse } from 'next/server';
import { getContactById, updateContact, deleteContact } from '@/lib/firestoreAdmin';
import { getUidFromRequest } from '@/lib/apiAuth';
import { API_MESSAGES } from '@/lib/apiMessages';

function canAccessContact(contact: { ownerId?: string }, uid: string | null): boolean {
  if (!uid) return true;
  if (contact.ownerId == null) return true;
  return contact.ownerId === uid;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const uid = await getUidFromRequest(request);
    const contact = await getContactById(id);
    if (!contact) {
      return NextResponse.json({ error: API_MESSAGES.CONTACT_NOT_FOUND }, { status: 404 });
    }
    if (!canAccessContact(contact, uid)) {
      return NextResponse.json({ error: '이 연락처에 접근할 수 없습니다.' }, { status: 403 });
    }
    return NextResponse.json(contact);
  } catch (error) {
    console.error('Error fetching contact:', error);
    return NextResponse.json({ error: API_MESSAGES.CONTACTS_FETCH_FAIL }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const uid = await getUidFromRequest(request);
    const existing = await getContactById(id);
    if (!existing) {
      return NextResponse.json({ error: API_MESSAGES.CONTACT_NOT_FOUND }, { status: 404 });
    }
    if (!canAccessContact(existing, uid)) {
      return NextResponse.json({ error: '이 연락처를 수정할 수 없습니다.' }, { status: 403 });
    }
    const body = await request.json();
    const { name, company, email, phone, tags } = body;
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (company !== undefined) updates.company = company;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (tags !== undefined) updates.tags = tags;
    await updateContact(id, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json({ error: API_MESSAGES.CONTACT_UPDATE_FAIL }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const uid = await getUidFromRequest(request);
    const existing = await getContactById(id);
    if (!existing) {
      return NextResponse.json({ error: API_MESSAGES.CONTACT_NOT_FOUND }, { status: 404 });
    }
    if (!canAccessContact(existing, uid)) {
      return NextResponse.json({ error: '이 연락처를 삭제할 수 없습니다.' }, { status: 403 });
    }
    await deleteContact(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json({ error: API_MESSAGES.CONTACT_DELETE_FAIL }, { status: 500 });
  }
}
