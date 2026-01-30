/**
 * API Key Encryption Utilities
 * Uses AES-256-GCM for secure encryption of user API keys
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

// Get encryption secret from environment
const getEncryptionSecret = (): string => {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET;
  if (!secret) {
    // In development, use a default key (NOT for production!)
    if (process.env.NODE_ENV === 'development') {
      return 'dev-secret-key-32-chars-minimum!!';
    }
    throw new Error('API_KEY_ENCRYPTION_SECRET environment variable is required');
  }
  return secret;
};

// Derive a 32-byte key from the secret using scrypt
const deriveKey = (secret: string): Buffer => {
  // Use a fixed salt for deterministic key derivation
  // In a more secure setup, you might store a unique salt per key
  const salt = 'document-pipeline-api-keys';
  return scryptSync(secret, salt, 32);
};

/**
 * Encrypt an API key for secure storage
 * @param plainKey - The plain text API key
 * @returns Base64 encoded string containing IV + encrypted data + auth tag
 */
export function encryptAPIKey(plainKey: string): string {
  const secret = getEncryptionSecret();
  const key = deriveKey(secret);
  
  // Generate a random 16-byte IV for each encryption
  const iv = randomBytes(16);
  
  // Create cipher with AES-256-GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  
  // Encrypt the API key
  const encrypted = Buffer.concat([
    cipher.update(plainKey, 'utf8'),
    cipher.final()
  ]);
  
  // Get the authentication tag
  const authTag = cipher.getAuthTag();
  
  // Combine IV + encrypted data + auth tag into a single buffer
  const combined = Buffer.concat([iv, encrypted, authTag]);
  
  // Return as base64 string
  return combined.toString('base64');
}

/**
 * Decrypt an API key from secure storage
 * @param encryptedKey - Base64 encoded encrypted key
 * @returns The plain text API key
 */
export function decryptAPIKey(encryptedKey: string): string {
  const secret = getEncryptionSecret();
  const key = deriveKey(secret);
  
  // Decode from base64
  const combined = Buffer.from(encryptedKey, 'base64');
  
  // Extract IV (first 16 bytes)
  const iv = combined.subarray(0, 16);
  
  // Extract auth tag (last 16 bytes)
  const authTag = combined.subarray(combined.length - 16);
  
  // Extract encrypted data (middle portion)
  const encrypted = combined.subarray(16, combined.length - 16);
  
  // Create decipher with AES-256-GCM
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  // Decrypt and return
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);
  
  return decrypted.toString('utf8');
}

/**
 * Generate a hint for display (last 4 characters)
 * @param apiKey - The plain text API key
 * @returns String like "...abc1"
 */
export function generateKeyHint(apiKey: string): string {
  if (apiKey.length < 4) {
    return '...****';
  }
  return '...' + apiKey.slice(-4);
}

/**
 * Validate that an API key looks correct for a given provider
 * @param apiKey - The API key to validate
 * @param provider - The provider (google, openai, anthropic)
 * @returns Object with isValid boolean and optional error message
 */
export function validateKeyFormat(
  apiKey: string, 
  provider: 'google' | 'openai' | 'anthropic'
): { isValid: boolean; error?: string } {
  if (!apiKey || apiKey.trim().length === 0) {
    return { isValid: false, error: 'API key is required' };
  }

  switch (provider) {
    case 'anthropic':
      // Anthropic keys start with "sk-ant-"
      if (!apiKey.startsWith('sk-ant-')) {
        return { isValid: false, error: 'Anthropic API keys should start with "sk-ant-"' };
      }
      break;
    
    case 'openai':
      // OpenAI keys start with "sk-" (but not "sk-ant-")
      if (!apiKey.startsWith('sk-') || apiKey.startsWith('sk-ant-')) {
        return { isValid: false, error: 'OpenAI API keys should start with "sk-"' };
      }
      break;
    
    case 'google':
      // Google API keys are typically 39 characters starting with "AIza"
      if (!apiKey.startsWith('AIza') && apiKey.length < 30) {
        return { isValid: false, error: 'Google API keys typically start with "AIza"' };
      }
      break;
  }

  return { isValid: true };
}
