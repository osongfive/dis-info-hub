import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as ical from 'node-ical';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  console.log('[CALENDAR_SYNC] Sync request received');
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[CALENDAR_SYNC] Missing environment variables');
      return NextResponse.json({ 
        error: 'Server configuration error: Missing Supabase credentials',
        success: false 
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch the school calendar .ics
    const CALENDAR_URL = 'https://www.dis.sc.kr/calendar/calendar_354_gmt.ics';
    console.log('[CALENDAR_SYNC] Fetching from:', CALENDAR_URL);
    
    let response;
    try {
      response = await fetch(CALENDAR_URL, {
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/calendar, text/plain, */*'
        },
        next: { revalidate: 0 }
      });
    } catch (fetchErr: any) {
      console.error('[CALENDAR_SYNC] Fetch error:', fetchErr);
      return NextResponse.json({ 
        error: `Network error: Failed to reach school website (${fetchErr.message})`,
        success: false 
      }, { status: 500 });
    }

    if (!response.ok) {
      console.error('[CALENDAR_SYNC] Bad response:', response.status, response.statusText);
      return NextResponse.json({ 
        error: `School website returned an error: ${response.status} ${response.statusText}`,
        success: false 
      }, { status: 500 });
    }

    const icsContent = await response.text();
    console.log('[CALENDAR_SYNC] Received content length:', icsContent.length);

    if (!icsContent || icsContent.length < 100) {
      return NextResponse.json({ 
        error: 'Received empty or invalid calendar data from school website',
        success: false 
      }, { status: 500 });
    }

    // 2. Parse the .ics content
    let events;
    try {
      events = ical.parseICS(icsContent);
    } catch (parseErr: any) {
      console.error('[CALENDAR_SYNC] Parse error:', parseErr);
      return NextResponse.json({ 
        error: `Failed to parse calendar data: ${parseErr.message}`,
        success: false 
      }, { status: 500 });
    }

    const eventArray = [];
    for (const key in events) {
      if (events.hasOwnProperty(key)) {
        const event = events[key] as any;
        if (event.type === 'VEVENT') {
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

    console.log('[CALENDAR_SYNC] Valid events found:', eventArray.length);

    if (eventArray.length === 0) {
      return NextResponse.json({ 
        error: 'No valid school events found in the calendar feed.',
        success: false 
      }, { status: 200 }); // Return 200 but success false
    }

    // 3. Clear and Insert
    const { error: deleteError } = await supabase
      .from('calendar_events')
      .delete()
      .eq('source', 'school');

    if (deleteError) {
      console.error('[CALENDAR_SYNC] Delete error:', deleteError);
      throw deleteError;
    }

    const { error: insertError } = await supabase
      .from('calendar_events')
      .insert(eventArray);

    if (insertError) {
      console.error('[CALENDAR_SYNC] Insert error:', insertError);
      throw insertError;
    }

    console.log('[CALENDAR_SYNC] Sync complete!');
    return NextResponse.json({ 
      success: true, 
      count: eventArray.length,
      message: 'School calendar synced successfully'
    });

  } catch (error: any) {
    console.error('[CALENDAR_SYNC_CRITICAL_ERROR]', error);
    return NextResponse.json({ 
      error: `Internal server error: ${error.message}`,
      stack: error.stack,
      success: false 
    }, { status: 500 });
  }
}
