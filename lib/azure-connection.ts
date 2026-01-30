/**
 * Azure Connection Helper
 * Provides a unified way to get Azure Blob Storage credentials
 * Checks database for user connections, falls back to environment variables
 */

import { createServiceRoleClient } from './supabase';
import { decryptAzureConnectionString } from './encryption';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';

interface AzureConnectionResult {
  connectionString: string;
  defaultContainer: string | null;
  source: 'database' | 'environment';
  connectionName?: string;
}

/**
 * Get the active Azure connection for a user
 * Priority: 1) Active database connection, 2) Environment variable
 */
export async function getAzureConnection(userId: string = 'default'): Promise<AzureConnectionResult | null> {
  // First, try to get from database
  try {
    const supabase = createServiceRoleClient();
    
    const { data: connection } = await supabase
      .from('azure_connections')
      .select('encrypted_connection_string, default_container, connection_name')
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('is_valid', true)
      .single();

    if (connection?.encrypted_connection_string) {
      const connectionString = decryptAzureConnectionString(connection.encrypted_connection_string);
      return {
        connectionString,
        defaultContainer: connection.default_container,
        source: 'database',
        connectionName: connection.connection_name
      };
    }
  } catch (error) {
    // Database lookup failed, fall back to env
    console.log('No database Azure connection found, checking environment...');
  }

  // Fall back to environment variable
  const envConnectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (envConnectionString) {
    return {
      connectionString: envConnectionString,
      defaultContainer: process.env.AZURE_CONTAINER_NAME || null,
      source: 'environment'
    };
  }

  return null;
}

/**
 * Get a BlobServiceClient for the active connection
 */
export async function getAzureBlobServiceClient(userId: string = 'default'): Promise<{
  client: BlobServiceClient;
  defaultContainer: string | null;
  source: 'database' | 'environment';
} | null> {
  const connection = await getAzureConnection(userId);
  
  if (!connection) {
    return null;
  }

  const client = BlobServiceClient.fromConnectionString(connection.connectionString);
  
  return {
    client,
    defaultContainer: connection.defaultContainer,
    source: connection.source
  };
}

/**
 * Get a ContainerClient for a specific container
 */
export async function getAzureContainerClient(
  containerName: string,
  userId: string = 'default'
): Promise<ContainerClient | null> {
  const result = await getAzureBlobServiceClient(userId);
  
  if (!result) {
    return null;
  }

  return result.client.getContainerClient(containerName);
}

/**
 * Check if Azure is configured (either in database or environment)
 */
export async function isAzureConfigured(userId: string = 'default'): Promise<{
  configured: boolean;
  source: 'database' | 'environment' | 'none';
  connectionName?: string;
}> {
  const connection = await getAzureConnection(userId);
  
  if (!connection) {
    return { configured: false, source: 'none' };
  }

  return {
    configured: true,
    source: connection.source,
    connectionName: connection.connectionName
  };
}

/**
 * List all containers accessible with the active connection
 */
export async function listAzureContainers(userId: string = 'default'): Promise<string[]> {
  const result = await getAzureBlobServiceClient(userId);
  
  if (!result) {
    throw new Error('No Azure connection configured');
  }

  const containers: string[] = [];
  for await (const container of result.client.listContainers()) {
    containers.push(container.name);
  }
  
  return containers;
}
