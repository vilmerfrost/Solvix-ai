/**
 * Processing Session API
 * Manages processing sessions for circuit breaker functionality
 */

import { NextRequest, NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import {
  getActiveSession,
  stopProcessing,
  getSession,
} from "@/lib/circuit-breaker";

// GET: Get active session or specific session by ID
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getApiUser();
    if (authError || !user) return authError!;

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("id");

    if (sessionId) {
      // Get specific session
      const session = await getSession(sessionId);
      
      if (!session || session.user_id !== user.id) {
        return NextResponse.json(
          { success: false, error: "Session not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        session,
      });
    } else {
      // Get active session
      const session = await getActiveSession(user.id);

      return NextResponse.json({
        success: true,
        session,
        hasActiveSession: !!session,
      });
    }
  } catch (error: any) {
    console.error("Error in GET /api/processing-session:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST: Stop processing (cancel session and rollback)
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getApiUser();
    if (authError || !user) return authError!;

    const body = await request.json();
    const { action, sessionId } = body;

    if (action === "stop") {
      if (!sessionId) {
        // Try to get active session
        const activeSession = await getActiveSession(user.id);
        if (!activeSession) {
          return NextResponse.json(
            { success: false, error: "No active session to stop" },
            { status: 400 }
          );
        }
        
        const result = await stopProcessing(activeSession.id);
        return NextResponse.json(result);
      }

      // Verify session belongs to user
      const session = await getSession(sessionId);
      if (!session || session.user_id !== user.id) {
        return NextResponse.json(
          { success: false, error: "Session not found" },
          { status: 404 }
        );
      }

      const result = await stopProcessing(sessionId);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error in POST /api/processing-session:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
