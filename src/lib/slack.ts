/**
 * Slack Incoming Webhook으로 메시지 전송.
 * 환경 변수 SLACK_WEBHOOK_URL 이 있을 때만 전송합니다.
 */
export async function sendSlackMessage(text: string): Promise<boolean> {
  const url = process.env.SLACK_WEBHOOK_URL?.trim();
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
