import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import ical from 'node-ical';

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 1. Fetch the school calendar .ics
    const CALENDAR_URL = 'https://www.dis.sc.kr/calendar/calendar_354_gmt.ics';
    const response = await fetch(CALENDAR_URL);
    const icsContent = await response.text();

    // 2. Parse the .ics content
    const events = ical.parseICS(icsContent);
    const eventArray = [];

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

    if (eventArray.length === 0) {
      return NextResponse.json({ message: 'No events found in feed' });
    }

    // 3. Upsert into Supabase (Deduplication)
    // We'll use a combination of title and start_time for deduplication if UID isn't available
    // For simplicity, we just clear and re-insert for the 'school' source
    const { error: deleteError } = await supabase
      .from('calendar_events')
      .delete()
      .eq('source', 'school');

    if (deleteError) throw deleteError;

    const { error: insertError } = await supabase
      .from('calendar_events')
      .insert(eventArray);

    if (insertError) throw insertError;

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
