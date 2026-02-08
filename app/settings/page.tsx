"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { useFeatures } from "@/lib/hooks/use-features";
import { 
  ArrowLeft, 
  Package, 
  Zap, 
  FileText, 
  Cloud,
  Plus,
  X,
  Save,
  AlertCircle,
  RefreshCw,
  FolderOpen,
  FolderInput,
  FolderOutput,
  Check,
  ChevronDown,
  ChevronRight,
  Key,
  Bot,
  ExternalLink,
  CreditCard,
  Shield,
  LogOut,
  Mail
} from "lucide-react";

interface AzureInputFolder {
  container: string;
  folder: string;
  enabled: boolean;
}

interface Settings {
  auto_approve_threshold: number;
  enterprise_auto_approve: boolean;
  material_synonyms: Record<string, string[]>;
  enable_verification: boolean;
  verification_confidence_threshold: number;
  azure_input_folders: AzureInputFolder[];
  azure_output_folder: string;
}

interface FolderInfo {
  name: string;
  path: string;
  fullPath: string; // container/folder for easy selection
  fileCount: number;
  subfolders: FolderInfo[];
  isVirtualDirectory: boolean;
}

interface ContainerInfo {
  name: string;
  folders: FolderInfo[];
  rootFileCount: number;
}

// Recursive component for rendering nested folders
function FolderTree({ 
  folders, 
  containerName, 
  onSelect, 
  expandedFolders, 
  toggleFolder, 
  level,
  mode = 'input'
}: { 
  folders: FolderInfo[]; 
  containerName: string;
  onSelect: (container: string, folder: string) => void;
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
  level: number;
  mode?: 'input' | 'output';
}) {
  const bgHoverClass = mode === 'input' ? 'hover:bg-blue-100' : 'hover:bg-green-100';
  
  return (
    <div className="mt-1 space-y-1" style={{ marginLeft: `${level * 16}px` }}>
      {folders.map(folder => {
        const hasSubfolders = folder.subfolders && folder.subfolders.length > 0;
        const folderKey = `${containerName}/${folder.path}`;
        
        return (
          <div key={folder.path}>
            <div className="flex items-center gap-1">
              {hasSubfolders && (
                <button
                  onClick={() => toggleFolder(folderKey)}
                  className="p-1 hover:bg-gray-200 rounded"
                >
                  {expandedFolders.has(folderKey) 
                    ? <ChevronDown className="w-3 h-3 text-gray-500" />
                    : <ChevronRight className="w-3 h-3 text-gray-500" />
                  }
                </button>
              )}
              {!hasSubfolders && <div className="w-5" />}
              <button
                onClick={() => onSelect(containerName, folder.path)}
                className={`flex-1 flex items-center gap-2 p-2 ${bgHoverClass} rounded-lg text-left transition-colors`}
              >
                <FolderOpen className="w-4 h-4 text-blue-500" />
                <span className="text-gray-700">{folder.name}</span>
                <span className="text-xs text-gray-400">
                  ({folder.fileCount} filer{hasSubfolders && `, ${folder.subfolders.length} mappar`})
                </span>
              </button>
            </div>
            
            {/* Render subfolders recursively */}
            {hasSubfolders && expandedFolders.has(folderKey) && (
              <FolderTree
                folders={folder.subfolders}
                containerName={containerName}
                onSelect={onSelect}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
                level={level + 1}
                mode={mode}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

import { ApiKeysForm } from "@/components/settings/api-keys-form";
import { ModelPreferences } from "@/components/settings/model-preferences";

export default function SettingsPage() {
  const router = useRouter();
  const { features } = useFeatures();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      setMessage({ type: 'error', text: 'Kunde inte logga ut' });
      setLoggingOut(false);
    }
  };
  
  // Local state for editing
  const [threshold, setThreshold] = useState(80);
  const [synonyms, setSynonyms] = useState<Record<string, string[]>>({});
  const [newSynonym, setNewSynonym] = useState<Record<string, string>>({});
  const [newCategory, setNewCategory] = useState("");
  
  // Verification settings
  const [enableVerification, setEnableVerification] = useState(false);
  const [verificationThreshold, setVerificationThreshold] = useState(85);

  // Azure folder settings
  const [azureContainers, setAzureContainers] = useState<ContainerInfo[]>([]);
  const [loadingContainers, setLoadingContainers] = useState(false);
  const [inputFolders, setInputFolders] = useState<AzureInputFolder[]>([]);
  const [outputFolder, setOutputFolder] = useState("completed");
  const [expandedContainers, setExpandedContainers] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showFolderPicker, setShowFolderPicker] = useState<'input' | 'output' | null>(null);
  const [manualInputPath, setManualInputPath] = useState("");
  const [manualOutputPath, setManualOutputPath] = useState("");

  // Active sidebar item
  const [activeSection, setActiveSection] = useState("material");
  
  // User ID for inbox
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch settings on mount + get user ID
  useEffect(() => {
    fetchSettings();
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.settings);
        setThreshold(data.settings.auto_approve_threshold);
        setSynonyms(data.settings.material_synonyms);
        setEnableVerification(data.settings.enable_verification ?? false);
        setVerificationThreshold((data.settings.verification_confidence_threshold ?? 0.85) * 100);
        setInputFolders(data.settings.azure_input_folders ?? []);
        setOutputFolder(data.settings.azure_output_folder ?? "completed");
        // Set Azure container from env
        setDefaultAzureContainer(data.azureContainerName || null);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const [defaultAzureContainer, setDefaultAzureContainer] = useState<string | null>(null);
  
  const fetchAzureContainers = useCallback(async () => {
    setLoadingContainers(true);
    try {
      const response = await fetch("/api/azure/browse");
      const data = await response.json();
      
      if (data.success) {
        setAzureContainers(data.containers);
        setDefaultAzureContainer(data.defaultContainer || null);
        if (data.defaultContainer) {
          setMessage({ type: 'success', text: `Mappar hämtade från ${data.defaultContainer} (${data.scanDuration}ms)` });
        } else {
          setMessage({ type: 'success', text: `Mappar hämtade från alla containers (${data.scanDuration}ms)` });
        }
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || "Kunde inte hämta Azure-mappar" });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error("Failed to fetch Azure containers:", error);
      setMessage({ type: 'error', text: "Kunde inte ansluta till Azure" });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoadingContainers(false);
    }
  }, []);

  const toggleContainer = (containerName: string) => {
    setExpandedContainers(prev => {
      const next = new Set(prev);
      if (next.has(containerName)) {
        next.delete(containerName);
      } else {
        next.add(containerName);
      }
      return next;
    });
  };

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  // Parse a full path like "arrivalwastedata/output/unable_to_process" into container and folder
  const parseFullPath = (fullPath: string): { container: string; folder: string } => {
    const parts = fullPath.split('/').filter(p => p.trim());
    if (parts.length === 0) {
      return { container: '', folder: '' };
    }
    const container = parts[0];
    const folder = parts.slice(1).join('/');
    return { container, folder };
  };

  const addManualInputFolder = () => {
    const trimmed = manualInputPath.trim();
    if (!trimmed) return;
    
    const { container, folder } = parseFullPath(trimmed);
    if (!container) {
      setMessage({ type: 'error', text: 'Ogiltig sökväg. Ange minst en container.' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    
    // Check if already exists
    const exists = inputFolders.some(f => f.container === container && f.folder === folder);
    if (!exists) {
      setInputFolders([...inputFolders, { container, folder, enabled: true }]);
      setManualInputPath("");
      setMessage({ type: 'success', text: `Mapp tillagd: ${container}${folder ? '/' + folder : ''}` });
      setTimeout(() => setMessage(null), 2000);
    } else {
      setMessage({ type: 'error', text: 'Denna mapp finns redan i listan.' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const setManualOutputFolderPath = () => {
    const trimmed = manualOutputPath.trim();
    if (!trimmed) return;
    
    setOutputFolder(trimmed);
    setManualOutputPath("");
    setShowFolderPicker(null);
    setMessage({ type: 'success', text: `Målmapp ändrad till: ${trimmed}` });
    setTimeout(() => setMessage(null), 2000);
  };

  const addInputFolder = (container: string, folder: string = "") => {
    const newFolder: AzureInputFolder = { container, folder, enabled: true };
    // Check if already exists
    const exists = inputFolders.some(f => f.container === container && f.folder === folder);
    if (!exists) {
      setInputFolders([...inputFolders, newFolder]);
    }
    setShowFolderPicker(null);
  };

  const removeInputFolder = (index: number) => {
    setInputFolders(inputFolders.filter((_, i) => i !== index));
  };

  const toggleInputFolder = (index: number) => {
    setInputFolders(inputFolders.map((f, i) => 
      i === index ? { ...f, enabled: !f.enabled } : f
    ));
  };

  const selectOutputFolder = (container: string, folder: string = "") => {
    const path = folder ? `${container}/${folder}` : container;
    setOutputFolder(path);
    setShowFolderPicker(null);
  };

  const saveAzureFolderSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          azure_input_folders: inputFolders,
          azure_output_folder: outputFolder
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: "Azure-mappinställningar sparade!" });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: "Kunde inte spara inställningar" });
    } finally {
      setSaving(false);
    }
  };

  const saveThreshold = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/settings/threshold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threshold })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: "Kunde inte spara inställningar" });
    } finally {
      setSaving(false);
    }
  };

  const saveVerificationSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enable_verification: enableVerification,
          verification_confidence_threshold: verificationThreshold / 100
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: "Verifieringsinställningar sparade!" });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: "Kunde inte spara inställningar" });
    } finally {
      setSaving(false);
    }
  };

  const addSynonym = async (category: string) => {
    console.log("🔵 addSynonym called");
    console.log("  Category:", category);
    console.log("  newSynonym state:", newSynonym);
    console.log("  Value for this category:", newSynonym[category]);
    
    // Check if synonym exists and is not empty
    if (!newSynonym[category]) {
      console.log("❌ No synonym entered for category:", category);
      setMessage({ type: 'error', text: 'Skriv in en synonym först!' });
      setTimeout(() => setMessage(null), 2000);
      return;
    }
    
    if (!newSynonym[category].trim()) {
      console.log("❌ Empty synonym (only whitespace)");
      setMessage({ type: 'error', text: 'Synonymen kan inte vara tom!' });
      setTimeout(() => setMessage(null), 2000);
      return;
    }

    console.log("🟢 Validation passed, sending to API...");
    console.log("  Payload:", {
      action: "add",
      category,
      synonym: newSynonym[category].trim()
    });

    try {
      const response = await fetch("/api/settings/synonyms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          category,
          synonym: newSynonym[category].trim()
        })
      });

      console.log("📡 Response status:", response.status);
      
      const data = await response.json();
      console.log("📦 Response data:", data);
      
      if (data.success) {
        console.log("✅ Synonym added successfully!");
        setSynonyms(data.material_synonyms);
        setNewSynonym({ ...newSynonym, [category]: "" });
        setMessage({ type: 'success', text: "Synonym tillagd!" });
        setTimeout(() => setMessage(null), 2000);
      } else {
        console.log("❌ API returned success: false");
        setMessage({ type: 'error', text: data.error || "Kunde inte lägga till synonym" });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error("💥 Error adding synonym:", error);
      setMessage({ type: 'error', text: "Något gick fel!" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const removeSynonym = async (category: string, synonym: string) => {
    try {
      const response = await fetch("/api/settings/synonyms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remove",
          category,
          synonym
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setSynonyms(data.material_synonyms);
        setMessage({ type: 'success', text: "Synonym borttagen!" });
        setTimeout(() => setMessage(null), 2000);
      }
    } catch (error) {
      console.error("Failed to remove synonym:", error);
    }
  };

  const addCategory = async () => {
    console.log("🔵 addCategory called");
    console.log("  New category:", newCategory);
    
    if (!newCategory.trim()) {
      console.log("❌ Empty category name");
      setMessage({ type: 'error', text: 'Skriv in ett kategorinamn först!' });
      setTimeout(() => setMessage(null), 2000);
      return;
    }

    console.log("🟢 Adding new category:", newCategory.trim());

    try {
      // First, add the category to local state
      const updatedSynonyms = {
        ...synonyms,
        [newCategory.trim()]: []
      };
      
      // Then save to database
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          material_synonyms: updatedSynonyms
        })
      });

      console.log("📡 Response status:", response.status);
      
      const data = await response.json();
      console.log("📦 Response data:", data);
      
      if (data.success) {
        console.log("✅ Category added successfully!");
        setSynonyms(data.settings.material_synonyms);
        setNewCategory("");
        setMessage({ type: 'success', text: "Kategori tillagd!" });
        setTimeout(() => setMessage(null), 2000);
      } else {
        console.log("❌ API returned error:", data.error);
        setMessage({ type: 'error', text: data.error || "Kunde inte lägga till kategori" });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error("💥 Error adding category:", error);
      setMessage({ type: 'error', text: "Något gick fel!" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleEnableInbox = async () => {
    if (!userId) return;
    const code = Math.random().toString(36).substring(2, 10);
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { error } = await supabase
      .from("settings")
      .update({ inbox_enabled: true, inbox_code: code, inbox_auto_process: true })
      .eq("user_id", userId);
    if (!error) {
      window.location.reload();
    } else {
      setMessage({ type: 'error', text: 'Kunde inte aktivera e-postinkorg' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Laddar inställningar...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Tillbaka</span>
            </Link>
            
            <button
              onClick={() => window.location.href = "/dashboard"}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Save className="w-4 h-4 inline mr-2" />
              Spara ändringar
            </button>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-green-600 uppercase tracking-wider">
              SYSTEM ONLINE
            </span>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Inställningar
          </p>
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <nav className="space-y-2">
                {features.material_synonyms && (
                  <button
                    onClick={() => setActiveSection("material")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                      activeSection === "material"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Package className="w-5 h-5" />
                    <span className="font-medium">Material & Synonymer</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveSection("ai")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                    activeSection === "ai"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Zap className="w-5 h-5" />
                  <span className="font-medium">AI & Automation</span>
                </button>

                <button
                  onClick={() => setActiveSection("export")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                    activeSection === "export"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  <span className="font-medium">Export & Rapporter</span>
                </button>

                {features.azure_integration && (
                  <button
                    onClick={() => setActiveSection("azure")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                      activeSection === "azure"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Cloud className="w-5 h-5" />
                    <span className="font-medium">Azure & GUIDs</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveSection("email")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                    activeSection === "email"
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Mail className="w-5 h-5" />
                  <span className="font-medium">E-postinkorg</span>
                </button>

                {/* Divider */}
                <div className="border-t border-gray-200 my-3" />

                {/* Billing Link */}
                <Link
                  href="/settings/billing"
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left text-gray-700 hover:bg-gray-50"
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="font-medium">Prenumeration & Fakturering</span>
                </Link>

                {/* Data & Privacy Link */}
                <Link
                  href="/settings/data"
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left text-gray-700 hover:bg-gray-50"
                >
                  <Shield className="w-5 h-5" />
                  <span className="font-medium">Data & Integritet</span>
                </Link>

                {/* Divider */}
                <div className="border-t border-gray-200 my-3" />

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-medium">
                    {loggingOut ? "Loggar ut..." : "Logga ut"}
                  </span>
                </button>
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            {/* Material & Synonymer Section */}
            {activeSection === "material" && features.material_synonyms && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Materialbibliotek
                </h2>
                <p className="text-sm text-gray-600 mb-6">
                  Lär AI:n dina benämningar. Om fakturan säger "Virke", mappar vi det till "Trä".
                </p>

                {/* Categories */}
                <div className="space-y-6">
                  {Object.entries(synonyms).map(([category, items]) => (
                    <div key={category}>
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="font-semibold text-gray-900">{category}</h3>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                          STANDARD
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        {items.map((synonym) => (
                          <span
                            key={synonym}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg"
                          >
                            {synonym}
                            <button
                              onClick={() => removeSynonym(category, synonym)}
                              className="hover:text-red-600 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                        
                        {/* Add Synonym Input */}
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Ny synonym..."
                            value={newSynonym[category] || ""}
                            onChange={(e) => setNewSynonym({ ...newSynonym, [category]: e.target.value })}
                            onKeyPress={(e) => {
                              if (e.key === "Enter") {
                                addSynonym(category);
                              }
                            }}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => addSynonym(category)}
                            className="px-3 py-1.5 text-gray-600 hover:text-gray-900 text-sm rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            + Synonym
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add New Category */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Nytt huvudmaterial..."
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            addCategory();
                          }
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={addCategory}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Lägg till nytt huvudmaterial
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI & Automation Section */}
            {activeSection === "ai" && (
              <div className="space-y-6">
                {/* Säkerhetströskel */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-1" />
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-gray-900 mb-2">
                        Säkerhetströskel
                      </h2>
                      <p className="text-sm text-gray-600">
                        Bestäm när AI:n ska be om mänsklig granskning. Lägre värde betyder mer automation, men högre risk för fel.
                      </p>
                    </div>
                  </div>

                  {/* Threshold Slider */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Tillåtande (60%)</span>
                      <span className="text-2xl font-bold text-gray-900">{threshold}%</span>
                      <span className="text-sm text-gray-600">Strikt (99%)</span>
                    </div>
                    
                    <input
                      type="range"
                      min="60"
                      max="99"
                      value={threshold}
                      onChange={(e) => setThreshold(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600">
                        Just nu: Allt med under {threshold}% säkerhet kommer markeras med gul varning.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={saveThreshold}
                    disabled={saving}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {saving ? "Sparar..." : "Spara tröskel"}
                  </button>
                </div>

                {/* Auto-Godkännande */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="mb-4">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                      Auto-Godkännande
                    </h2>
                    <p className="text-sm text-gray-600">
                      Dokumentprocessen godkänner automatiskt dokument med kvalitetsbetyg över 95%. Dokument under tröskeln skickas till mänsklig granskning.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <p className="text-sm font-medium">
                        Automatisk godkännande aktivt
                      </p>
                    </div>
                    <p className="text-xs text-green-600 mt-2">
                      Dokument med 95%+ kvalitet godkänns automatiskt och exporteras till Azure
                    </p>
                  </div>
                </div>

                {/* Model Preferences */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Modellinställningar & Kvalitet</h2>
                  <ModelPreferences />
                </div>

                {/* API Keys */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">API-nycklar & Leverantörer</h2>
                  <ApiKeysForm />
                </div>
              </div>
            )}

            {/* Export & Rapporter Section */}
            {activeSection === "export" && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  Export & Rapporter
                </h2>
                <p className="text-sm text-gray-600 mb-6">
                  Hantera exportformat och rapportinställningar.
                </p>
                
                <div className="space-y-6">
                  {/* Export Format */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Exportformat</h3>
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">Excel (XLSX)</p>
                          <p className="text-sm text-gray-600">Standardformat för avfallsdata</p>
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                          AKTIVT
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Export Location */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Exportdestination</h3>
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">Azure Blob Storage</p>
                          <p className="text-sm text-gray-600 font-mono">Container: completed</p>
                        </div>
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                          ANSLUTEN
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Auto-export */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Automatisk export</h3>
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-700">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <p className="text-sm font-medium">
                          Godkända dokument exporteras automatiskt
                        </p>
                      </div>
                      <p className="text-xs text-green-600 mt-2">
                        Efter godkännande raderas originalfilen från "unsupported-file-format"
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Azure & GUIDs Section */}
            {activeSection === "azure" && features.azure_integration && (
              <div className="space-y-6">
                {/* Azure Connection Management */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <Cloud className="w-5 h-5 text-blue-600 mt-1" />
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-gray-900 mb-2">
                        Azure Storage-anslutning
                      </h2>
                      <p className="text-sm text-gray-600">
                        Hantera din Azure Blob Storage-anslutning för dokumentlagring och synkronisering.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                    <div className="flex items-center gap-2 text-blue-700 mb-2">
                      <Key className="w-4 h-4" />
                      <p className="text-sm font-medium">Självbetjäning för Azure</p>
                    </div>
                    <p className="text-xs text-blue-600">
                      Konfigurera din egen Azure Blob Storage utan att behöva ändra miljövariabler. 
                      Connection strings krypteras säkert i databasen.
                    </p>
                  </div>

                  <Link
                    href="/settings/azure"
                    className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Cloud className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-900">Azure-anslutningar</p>
                        <p className="text-xs text-gray-500">Lägg till eller hantera dina Azure Storage-anslutningar</p>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </Link>
                </div>

                {/* Folder Configuration */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-2">
                        Azure Mappar
                      </h2>
                      <p className="text-sm text-gray-600">
                        Välj vilka mappar som ska övervakas för inkommande filer och var bearbetade filer ska sparas.
                      </p>
                    </div>
                    <button
                      onClick={fetchAzureContainers}
                      disabled={loadingContainers}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingContainers ? 'animate-spin' : ''}`} />
                      {loadingContainers ? 'Laddar...' : 'Hämta mappar'}
                    </button>
                  </div>
                  
                  {/* Container info box */}
                  <div className={`mb-4 p-3 rounded-lg border ${
                    defaultAzureContainer 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-yellow-50 border-yellow-200'
                  }`}>
                    <div className="flex items-start gap-2">
                      <Cloud className={`w-4 h-4 mt-0.5 ${defaultAzureContainer ? 'text-blue-600' : 'text-yellow-600'}`} />
                      <div className="flex-1">
                        {defaultAzureContainer ? (
                          <>
                            <p className="text-sm font-medium text-blue-900">
                              Begränsad till container: <code className="px-1 py-0.5 bg-blue-100 rounded">{defaultAzureContainer}</code>
                            </p>
                            <p className="text-xs text-blue-700 mt-1">
                              Konfigurerat via inställningar eller miljövariabel
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-yellow-900">
                              Ingen container begränsning konfigurerad
                            </p>
                            <p className="text-xs text-yellow-700 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Konfigurera Azure-anslutning ovan eller sätt miljövariabler
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Input Folders */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <FolderInput className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-gray-900">Inkommande mappar</h3>
                      <span className="text-xs text-gray-500">(en eller flera)</span>
                    </div>
                    
                    {/* Selected input folders */}
                    <div className="space-y-2 mb-3">
                      {inputFolders.length === 0 ? (
                        <p className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded-lg">
                          Inga inkommande mappar konfigurerade
                        </p>
                      ) : (
                        inputFolders.map((folder, index) => (
                          <div 
                            key={`${folder.container}-${folder.folder}-${index}`}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              folder.enabled 
                                ? 'bg-blue-50 border-blue-200' 
                                : 'bg-gray-50 border-gray-200 opacity-60'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => toggleInputFolder(index)}
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                  folder.enabled 
                                    ? 'bg-blue-600 border-blue-600 text-white' 
                                    : 'border-gray-300 bg-white'
                                }`}
                              >
                                {folder.enabled && <Check className="w-3 h-3" />}
                              </button>
                              <div>
                                <p className="font-medium text-gray-900 font-mono text-sm">
                                  {folder.folder ? `${folder.container}/${folder.folder}` : folder.container}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {folder.enabled ? 'Aktiv' : 'Pausad'}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => removeInputFolder(index)}
                              className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add input folder button */}
                    <button
                      onClick={() => {
                        if (azureContainers.length === 0) {
                          fetchAzureContainers();
                        }
                        setShowFolderPicker(showFolderPicker === 'input' ? null : 'input');
                      }}
                      className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-lg text-sm text-gray-600 hover:text-blue-600 transition-colors w-full justify-center"
                    >
                      <Plus className="w-4 h-4" />
                      Lägg till inkommande mapp
                    </button>

                    {/* Folder picker for input */}
                    {showFolderPicker === 'input' && (
                      <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        {/* Manual input option */}
                        <div className="mb-4 pb-4 border-b border-gray-200">
                          <p className="text-xs text-gray-600 mb-2 font-medium">Ange mapp manuellt:</p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={manualInputPath}
                              onChange={(e) => setManualInputPath(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === "Enter") addManualInputFolder();
                              }}
                              placeholder="container/folder/subfolder"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                            />
                            <button
                              onClick={addManualInputFolder}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                              Lägg till
                            </button>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            Exempel: arrivalwastedata/output/unable_to_process
                          </p>
                        </div>

                        {/* Browse folders */}
                        {azureContainers.length > 0 ? (
                          <div className="max-h-64 overflow-y-auto">
                            <p className="text-xs text-gray-500 mb-3">Eller välj från listan:</p>
                            {azureContainers.map(container => (
                              <div key={container.name} className="mb-2">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => toggleContainer(container.name)}
                                    className="p-1 hover:bg-gray-200 rounded"
                                  >
                                    {expandedContainers.has(container.name) 
                                      ? <ChevronDown className="w-4 h-4 text-gray-500" />
                                      : <ChevronRight className="w-4 h-4 text-gray-500" />
                                    }
                                  </button>
                                  <button
                                    onClick={() => addInputFolder(container.name)}
                                    className="flex-1 flex items-center gap-2 p-2 hover:bg-blue-100 rounded-lg text-left transition-colors"
                                  >
                                    <FolderOpen className="w-4 h-4 text-yellow-600" />
                                    <span className="font-medium text-gray-900">{container.name}</span>
                                    <span className="text-xs text-gray-500">
                                      ({container.rootFileCount} filer{container.folders.length > 0 && `, ${container.folders.length} mappar`})
                                    </span>
                                  </button>
                                </div>
                                
                                {/* Nested folders */}
                                {expandedContainers.has(container.name) && container.folders.length > 0 && (
                                  <FolderTree 
                                    folders={container.folders} 
                                    containerName={container.name}
                                    onSelect={(container, folder) => addInputFolder(container, folder)}
                                    expandedFolders={expandedFolders}
                                    toggleFolder={toggleFolder}
                                    level={1}
                                  />
                                )}
                                
                                {/* Show message if no folders found */}
                                {expandedContainers.has(container.name) && container.folders.length === 0 && (
                                  <div className="ml-8 mt-1 p-2 text-xs text-gray-500 italic">
                                    Inga undermappar hittade. Använd manuell inmatning för djupare mappar.
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500 text-sm">
                            Klicka på "Hämta mappar" för att visa tillgängliga containers
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Output Folder */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <FolderOutput className="w-5 h-5 text-green-600" />
                      <h3 className="font-semibold text-gray-900">Målmapp (bearbetade filer)</h3>
                      <span className="text-xs text-gray-500">(en)</span>
                    </div>
                    
                    {/* Selected output folder */}
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Check className="w-5 h-5 text-green-600" />
                          <div>
                            <p className="font-medium text-gray-900 font-mono text-sm">
                              {outputFolder}
                            </p>
                            <p className="text-xs text-gray-500">Bearbetade filer sparas här</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (azureContainers.length === 0) {
                              fetchAzureContainers();
                            }
                            setShowFolderPicker(showFolderPicker === 'output' ? null : 'output');
                          }}
                          className="px-3 py-1.5 text-sm text-green-700 hover:bg-green-100 rounded-lg transition-colors"
                        >
                          Ändra
                        </button>
                      </div>
                    </div>

                    {/* Folder picker for output */}
                    {showFolderPicker === 'output' && (
                      <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        {/* Manual input option */}
                        <div className="mb-4 pb-4 border-b border-gray-200">
                          <p className="text-xs text-gray-600 mb-2 font-medium">Ange målmapp manuellt:</p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={manualOutputPath}
                              onChange={(e) => setManualOutputPath(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === "Enter") setManualOutputFolderPath();
                              }}
                              placeholder="container/folder/subfolder"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
                            />
                            <button
                              onClick={setManualOutputFolderPath}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                              Välj
                            </button>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            Exempel: arrivalwastedata/incoming eller completed
                          </p>
                        </div>

                        {/* Browse folders */}
                        {azureContainers.length > 0 ? (
                          <div className="max-h-64 overflow-y-auto">
                            <p className="text-xs text-gray-500 mb-3">Eller välj från listan:</p>
                            {azureContainers.map(container => (
                              <div key={container.name} className="mb-2">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => toggleContainer(container.name)}
                                    className="p-1 hover:bg-gray-200 rounded"
                                  >
                                    {expandedContainers.has(container.name) 
                                      ? <ChevronDown className="w-4 h-4 text-gray-500" />
                                      : <ChevronRight className="w-4 h-4 text-gray-500" />
                                    }
                                  </button>
                                  <button
                                    onClick={() => selectOutputFolder(container.name)}
                                    className={`flex-1 flex items-center gap-2 p-2 hover:bg-green-100 rounded-lg text-left transition-colors ${
                                      outputFolder === container.name ? 'bg-green-100' : ''
                                    }`}
                                  >
                                    <FolderOpen className="w-4 h-4 text-yellow-600" />
                                    <span className="font-medium text-gray-900">{container.name}</span>
                                    {outputFolder === container.name && (
                                      <Check className="w-4 h-4 text-green-600 ml-auto" />
                                    )}
                                  </button>
                                </div>
                                
                                {/* Nested folders */}
                                {expandedContainers.has(container.name) && container.folders.length > 0 && (
                                  <FolderTree 
                                    folders={container.folders} 
                                    containerName={container.name}
                                    onSelect={(container, folder) => selectOutputFolder(container, folder)}
                                    expandedFolders={expandedFolders}
                                    toggleFolder={toggleFolder}
                                    level={1}
                                    mode="output"
                                  />
                                )}
                                
                                {/* Show message if no folders found */}
                                {expandedContainers.has(container.name) && container.folders.length === 0 && (
                                  <div className="ml-8 mt-1 p-2 text-xs text-gray-500 italic">
                                    Inga undermappar hittade. Använd manuell inmatning.
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500 text-sm">
                            Klicka på "Hämta mappar" för att visa tillgängliga containers
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Save button */}
                  <button
                    onClick={saveAzureFolderSettings}
                    disabled={saving}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {saving ? "Sparar..." : "Spara mappinställningar"}
                  </button>
                </div>

                {/* Auto-sync info */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Automatisk synkronisering</h3>
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <p className="text-sm font-medium">
                        Synkar nya filer var 5:e minut
                      </p>
                    </div>
                    <p className="text-xs text-green-600 mt-2">
                      Systemet kollar automatiskt efter nya dokument i de valda inkommande mapparna
                    </p>
                  </div>
                </div>

                {/* Filename Format info */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Filnamnhantering</h3>
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">
                      Systemet hanterar automatiskt UUID-baserade filnamn från Azure och extraherar datum från filnamn.
                    </p>
                    <p className="text-xs text-gray-500 font-mono">
                      Format: [uuid]_[timestamp]_[datum].pdf
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Email Inbox Section */}
            {activeSection === "email" && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <Mail className="w-5 h-5 text-blue-600 mt-1" />
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-gray-900 mb-2">E-postinkorg</h2>
                      <p className="text-sm text-gray-600">
                        Vidarebefordra dokument till din unika e-postadress för automatisk bearbetning.
                      </p>
                    </div>
                  </div>

                  {(settings as any)?.inbox_enabled ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <p className="text-sm font-medium text-emerald-900 mb-2">Din inkorgsadress:</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 px-3 py-2 bg-white border border-emerald-300 rounded-lg text-sm font-mono text-emerald-800">
                            docs@inbox.solvix.ai
                          </code>
                          <button
                            onClick={() => navigator.clipboard.writeText('docs@inbox.solvix.ai')}
                            className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
                          >
                            Kopiera
                          </button>
                        </div>
                        <p className="text-xs text-emerald-600 mt-2">
                          Skriv <strong>VEXT-{(settings as any)?.inbox_code}</strong> i ämnesraden så att vi vet att det är din fil.
                        </p>
                      </div>

                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                        <p className="text-sm font-medium text-slate-700 mb-2">Så funkar det:</p>
                        <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                          <li>Vidarebefordra mail med PDF/Excel-bilagor till adressen ovan</li>
                          <li>Skriv <strong>VEXT-{(settings as any)?.inbox_code}</strong> i ämnesraden</li>
                          <li>Solvix.ai extraherar data automatiskt och visar resultatet i dashboarden</li>
                        </ol>
                      </div>

                      {/* Auto-process toggle */}
                      <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">Automatisk bearbetning</p>
                          <p className="text-xs text-gray-500">Bearbeta bilagor automatiskt vid mottagning</p>
                        </div>
                        <button
                          onClick={async () => {
                            if (!userId) return;
                            const supabase = createBrowserClient(
                              process.env.NEXT_PUBLIC_SUPABASE_URL!,
                              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                            );
                            const newVal = !(settings as any)?.inbox_auto_process;
                            await supabase
                              .from('settings')
                              .update({ inbox_auto_process: newVal })
                              .eq('user_id', userId);
                            window.location.reload();
                          }}
                          className={`relative w-11 h-6 rounded-full transition-colors ${
                            (settings as any)?.inbox_auto_process ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            (settings as any)?.inbox_auto_process ? 'translate-x-5' : 'translate-x-0'
                          }`} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Mail className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-500 mb-4">E-postinkorgen är inte aktiverad</p>
                      <button
                        onClick={handleEnableInbox}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Aktivera e-postinkorg
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
