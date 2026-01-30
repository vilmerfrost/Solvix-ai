/**
 * API Route: Test Azure Connection
 * Tests an existing connection by listing containers
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { getApiUser } from '@/lib/api-auth';
import { decryptAzureConnectionString } from '@/lib/encryption';
import { BlobServiceClient } from '@azure/storage-blob';

export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getApiUser();
    if (authError || !user) return authError!;
    
    const body = await request.json();
    const { connectionId } = body;

    if (!connectionId) {
      return NextResponse.json({ success: false, error: 'Connection ID is required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const userId = user.id;

    // Get the connection
    const { data: connection, error: fetchError } = await supabase
      .from('azure_connections')
      .select('encrypted_connection_string, default_container')
      .eq('id', connectionId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !connection) {
      return NextResponse.json({ success: false, error: 'Connection not found' }, { status: 404 });
    }

    // Decrypt and test
    let connectionString: string;
    try {
      connectionString = decryptAzureConnectionString(connection.encrypted_connection_string);
    } catch (err) {
      // Update connection as invalid
      await supabase
        .from('azure_connections')
        .update({ is_valid: false })
        .eq('id', connectionId);
      return NextResponse.json({ success: false, error: 'Failed to decrypt connection string' }, { status: 500 });
    }

    // Test the connection
    let containers: string[] = [];
    try {
      const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      
      // List all containers
      for await (const container of blobServiceClient.listContainers()) {
        containers.push(container.name);
      }
    } catch (err: any) {
      // Update connection as invalid
      await supabase
        .from('azure_connections')
        .update({ is_valid: false, last_tested_at: new Date().toISOString() })
        .eq('id', connectionId);

      return NextResponse.json({ 
        success: false, 
        error: `Connection test failed: ${err.message}`,
        isValid: false
      }, { status: 400 });
    }

    // Update connection as valid
    await supabase
      .from('azure_connections')
      .update({ is_valid: true, last_tested_at: new Date().toISOString() })
      .eq('id', connectionId);

    return NextResponse.json({
      success: true,
      isValid: true,
      containers,
      defaultContainer: connection.default_container
    });
  } catch (error) {
    console.error('Error in POST /api/azure/connections/test:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
