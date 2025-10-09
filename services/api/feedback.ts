import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { Resend } from 'resend';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const sanitize = (s: string) => s.replace(/[\r\n]/g, ' ').trim();

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const body = event.body ? JSON.parse(event.body) : null;
    if (!body || typeof body !== 'object') {
      return { statusCode: 400, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: 'Invalid request body' }) };
    }
    const type = body.type === 'bug' ? 'bug' : 'feedback';
    const name = sanitize(String(body.name ?? ''));
    const email = sanitize(String(body.email ?? ''));
    const message = String(body.message ?? '').trim();
    const honeypot = String(body.company ?? '').trim();

    if (honeypot) return { statusCode: 200, body: JSON.stringify({ ok: true }) } as any;
    if (name.length < 2 || name.length > 100) return { statusCode: 400, body: JSON.stringify({ error: 'Please provide your name (2-100 chars).' }) } as any;
    if (!emailRegex.test(email)) return { statusCode: 400, body: JSON.stringify({ error: 'Please provide a valid email.' }) } as any;
    if (message.length < 10 || message.length > 5000) return { statusCode: 400, body: JSON.stringify({ error: 'Message should be between 10 and 5000 characters.' }) } as any;

    const to = (process.env.CONTACT_TO_EMAIL || 'hh727w@gmail.com').split(',').map(s => s.trim()).filter(Boolean);
    const from = process.env.CONTACT_FROM_EMAIL || `Echoes of Pharloom ${type === 'bug' ? 'Bug Report' : 'Feedback'} <onboarding@resend.dev>`;
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      console.warn('RESEND_API_KEY not set; skipping email send', { name, email, message });
      return { statusCode: 200, body: JSON.stringify({ ok: true }) } as any;
    }

    const resend = new Resend(apiKey);
    const subject = `New ${type} from ${name}`;
    const text = `Type: ${type}\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message}`;

    const { error } = await resend.emails.send({ from, to, subject, text, replyTo: email });
    if (error) {
      console.error('Resend error', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Failed to send email' }) } as any;
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) } as any;
  } catch (e) {
    console.error('/feedback error', e);
    return { statusCode: 500, body: JSON.stringify({ error: 'Unexpected error' }) } as any;
  }
};