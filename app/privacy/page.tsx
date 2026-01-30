import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">V</span>
            </div>
            <span className="font-semibold text-slate-900">Vextra AI</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Integritetspolicy</h1>

        <div className="prose prose-slate max-w-none">
          <p className="text-slate-600 mb-8">
            Senast uppdaterad: {new Date().toLocaleDateString("sv-SE")}
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              1. Introduktion
            </h2>
            <p>
              Vextra AI ("vi", "oss", "vår") värnar om din integritet. Denna
              integritetspolicy förklarar hur vi samlar in, använder, lagrar och
              skyddar dina personuppgifter när du använder vår tjänst för
              dokumentextraktion.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              2. Personuppgiftsansvarig
            </h2>
            <p>
              Personuppgiftsansvarig för behandlingen av dina personuppgifter är:
            </p>
            <ul className="list-disc ml-6 mt-2">
              <li>Företagsnamn: Vextra AI</li>
              <li>E-post: vilmer.frost@gmail.com</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              3. Vilka uppgifter samlar vi in?
            </h2>
            <p>Vi samlar in följande kategorier av personuppgifter:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>
                <strong>Kontouppgifter:</strong> E-postadress, namn (om angivet)
              </li>
              <li>
                <strong>Autentiseringsuppgifter:</strong> OAuth-tokens från Google/Microsoft
                (lagras ej av oss direkt, hanteras av Supabase Auth)
              </li>
              <li>
                <strong>Dokumentdata:</strong> De dokument du laddar upp för
                extraktion
              </li>
              <li>
                <strong>Användningsdata:</strong> Information om hur du använder
                tjänsten, inklusive API-anrop och kostnadsstatistik
              </li>
              <li>
                <strong>Tekniska uppgifter:</strong> IP-adress, webbläsartyp,
                enhetsinformation
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              4. Hur använder vi dina uppgifter?
            </h2>
            <p>Vi använder dina uppgifter för att:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Tillhandahålla och förbättra vår dokumentextraheringstjänst</li>
              <li>Hantera ditt konto och prenumeration</li>
              <li>Kommunicera med dig om tjänsten</li>
              <li>Förhindra missbruk och upprätthålla säkerheten</li>
              <li>Uppfylla rättsliga skyldigheter</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              5. Lagring och säkerhet
            </h2>
            <p>
              Dina uppgifter lagras säkert med hjälp av kryptering. Vi använder:
            </p>
            <ul className="list-disc ml-6 mt-2">
              <li>
                <strong>Supabase:</strong> För databas och autentisering (EU-baserade
                servrar)
              </li>
              <li>
                <strong>Azure Blob Storage:</strong> För dokumentlagring (konfigureras
                av dig)
              </li>
              <li>
                <strong>AES-256-GCM kryptering:</strong> För känsliga uppgifter som
                API-nycklar
              </li>
            </ul>
            <p className="mt-4">
              Vi behåller dina uppgifter så länge ditt konto är aktivt eller så
              länge det krävs för att uppfylla de syften som beskrivs i denna
              policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              6. Dina rättigheter enligt GDPR
            </h2>
            <p>Du har rätt att:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>
                <strong>Få tillgång:</strong> Begära en kopia av dina personuppgifter
              </li>
              <li>
                <strong>Rättelse:</strong> Begära rättelse av felaktiga uppgifter
              </li>
              <li>
                <strong>Radering:</strong> Begära att vi raderar dina uppgifter
                ("rätten att bli glömd")
              </li>
              <li>
                <strong>Dataportabilitet:</strong> Få dina uppgifter i ett
                maskinläsbart format
              </li>
              <li>
                <strong>Invändning:</strong> Invända mot viss behandling av dina
                uppgifter
              </li>
              <li>
                <strong>Begränsning:</strong> Begära begränsning av behandlingen
              </li>
            </ul>
            <p className="mt-4">
              För att utöva dina rättigheter, kontakta oss på{" "}
              <a
                href="mailto:vilmer.frost@gmail.com"
                className="text-indigo-600 hover:underline"
              >
                vilmer.frost@gmail.com
              </a>{" "}
              eller använd funktionerna i Inställningar → Data.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              7. Tredjepartsleverantörer
            </h2>
            <p>Vi använder följande tredjepartsleverantörer:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>
                <strong>AI-leverantörer</strong> (Google, OpenAI, Anthropic): För
                dokumentextraktion - du tillhandahåller egna API-nycklar
              </li>
              <li>
                <strong>Stripe:</strong> För betalningshantering
              </li>
              <li>
                <strong>Vercel:</strong> För webbhosting
              </li>
              <li>
                <strong>Sentry:</strong> För felspårning (anonymiserad data)
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              8. Cookies
            </h2>
            <p>
              Vi använder nödvändiga cookies för autentisering och
              sessionhantering. Inga tredjepartscookies för marknadsföring
              används.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              9. Ändringar i policyn
            </h2>
            <p>
              Vi kan uppdatera denna policy. Vid väsentliga ändringar meddelar vi
              dig via e-post eller i tjänsten.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              10. Kontakta oss
            </h2>
            <p>
              Om du har frågor om denna policy eller vår behandling av dina
              uppgifter, kontakta oss på:
            </p>
            <p className="mt-2">
              <a
                href="mailto:vilmer.frost@gmail.com"
                className="text-indigo-600 hover:underline"
              >
                vilmer.frost@gmail.com
              </a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
