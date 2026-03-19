import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import ICAL from 'ical.js';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  console.log('[CALENDAR_SYNC] Sync process started (using ical.js)');
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ 
        error: 'Missing Supabase credentials',
        success: false 
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch the school calendar .ics
    const CALENDAR_URL = 'https://www.dis.sc.kr/calendar/calendar_354.ics';
    console.log('[CALENDAR_SYNC] Fetching from verified URL:', CALENDAR_URL);
    
    const response = await fetch(CALENDAR_URL, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/calendar, text/plain, */*'
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      return NextResponse.json({ 
        error: `School website returned an error: ${response.status} ${response.statusText}`,
        success: false 
      }, { status: 500 });
    }

    const icsContent = await response.text();
    console.log('[CALENDAR_SYNC] Received content length:', icsContent.length);

    // 2. Parse using ical.js
    let eventArray = [];
    try {
      const jcalData = ICAL.parse(icsContent);
      const vcalendar = new ICAL.Component(jcalData);
      const vevents = vcalendar.getAllSubcomponents('vevent');
      
      console.log('[CALENDAR_SYNC] Parsed total VEVENTS:', vevents.length);

      eventArray = vevents.map((vevent: any) => {
        const event = new ICAL.Event(vevent);
        return {
          title: event.summary,
          start_time: event.startDate.toJSDate().toISOString(),
          end_time: event.endDate.toJSDate().toISOString(),
          location: event.location || null,
          description: event.description || null,
          source: 'school',
          last_synced: new Date().toISOString()
        };
      }).filter((e: any) => e.title && e.start_time);

    } catch (parseErr: any) {
      console.error('[CALENDAR_SYNC_PARSE_ERROR]', parseErr);
      return NextResponse.json({ 
        error: `Parsing failed: ${parseErr.message}. The calendar format might have changed.`,
        success: false 
      }, { status: 500 });
    }

    if (eventArray.length === 0) {
      return NextResponse.json({ 
        error: 'No valid events found in the school feed.',
        success: false 
      });
    }

    // 3. Clear and Refresh
    console.log('[CALENDAR_SYNC] Refreshing database events...');
    const { error: deleteError } = await supabase
      .from('calendar_events')
      .delete()
      .eq('source', 'school');

    if (deleteError) throw deleteError;

    const { error: insertError } = await supabase
      .from('calendar_events')
      .insert(eventArray);

    if (insertError) throw insertError;

    console.log('[CALENDAR_SYNC] Successfully indexed', eventArray.length, 'events');
    return NextResponse.json({ 
      success: true, 
      count: eventArray.length,
      message: 'School calendar synced successfully'
    });

  } catch (error: any) {
    console.error('[CALENDAR_SYNC_CRITICAL_ERROR]', error);
    return NextResponse.json({ 
      error: `Internal server error: ${error.message}`,
      success: false 
    }, { status: 500 });
  }
}
