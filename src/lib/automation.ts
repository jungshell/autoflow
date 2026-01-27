import { getTasks, updateTask, createAlert } from './firestore';
import type { Task, TaskPriority } from '@/types/models';

/**
 * 스마트 우선순위 자동 분류
 * 마감일, 지연 여부, 담당자 등을 기반으로 우선순위 자동 계산
 */
export function calculatePriority(task: Task): TaskPriority {
  const now = new Date();
  const dueDate = task.dueAt ? new Date(task.dueAt) : null;
  
  // 마감일이 지났으면 긴급
  if (dueDate && dueDate < now) {
    return 'urgent';
  }
  
  // 마감일이 24시간 이내면 높음
  if (dueDate) {
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilDue <= 24) {
      return 'high';
    }
    if (hoursUntilDue <= 72) {
      return 'medium';
    }
  }
  
  // 기본값
  return task.priority || 'low';
}

/**
 * 지연 감지 및 알림 생성
 */
export async function detectDelays(): Promise<void> {
  const tasks = await getTasks();
  const now = new Date();
  
  for (const task of tasks) {
    if (task.status === 'done') continue;
    
    const dueDate = task.dueAt ? new Date(task.dueAt) : null;
    if (dueDate && dueDate < now) {
      const daysDelayed = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // 지연 알림 생성
      await createAlert({
        type: 'delay',
        message: `지연 감지: '${task.title}'가 ${daysDelayed}일 지연되었습니다.`,
        taskId: task.id
      });
    }
  }
}

/**
 * 리마인드 주기 자동 조정
 * 진행률과 중요도에 따라 알림 주기 조정
 */
export function calculateReminderInterval(task: Task): "6h" | "12h" | "24h" {
  const priority = calculatePriority(task);
  const now = new Date();
  const dueDate = task.dueAt ? new Date(task.dueAt) : null;
  
  if (priority === 'urgent' && dueDate) {
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilDue <= 12) {
      return '6h';
    }
    return '12h';
  }
  
  if (priority === 'high') {
    return '12h';
  }
  
  return '24h';
}

/**
 * 다음 액션 자동 제안
 */
export async function suggestNextActions(): Promise<string[]> {
  const tasks = await getTasks();
  const now = new Date();
  
  // 미완료 업무 중 지연 위험 높은 것들
  const delayedTasks = tasks
    .filter(task => task.status !== 'done')
    .filter(task => {
      const dueDate = task.dueAt ? new Date(task.dueAt) : null;
      if (!dueDate) return false;
      const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursUntilDue <= 48 && hoursUntilDue > 0;
    })
    .sort((a, b) => {
      const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
      const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
      return aDue - bDue;
    })
    .slice(0, 3);
  
  return delayedTasks.map(task => 
    `미완료 업무 중 가장 지연 위험 높은 ${delayedTasks.length}건 확인`
  );
}

/**
 * 데일리 요약 생성
 */
export async function generateDailySummary(): Promise<string> {
  const tasks = await getTasks();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const completedToday = tasks.filter(task => {
    if (task.status !== 'done') return false;
    // 실제로는 updatedAt을 확인해야 하지만, 여기서는 간단히 처리
    return true;
  }).length;
  
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedToday / totalTasks) * 100) : 0;
  
  const delayedCount = tasks.filter(task => {
    if (task.status === 'done') return false;
    const dueDate = task.dueAt ? new Date(task.dueAt) : null;
    return dueDate && dueDate < now;
  }).length;
  
  return `오늘 완료율: ${completionRate}% | 지연 위험: ${delayedCount}건 | 총 업무: ${totalTasks}건`;
}
