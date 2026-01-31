import { NextResponse } from 'next/server';

// In-memory flag for automation status
// In production, this would be stored in a database or environment variable
let automationEnabled = false;

export async function GET() {
  return NextResponse.json({ enabled: automationEnabled });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    if (typeof body.enabled === 'boolean') {
      automationEnabled = body.enabled;
      return NextResponse.json({ 
        success: true, 
        enabled: automationEnabled,
        message: automationEnabled ? 'Automation started!' : 'Automation stopped.'
      });
    }
    
    // Toggle if no specific value provided
    automationEnabled = !automationEnabled;
    return NextResponse.json({ 
      success: true, 
      enabled: automationEnabled,
      message: automationEnabled ? 'Automation started!' : 'Automation stopped.'
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update automation status' }, { status: 500 });
  }
}
