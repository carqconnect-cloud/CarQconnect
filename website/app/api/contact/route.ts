import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Honeypot check
    if (body.bot_field) {
      // Return 200 to trick bots
      return NextResponse.json({ success: true });
    }

    // Basic validation
    if (!body.fullName || !body.contact || !body.message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const contactStr = String(body.contact).trim();
    const isEmail = contactStr.includes('@');
    const email = isEmail ? contactStr : undefined;
    const phone = !isEmail ? contactStr : undefined;

    const payload = {
      name: String(body.fullName).trim(),
      fullName: String(body.fullName).trim(),
      contact: contactStr,
      email,
      phone,
      source: 'Website Contact',
      topic: body.topic || 'Website Contact',
      subject: body.subject ? String(body.subject).trim() : undefined,
      message: String(body.message).trim(),
      notes: `[Topic: ${body.topic || 'Website Contact'}] ${body.subject ? `Subject: ${body.subject} | ` : ''}${String(body.message).trim()}`,
    };

    // Candidate backend endpoints (local dev & remote production)
    const candidateUrls = [
      process.env.BACKEND_API_URL,
      process.env.NEXT_PUBLIC_API_URL,
      'http://localhost:4000',
      'https://fioner-h5r7.onrender.com',
    ].filter(Boolean) as string[];

    let forwarded = false;
    for (const baseUrl of candidateUrls) {
      const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      try {
        // Submit directly to CRM public leads endpoint
        let res = await fetch(`${cleanBase}/api/v1/crm/leads/public`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          cache: 'no-store',
        });

        if (!res.ok) {
          // Fallback to /api/v1/leads/public or /api/v1/leads
          res = await fetch(`${cleanBase}/api/v1/leads/public`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            cache: 'no-store',
          });
        }

        if (!res.ok) {
          // Fallback to /api/v1/support-tickets/raise (which now also creates a lead in the leads table)
          res = await fetch(`${cleanBase}/api/v1/support-tickets/raise`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: payload.name,
              email: payload.email,
              phone: payload.phone,
              category: 'Website Contact',
              subject: body.subject ? String(body.subject).trim() : `Website inquiry from ${payload.name}`,
              description: payload.notes,
              priority: 'MEDIUM',
            }),
            cache: 'no-store',
          });
        }

        if (res.ok) {
          forwarded = true;
          break;
        }
      } catch (err) {
        // Try next candidate URL
      }
    }

    if (!forwarded) {
      return NextResponse.json(
        { error: 'Unable to connect to CRM server. Please ensure backend is reachable.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, forwarded });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
