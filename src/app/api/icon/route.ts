
import { NextResponse } from 'next/server';
import { permanentRedirect } from 'next/navigation';

// This function now permanently redirects to the static logo file.
export async function GET(request: Request) {
  permanentRedirect('/logo512.png');
}
