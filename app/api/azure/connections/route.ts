/**
 * API Route: Azure Connections Management
 * Handles CRUD operations for Azure Blob Storage connections
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { getApiUser } from '@/lib/api-auth';
import { 
  encryptAzureConnectionString, 
  decryptAzureConnectionString,
  generateAzureConnectionHint,
  validateAzureConnectionString 
} from '@/lib/encryption';
import { BlobServiceClient } from '@azure/storage-blob';

// GET: List all connections for user
export async function GET() {
  try {
    const { user, error: authError } = await getApiUser();
    if (authError || !user) return authError!;
    const userId = user.id;
    
    const supabase = createServiceRoleClient();

    const { data: connections, error } = await supabase
      .from('azure_connections')
      .select('id, connection_name, connection_hint, default_container, is_active, is_valid, last_tested_at, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching Azure connections:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch connections' }, { status: 500 });
    }

    // Check if there's an env variable fallback
    const hasEnvConnection = !!process.env.AZURE_STORAGE_CONNECTION_STRING;

    return NextResponse.json({
      success: true,
      connections: connections || [],
      hasEnvConnection,
      envContainerName: process.env.AZURE_CONTAINER_NAME || null
    });
  } catch (error) {
    console.error('Error in GET /api/azure/connections:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Add a new connection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { connectionString, connectionName, defaultContainer } = body;

    if (!connectionString) {
      return NextResponse.json({ success: false, error: 'Connection string is required' }, { status: 400 });
    }

    // Validate connection string format
    const validation = validateAzureConnectionString(connectionString);
    if (!validation.isValid) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    // Test the connection
    let isValid = false;
    let testError: string | null = null;
    try {
      const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      // Try to list containers (minimal operation to verify connection)
      const iterator = blobServiceClient.listContainers();
      await iterator.next();
      isValid = true;
    } catch (err: any) {
      testError = err.message || 'Connection test failed';
    }

    if (!isValid) {
      return NextResponse.json({ 
        success: false, 
        error: `Connection test failed: ${testError}` 
      }, { status: 400 });
    }

    // Encrypt and store
    const { user, error: authError } = await getApiUser();
    if (authError || !user) return authError!;
    const userId = user.id;
    
    const supabase = createServiceRoleClient();

    const encryptedString = encryptAzureConnectionString(connectionString);
    const hint = generateAzureConnectionHint(connectionString);

    // Deactivate other connections if this one should be active
    if (body.isActive !== false) {
      await supabase
        .from('azure_connections')
        .update({ is_active: false })
        .eq('user_id', userId);
    }

    const { data, error } = await supabase
      .from('azure_connections')
      .upsert({
        user_id: userId,
        connection_name: connectionName || 'Default',
        encrypted_connection_string: encryptedString,
        connection_hint: hint,
        default_container: defaultContainer || null,
        is_active: body.isActive !== false,
        is_valid: true,
        last_tested_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,connection_name'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving Azure connection:', error);
      return NextResponse.json({ success: false, error: 'Failed to save connection' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      connection: {
        id: data.id,
        connection_name: data.connection_name,
        connection_hint: data.connection_hint,
        default_container: data.default_container,
        is_active: data.is_active,
        is_valid: data.is_valid,
        last_tested_at: data.last_tested_at
      }
    });
  } catch (error) {
    console.error('Error in POST /api/azure/connections:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Remove a connection
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('id');

    if (!connectionId) {
      return NextResponse.json({ success: false, error: 'Connection ID is required' }, { status: 400 });
    }

    const { user, error: authError } = await getApiUser();
    if (authError || !user) return authError!;
    const userId = user.id;
    
    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from('azure_connections')
      .delete()
      .eq('id', connectionId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting Azure connection:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete connection' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/azure/connections:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Update connection (set active, update container, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { connectionId, isActive, defaultContainer, connectionName } = body;

    if (!connectionId) {
      return NextResponse.json({ success: false, error: 'Connection ID is required' }, { status: 400 });
    }

    const { user, error: authError } = await getApiUser();
    if (authError || !user) return authError!;
    const userId = user.id;
    
    const supabase = createServiceRoleClient();

    // If setting this connection as active, deactivate others
    if (isActive === true) {
      await supabase
        .from('azure_connections')
        .update({ is_active: false })
        .eq('user_id', userId);
    }

    const updates: any = { updated_at: new Date().toISOString() };
    if (isActive !== undefined) updates.is_active = isActive;
    if (defaultContainer !== undefined) updates.default_container = defaultContainer;
    if (connectionName !== undefined) updates.connection_name = connectionName;

    const { data, error } = await supabase
      .from('azure_connections')
      .update(updates)
      .eq('id', connectionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating Azure connection:', error);
      return NextResponse.json({ success: false, error: 'Failed to update connection' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      connection: {
        id: data.id,
        connection_name: data.connection_name,
        connection_hint: data.connection_hint,
        default_container: data.default_container,
        is_active: data.is_active,
        is_valid: data.is_valid
      }
    });
  } catch (error) {
    console.error('Error in PATCH /api/azure/connections:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
