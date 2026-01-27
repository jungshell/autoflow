/**
 * 서버 전용: Firebase Admin SDK로 Firestore 접근.
 * API 라우트에서 사용하며, 클라이언트 규칙(request.auth) 없이 쓰기가 가능합니다.
 */
import { getFirestore, Timestamp, type DocumentData } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/verifyToken';
import type { Task } from '@/types/models';

function getDb() {
  const app = getAdminApp();
  if (!app) {
    throw new Error(
      'Firebase Admin이 초기화되지 않았습니다. FIREBASE_SERVICE_ACCOUNT_JSON 또는 FIREBASE_PROJECT_ID+FIREBASE_CLIENT_EMAIL+FIREBASE_PRIVATE_KEY 환경 변수를 설정하세요.'
    );
  }
  return getFirestore(app);
}

function toTask(id: string, data: DocumentData): Task {
  const dueAt = data.dueAt;
  const receivedAt = data.receivedAt;
  const createdAt = data.createdAt;
  const updatedAt = data.updatedAt;
  return {
    id,
    title: data.title,
    description: data.description,
    status: data.status,
    priority: data.priority,
    ownerId: data.ownerId,
    assigneeId: data.assigneeId,
    assigner: data.assigner,
    dueAt: dueAt?.toDate ? dueAt.toDate().toISOString() : dueAt,
    receivedAt: receivedAt?.toDate ? receivedAt.toDate().toISOString() : receivedAt,
    createdAt: createdAt?.toDate ? createdAt.toDate().toISOString() : createdAt,
    updatedAt: updatedAt?.toDate ? updatedAt.toDate().toISOString() : updatedAt,
  } as Task;
}

function toFirestoreData(obj: Record<string, unknown>): DocumentData {
  const out: DocumentData = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (v && typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) {
      try {
        out[k] = Timestamp.fromDate(new Date(v));
      } catch {
        out[k] = v;
      }
    } else {
      out[k] = v;
    }
  }
  return out;
}

export async function getTasks(ownerId?: string | null): Promise<Task[]> {
  const db = getDb();
  const col = db.collection('tasks');
  const snapshot = ownerId
    ? await col.where('ownerId', '==', ownerId).get()
    : await col.get();
  return snapshot.docs.map((d) => toTask(d.id, d.data()));
}

export async function getTaskById(id: string): Promise<Task | null> {
  const db = getDb();
  const ref = db.collection('tasks').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return null;
  return toTask(snap.id, snap.data()!);
}

export async function createTask(task: Omit<Task, 'id'>): Promise<string> {
  const db = getDb();
  const data = toFirestoreData(task as Record<string, unknown>);
  data.createdAt = Timestamp.now();
  data.updatedAt = Timestamp.now();
  const ref = await db.collection('tasks').add(data);
  return ref.id;
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<void> {
  const db = getDb();
  const data = toFirestoreData(updates as Record<string, unknown>);
  data.updatedAt = Timestamp.now();
  await db.collection('tasks').doc(id).update(data);
}

export async function deleteTask(id: string): Promise<void> {
  const db = getDb();
  await db.collection('tasks').doc(id).delete();
}
