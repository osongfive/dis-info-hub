import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';

export async function DELETE(req: Request) {
  try {
    // 1. Verify admin session using centralized utility
    await requireAdmin();

    const { documentId } = await req.json();

    if (!documentId || typeof documentId !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid documentId' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // 2. Fetch document to get storage path for cleanup
    const { data: doc, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('id, file_url')
      .eq('id', documentId)
      .single();

    if (fetchError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // 3. Cascade-delete orphaned vectors (F-05 pattern)
    const { error: chunksError } = await supabaseAdmin
      .from('document_chunks')
      .delete()
      .eq('document_id', documentId);

    if (chunksError) throw chunksError;

    // 4. Delete the DB record
    const { error: deleteError } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) throw deleteError;

    // 5. Best-effort: remove file from storage
    if (doc.file_url) {
      try {
        const url = new URL(doc.file_url);
        // Extract path after /storage/v1/object/public/documents/
        const prefix = '/storage/v1/object/public/documents/';
        const idx = url.pathname.indexOf(prefix);
        if (idx !== -1) {
          const storagePath = decodeURIComponent(url.pathname.slice(idx + prefix.length));
          await supabaseAdmin.storage.from('documents').remove([storagePath]);
        }
      } catch (storageErr) {
        // Non-fatal — DB record already gone, log and continue
        console.warn('[delete-document] Storage removal failed:', storageErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[delete-document]', error);
    const status = error.message?.startsWith('Unauthorized') ? 403 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
