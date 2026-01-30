"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Cloud, 
  Shield, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Database,
  Settings
} from "lucide-react";

interface AzureConnection {
  id: string;
  connection_name: string;
  connection_hint: string;
  default_container: string | null;
  is_active: boolean;
  is_valid: boolean;
  last_tested_at: string | null;
}

export default function AzureConnectionsPage() {
  const [connections, setConnections] = useState<AzureConnection[]>([]);
  const [hasEnvConnection, setHasEnvConnection] = useState(false);
  const [envContainerName, setEnvContainerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Form state for adding new connection
  const [showAddForm, setShowAddForm] = useState(false);
  const [newConnectionString, setNewConnectionString] = useState("");
  const [newConnectionName, setNewConnectionName] = useState("");
  const [newDefaultContainer, setNewDefaultContainer] = useState("");

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      const response = await fetch("/api/azure/connections");
      const data = await response.json();
      
      if (data.success) {
        setConnections(data.connections || []);
        setHasEnvConnection(data.hasEnvConnection);
        setEnvContainerName(data.envContainerName);
      }
    } catch (error) {
      console.error("Failed to fetch connections:", error);
    } finally {
      setLoading(false);
    }
  };

  const addConnection = async () => {
    if (!newConnectionString.trim()) {
      setMessage({ type: 'error', text: 'Connection string is required' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/azure/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionString: newConnectionString,
          connectionName: newConnectionName || "Default",
          defaultContainer: newDefaultContainer || null,
          isActive: true
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Azure connection added successfully!' });
        setNewConnectionString("");
        setNewConnectionName("");
        setNewDefaultContainer("");
        setShowAddForm(false);
        fetchConnections();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to add connection' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to add connection' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const deleteConnection = async (connectionId: string) => {
    if (!confirm('Are you sure you want to delete this connection?')) return;

    try {
      const response = await fetch(`/api/azure/connections?id=${connectionId}`, {
        method: "DELETE"
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Connection deleted' });
        fetchConnections();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete connection' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete connection' });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const testConnection = async (connectionId: string) => {
    setTesting(connectionId);
    try {
      const response = await fetch("/api/azure/connections/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: `Connection valid! Found ${data.containers.length} container(s)` });
        fetchConnections();
      } else {
        setMessage({ type: 'error', text: data.error || 'Connection test failed' });
        fetchConnections();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to test connection' });
    } finally {
      setTesting(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const setActiveConnection = async (connectionId: string) => {
    try {
      const response = await fetch("/api/azure/connections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, isActive: true })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Connection activated' });
        fetchConnections();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to activate connection' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to activate connection' });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Laddar...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <Link
            href="/settings"
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Tillbaka till Inställningar</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Cloud className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Azure Storage</h1>
              <p className="text-gray-600">Hantera dina Azure Blob Storage-anslutningar</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Message */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
          message.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {message.text}
        </div>
      )}

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Security Notice */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium text-green-900">Dina anslutningar är säkra</p>
              <p className="text-sm text-green-700">
                Connection strings krypteras med AES-256 innan de sparas. De exponeras aldrig till klienten.
              </p>
            </div>
          </div>
        </div>

        {/* Environment Fallback Info */}
        {hasEnvConnection && connections.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Settings className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Miljövariabel aktiv</p>
                <p className="text-sm text-blue-700">
                  Azure är konfigurerat via miljövariabler. 
                  {envContainerName && <span className="font-mono"> Container: {envContainerName}</span>}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Lägg till en anslutning nedan för att använda databas-baserad konfiguration istället.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Connections List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Dina anslutningar</h2>
          </div>

          {connections.length === 0 ? (
            <div className="p-8 text-center">
              <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Inga anslutningar tillagda</p>
              <p className="text-sm text-gray-400 mt-1">
                {hasEnvConnection 
                  ? "Använder miljövariabel som fallback"
                  : "Lägg till en Azure-anslutning för att komma igång"
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {connections.map((conn) => (
                <div key={conn.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{conn.connection_name}</span>
                        {conn.is_active && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            AKTIV
                          </span>
                        )}
                        {conn.is_valid ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 font-mono mt-1">{conn.connection_hint}</p>
                      {conn.default_container && (
                        <p className="text-xs text-gray-400 mt-1">
                          Default container: <span className="font-mono">{conn.default_container}</span>
                        </p>
                      )}
                      {conn.last_tested_at && (
                        <p className="text-xs text-gray-400 mt-1">
                          Senast testad: {new Date(conn.last_tested_at).toLocaleString('sv-SE')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!conn.is_active && (
                        <button
                          onClick={() => setActiveConnection(conn.id)}
                          className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          Aktivera
                        </button>
                      )}
                      <button
                        onClick={() => testConnection(conn.id)}
                        disabled={testing === conn.id}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Testa anslutning"
                      >
                        <RefreshCw className={`w-4 h-4 ${testing === conn.id ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={() => deleteConnection(conn.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Ta bort"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Connection Button/Form */}
          {!showAddForm ? (
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors w-full justify-center"
              >
                <Plus className="w-4 h-4" />
                Lägg till Azure-anslutning
              </button>
            </div>
          ) : (
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <h3 className="font-medium text-gray-900 mb-4">Lägg till ny anslutning</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Connection String *
                  </label>
                  <textarea
                    value={newConnectionString}
                    onChange={(e) => setNewConnectionString(e.target.value)}
                    placeholder="DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Hitta din connection string i Azure Portal → Storage Account → Access keys
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Namn (valfritt)
                    </label>
                    <input
                      type="text"
                      value={newConnectionName}
                      onChange={(e) => setNewConnectionName(e.target.value)}
                      placeholder="Min Azure Storage"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Default Container (valfritt)
                    </label>
                    <input
                      type="text"
                      value={newDefaultContainer}
                      onChange={(e) => setNewDefaultContainer(e.target.value)}
                      placeholder="documents"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={addConnection}
                    disabled={saving || !newConnectionString.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Testar...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Lägg till & Testa
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewConnectionString("");
                      setNewConnectionName("");
                      setNewDefaultContainer("");
                    }}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                  >
                    Avbryt
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Hjälp</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <strong>Hitta din Connection String:</strong> Gå till{" "}
              <a 
                href="https://portal.azure.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                Azure Portal <ExternalLink className="w-3 h-3" />
              </a>
              {" "}→ Storage Account → Access keys → Connection string
            </p>
            <p>
              <strong>Säkerhet:</strong> Varje anslutning testas automatiskt när den läggs till. 
              Ogiltiga anslutningar sparas inte.
            </p>
            <p>
              <strong>Fallback:</strong> Om ingen databas-anslutning är konfigurerad används 
              miljövariabeln <code className="px-1 py-0.5 bg-gray-100 rounded">AZURE_STORAGE_CONNECTION_STRING</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
