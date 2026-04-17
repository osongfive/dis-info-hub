import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(req: Request) {
  try {
    const { name, email, requestType, details } = await req.json();

    if (!name || !email || !requestType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.warn('Privacy Request received but no RESEND_API_KEY configured');
      // Assume success so the user is not blocked, but it only logs to console
      return NextResponse.json({ success: true, warning: 'Email not sent (no config)' });
    }

    const resend = new Resend(resendApiKey);
    
    // We send emails to the default ADMIN_EMAIL or info@dis.sc.kr fallback
    const targetEmail = process.env.ADMIN_EMAIL || 'info@dis.sc.kr';

    // Send email to the school admin
    await resend.emails.send({
      from: 'DIS Privacy <onboarding@resend.dev>',
      to: targetEmail,
      subject: `New Privacy Request: ${requestType}`,
      html: `
        <h2>Privacy Data Request</h2>
        <p><strong>Requester:</strong> ${name} (${email})</p>
        <p><strong>Type:</strong> ${requestType}</p>
        <p><strong>Details:</strong></p>
        <blockquote>${details || 'No additional details provided.'}</blockquote>
        <br />
        <p><small>Submitted via the DIS Information Hub Privacy Form.</small></p>
      `
    });

    // Send confirmation to the requester
    await resend.emails.send({
      from: 'DIS Privacy <onboarding@resend.dev>',
      to: email,
      subject: `Confirmation: Your Privacy Request received`,
      html: `
        <h2>Request Received</h2>
        <p>Hello ${name},</p>
        <p>This is an automated confirmation that Daegu International School has received your data privacy request regarding: <strong>${requestType}</strong>.</p>
        <p>As per the Personal Information Protection Act (PIPA), we will process your request and respond within 10 business days.</p>
        <br />
        <p>Best regards,<br/>Daegu International School</p>
      `
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error handling privacy request:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
