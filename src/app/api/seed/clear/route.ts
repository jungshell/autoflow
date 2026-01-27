import { NextResponse } from 'next/server';
import { deleteDoc, doc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function DELETE() {
  try {
    // 모든 컬렉션 데이터 삭제
    const collections = ['tasks', 'contacts', 'alerts', 'templates'];
    let deletedCount = 0;

    for (const collectionName of collections) {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      
      const deletePromises = snapshot.docs.map(docSnapshot => 
        deleteDoc(doc(db, collectionName, docSnapshot.id))
      );
      
      await Promise.all(deletePromises);
      deletedCount += snapshot.docs.length;
    }

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
      message: '모든 테스트 데이터가 삭제되었습니다.'
    });

  } catch (error) {
    console.error('Error clearing data:', error);
    return NextResponse.json(
      { error: 'Failed to clear data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
