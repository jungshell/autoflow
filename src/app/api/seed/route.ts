import { NextResponse } from 'next/server';
import { 
  createTask, 
  createContact, 
  createAlert,
  createTemplate 
} from '@/lib/firestore';
import { Timestamp } from 'firebase/firestore';
import type { Task, Contact, Alert, Template } from '@/types/models';
import { API_MESSAGES } from '@/lib/apiMessages';

export async function POST() {
  try {
    // 기존 데이터 확인 (중복 방지)
    const { getTasks, getContacts } = await import('@/lib/firestore');
    const existingTasks = await getTasks();
    const existingContacts = await getContacts();
    
    if (existingTasks.length > 0 || existingContacts.length > 0) {
      return NextResponse.json({ 
        message: '이미 데이터가 존재합니다. 초기화하려면 먼저 데이터를 삭제하세요.',
        existingTasks: existingTasks.length,
        existingContacts: existingContacts.length
      }, { status: 400 });
    }

    const defaultOwnerId = 'user1';
    // 더미 데이터 최소화: 연락처 3명
    const contacts: Omit<Contact, 'id'>[] = [
      { name: '민지', company: '디자인팀', email: 'minji@example.com', tags: ['디자인'], ownerId: defaultOwnerId },
      { name: '유진', company: '마케팅팀', email: 'yujin@example.com', tags: ['마케팅'], ownerId: defaultOwnerId },
      { name: '나', company: '본인', email: 'me@example.com', tags: ['개인'], ownerId: defaultOwnerId }
    ];

    const contactIds: string[] = [];
    for (const contact of contacts) {
      const id = await createContact(contact);
      contactIds.push(id);
    }

    // 업무 3건
    const now = new Date();
    const tasks: Omit<Task, 'id'>[] = [
      {
        title: '제안서 최종 제출',
        description: '고객사 제안서 검토 후 제출',
        status: 'in_progress',
        priority: 'urgent',
        dueAt: new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString(),
        ownerId: 'user1',
        assigneeId: contactIds[0]
      },
      {
        title: '고객 미팅 정리',
        description: '미팅 내용 정리 및 후속 연락',
        status: 'todo',
        priority: 'high',
        dueAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        ownerId: 'user1',
        assigneeId: contactIds[1]
      },
      {
        title: '문구 점검 및 수정',
        description: '브랜드 문구 최종 점검',
        status: 'todo',
        priority: 'medium',
        dueAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        ownerId: 'user1',
        assigneeId: contactIds[2]
      }
    ];

    const taskIds: string[] = [];
    for (const task of tasks) {
      const id = await createTask(task);
      taskIds.push(id);
    }

    // 알림 3건
    const alerts: Omit<Alert, 'id'>[] = [
      { type: 'delay', message: "지연 감지: 마감일이 지난 업무가 있습니다.", taskId: taskIds[0], isRead: false, ownerId: defaultOwnerId },
      { type: 'summary', message: '오늘 완료율 · 지연 위험 · 총 업무를 한눈에 확인하세요.', isRead: false, ownerId: defaultOwnerId },
      { type: 'suggestion', message: '우선순위 높은 업무부터 처리해 보세요.', isRead: false, ownerId: defaultOwnerId }
    ];

    const alertIds: string[] = [];
    for (const alert of alerts) {
      const id = await createAlert(alert);
      alertIds.push(id);
    }

    // 템플릿 2개
    const templates: Omit<Template, 'id'>[] = [
      { name: '주간 업무 점검 체크리스트', description: '매주 반복 업무 점검용', checklist: ['지난 주 완료 정리', '이번 주 우선순위', '지연 업무 조치'], repeatInterval: 'weekly', ownerId: defaultOwnerId },
      { name: '월간 보고서 요약', description: '매월 보고서 작성용', checklist: ['이번 달 성과', '다음 달 계획'], repeatInterval: 'monthly', ownerId: defaultOwnerId }
    ];

    const templateIds: string[] = [];
    for (const template of templates) {
      const id = await createTemplate(template);
      templateIds.push(id);
    }

    return NextResponse.json({
      success: true,
      created: {
        contacts: contactIds.length,
        tasks: taskIds.length,
        alerts: alertIds.length,
        templates: templateIds.length
      },
      message: '테스트 데이터가 성공적으로 생성되었습니다.'
    });

  } catch (error) {
    console.error('Error seeding data:', error);
    return NextResponse.json(
      { error: API_MESSAGES.SEED_FAIL, details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
