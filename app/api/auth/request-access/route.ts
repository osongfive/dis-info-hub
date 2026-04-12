import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { rateLimit } from '@/lib/rate-limit';


export async function POST(req: NextRequest) {
  try {
    // 0. Rate Limiting: Strict limit for access requests (5 per hour)
    const { success, reset } = rateLimit(req, { limit: 5, windowMs: 3600000 });
    if (!success) {
      return NextResponse.json(
        { error: 'Too many access requests. Please try again later.' },
        { 
          status: 429,
          headers: { 'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString() }
        }
      );
    }

    const { name, email, reason } = await req.json();

    if (!name || !email || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseSecret = process.env.SUPABASE_SECRET_KEY!;
    const supabase = createClient(supabaseUrl, supabaseSecret);

    const { error: dbError } = await supabase.from('admin_access_requests').insert({
      name,
      email,
      reason,
      status: 'pending'
    });

    if (dbError) throw dbError;

    // 1. Initialize Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.ADMIN_EMAIL;

    
    if (resendApiKey && adminEmail) {

      const resend = new Resend(resendApiKey);
      
      try {
        const { data, error: sendError } = await resend.emails.send({
          from: 'DIS Hub <onboarding@resend.dev>',
          to: adminEmail,
          subject: `New Admin Access Request: ${name}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #0f172a; margin-bottom: 16px;">New Admin Access Request</h2>
              <p style="color: #64748b; font-size: 14px; margin-bottom: 24px;">A user has applied for administrative privileges on the DIS Information Hub.</p>
              
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; width: 100px;">Name:</td>
                  <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b;">Email:</td>
                  <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${email}</td>
                </tr>
              </table>

              <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <p style="margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; color: #3b82f6; font-weight: 700;">Reason for Request</p>
                <p style="margin: 0; color: #334155; line-height: 1.6; font-size: 15px;">${reason}</p>
              </div>

              <div style="margin-top: 32px; border-top: 1px solid #e2e8f0; pt: 16px;">
                <p style="font-size: 11px; color: #94a3b8; text-align: center;">
                  This request has been logged in the system and is awaiting your review in the Admin Dashboard.
                </p>
              </div>
            </div>
          `
        });

        if (sendError) {
          console.error('[ACCESS REQUEST] Resend Error:', sendError);
        } else {
          console.log('[ACCESS REQUEST] Email successfully sent to admin:', data?.id);
        }
      } catch (err) {
        console.error('[ACCESS REQUEST] Failed to execute send call:', err);
      }
    } else {
      console.warn('[ACCESS REQUEST] Missing RESEND_API_KEY. Notification logged but not emailed.');
      console.log(`[ACCESS REQUEST] Pending Request: ${name} (${email}) - Reason: ${reason}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in request-access API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
