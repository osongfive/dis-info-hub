import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { createClient as createSupabaseServer } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { requestId, action } = await req.json();

    if (!requestId || !action) {
      return NextResponse.json({ error: 'Missing requestId or action' }, { status: 400 });
    }

    // 1. Verify Admin Session
    const supabaseServer = await createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!
    );
    
    // Auth Check: Ensure the current user is an admin
    const authSupabase = await createSupabaseServer();
    const { data: { user } } = await authSupabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminEmail = process.env.ADMIN_EMAIL;

    const isOwner = user.email === adminEmail;
    const isSystemAdmin = user.app_metadata?.role === 'admin';

    if (!isOwner && !isSystemAdmin) {
      return NextResponse.json({ error: 'Forbidden: Only the system owner can manage access requests' }, { status: 403 });
    }


    // 2. Fetch Request Details
    const { data: request, error: fetchError } = await supabaseServer
      .from('admin_access_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // 3. Update Status
    const newStatus = action === 'approve' ? 'approved' : 'denied';
    const { error: updateError } = await supabaseServer
      .from('admin_access_requests')
      .update({ status: newStatus })
      .eq('id', requestId);

    if (updateError) throw updateError;

    // 4. Send Email if Approved
    if (action === 'approve') {
      const resendApiKey = process.env.RESEND_API_KEY;
      if (resendApiKey) {
        const resend = new Resend(resendApiKey);
        console.log(`[APPROVAL] Preparing to send acceptance email to: ${request.email}`);
        
      try {
        const { data, error: sendError } = await resend.emails.send({
          from: 'DIS Hub <onboarding@resend.dev>',
          to: request.email, // This is the requester's email from the database
          subject: 'Admin Access Approved - DIS Information Hub',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #059669; margin-bottom: 16px;">Welcome to the Admin Team!</h2>
              <p style="color: #0f172a; font-size: 16px; font-weight: 500;">Hello ${request.name},</p>
              <p style="color: #64748b; font-size: 15px; line-height: 1.6;">
                Great news! Your request for administrative access to the <strong>DIS Information Hub</strong> has been reviewed and <strong>approved</strong>.
              </p>
              
              <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border: 1px solid #dcfce7; margin: 24px 0;">
                <p style="margin: 0; color: #166534; font-size: 14px;">
                  You can now log in to the admin portal and begin managing documents, policies, and AI search settings.
                </p>
              </div>

              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://dis-knowledge-hub.vercel.app'}/auth/login" 
                 style="display: inline-block; background: #0f172a; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-bottom: 24px;">
                Access Admin Portal
              </a>

              <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 32px;">
                <p style="font-size: 12px; color: #94a3b8; text-align: center;">
                  Internal system notification for ${request.email}. If you have any questions, please contact the system administrator.
                </p>
              </div>
            </div>
          `
        });

        if (sendError) {
          console.error('[APPROVAL] Resend Error:', sendError);
        } else {
          console.log('[APPROVAL] Acceptance email sent successfully:', data?.id);
        }
      } catch (err) {
        console.error('[APPROVAL] Failed to execute send call:', err);
      }
      }
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error: any) {
    console.error('Error in manage-request API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
