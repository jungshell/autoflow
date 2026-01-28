import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/verifyToken';

/**
 * 모든 Firestore 데이터 초기화 (Firebase Admin SDK 사용)
 * 주의: 이 API는 모든 컬렉션의 모든 데이터를 삭제합니다.
 */
export async function DELETE() {
  try {
    // Firebase Admin SDK 초기화 확인
    const app = getAdminApp();
    if (!app) {
      return NextResponse.json(
        {
          error: 'Firebase Admin SDK가 초기화되지 않았습니다.',
          hint: '환경 변수를 확인하세요.',
        },
        { status: 503 }
      );
    }

    const db = getFirestore(app);
    
    // 삭제할 컬렉션 목록
    const collections = ['tasks', 'contacts', 'alerts', 'templates', 'work_logs', 'calendar_tokens'];
    const result: Record<string, number> = {};
    let totalDeleted = 0;

    // 각 컬렉션의 모든 문서 삭제
    for (const collectionName of collections) {
      try {
        const snapshot = await db.collection(collectionName).get();
        const docs = snapshot.docs;
        let deletedInCollection = 0;

        // Firestore는 한 번에 최대 500개까지 삭제 가능하므로 배치 처리
        const BATCH_SIZE = 500;
        for (let i = 0; i < docs.length; i += BATCH_SIZE) {
          const batch = db.batch();
          const batchDocs = docs.slice(i, i + BATCH_SIZE);
          
          for (const doc of batchDocs) {
            batch.delete(doc.ref);
          }
          
          await batch.commit();
          deletedInCollection += batchDocs.length;
        }

        result[collectionName] = deletedInCollection;
        totalDeleted += deletedInCollection;
      } catch (collectionError) {
        console.error(`Error deleting collection ${collectionName}:`, collectionError);
        result[collectionName] = 0;
      }
    }

    return NextResponse.json({
      success: true,
      deleted: totalDeleted,
      details: result,
      message: '모든 데이터가 초기화되었습니다.',
    });
  } catch (error) {
    console.error('Error clearing data:', error);
    return NextResponse.json(
      {
        error: '데이터 초기화 실패',
        details: error instanceof Error ? error.message : 'Unknown error',
        hint: 'Vercel Functions → Logs에서 상세 오류를 확인하세요.',
      },
      { status: 500 }
    );
  }
}
