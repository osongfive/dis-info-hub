import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import ical from 'node-ical';

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY!; // USE SERVICE ROLE KEY
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch the school calendar .ics
    const CALENDAR_URL = 'https://www.dis.sc.kr/calendar/calendar_354_gmt.ics';
    console.log('[CALENDAR_SYNC] Fetching from:', CALENDAR_URL);
    
    const response = await fetch(CALENDAR_URL, {
      headers: { 'User-Agent': 'DIS-Info-Hub-Sync-Service' },
      next: { revalidate: 0 } // Ensure no cache
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch calendar: ${response.status} ${response.statusText}`);
    }

    const icsContent = await response.text();
    console.log('[CALENDAR_SYNC] Received ICS content, length:', icsContent.length);

    // 2. Parse the .ics content
    const events = ical.parseICS(icsContent);
    const eventArray = [];
    console.log('[CALENDAR_SYNC] Parsing ICS components...');

    for (const key in events) {
      if (events.hasOwnProperty(key)) {
        const event = events[key] as any;
        if (event.type === 'VEVENT') {
          // Only sync events with valid start and end dates
          if (event.start && event.end && event.summary) {
            eventArray.push({
              title: event.summary,
              start_time: new Date(event.start).toISOString(),
              end_time: new Date(event.end).toISOString(),
              location: event.location || null,
              description: event.description || null,
              source: 'school',
              last_synced: new Date().toISOString()
            });
          }
        }
      }
    }

    console.log('[CALENDAR_SYNC] Found VEVENTS:', eventArray.length);

    if (eventArray.length === 0) {
      return NextResponse.json({ message: 'No events found in feed', success: false });
    }

    // 3. Upsert into Supabase (Deduplication)
    console.log('[CALENDAR_SYNC] Clearing old school events...');
    const { error: deleteError } = await supabase
      .from('calendar_events')
      .delete()
      .eq('source', 'school');

    if (deleteError) throw deleteError;

    console.log('[CALENDAR_SYNC] Inserting new events...');
    const { error: insertError } = await supabase
      .from('calendar_events')
      .insert(eventArray);

    if (insertError) throw insertError;

    console.log('[CALENDAR_SYNC] Sync complete!');
    return NextResponse.json({ 
      success: true, 
      count: eventArray.length,
      message: 'School calendar synced successfully'
    });

  } catch (error: any) {
    console.error('[CALENDAR_SYNC_ERROR]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
