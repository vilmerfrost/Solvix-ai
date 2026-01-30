/**
 * Circuit Breaker for Processing Sessions
 * Allows users to stop extraction and rollback documents
 */

import { createServiceRoleClient } from "./supabase";

export interface ProcessingSession {
  id: string;
  user_id: string;
  status: "active" | "completed" | "cancelled";
  document_ids: string[];
  total_documents: number;
  processed_documents: number;
  failed_documents: number;
  model_id?: string;
  custom_instructions?: string;
  started_at: string;
  completed_at?: string;
  cancelled_at?: string;
}

/**
 * Create a new processing session
 */
export async function createProcessingSession(
  userId: string,
  documentIds: string[],
  modelId?: string,
  customInstructions?: string
): Promise<ProcessingSession> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("processing_sessions")
    .insert({
      user_id: userId,
      status: "active",
      document_ids: documentIds,
      total_documents: documentIds.length,
      processed_documents: 0,
      failed_documents: 0,
      model_id: modelId,
      custom_instructions: customInstructions,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create processing session:", error);
    throw new Error("Failed to create processing session");
  }

  return data;
}

/**
 * Get active session for user
 */
export async function getActiveSession(userId: string): Promise<ProcessingSession | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("processing_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Check if a session has been cancelled
 */
export async function isSessionCancelled(sessionId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();

  const { data } = await supabase
    .from("processing_sessions")
    .select("status")
    .eq("id", sessionId)
    .single();

  return data?.status === "cancelled";
}

/**
 * Update session progress
 */
export async function updateSessionProgress(
  sessionId: string,
  processedDocuments: number,
  failedDocuments: number = 0
): Promise<void> {
  const supabase = createServiceRoleClient();

  await supabase
    .from("processing_sessions")
    .update({
      processed_documents: processedDocuments,
      failed_documents: failedDocuments,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
}

/**
 * Complete a session
 */
export async function completeSession(sessionId: string): Promise<void> {
  const supabase = createServiceRoleClient();

  await supabase
    .from("processing_sessions")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
}

/**
 * Cancel a processing session and rollback documents
 */
export async function stopProcessing(sessionId: string): Promise<{
  success: boolean;
  revertedCount: number;
  message: string;
}> {
  const supabase = createServiceRoleClient();

  // Get session details
  const { data: session, error: sessionError } = await supabase
    .from("processing_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return {
      success: false,
      revertedCount: 0,
      message: "Session not found",
    };
  }

  if (session.status !== "active") {
    return {
      success: false,
      revertedCount: 0,
      message: `Session is already ${session.status}`,
    };
  }

  // Mark session as cancelled
  await supabase
    .from("processing_sessions")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  // Revert all documents in "processing" status back to "uploaded"
  const { data: revertedDocs, error: revertError } = await supabase
    .from("documents")
    .update({
      status: "uploaded",
      updated_at: new Date().toISOString(),
    })
    .in("id", session.document_ids)
    .eq("status", "processing")
    .select("id");

  if (revertError) {
    console.error("Error reverting documents:", revertError);
  }

  const revertedCount = revertedDocs?.length || 0;

  return {
    success: true,
    revertedCount,
    message: `Extraktionen avbröts. ${revertedCount} dokument återställdes.`,
  };
}

/**
 * Get session by ID
 */
export async function getSession(sessionId: string): Promise<ProcessingSession | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("processing_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}
