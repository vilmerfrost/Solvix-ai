import Link from "next/link";

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold text-slate-900 mb-8">
          Användarvillkor
        </h1>

        <div className="prose prose-slate max-w-none">
          <p className="text-slate-600 mb-8">
            Senast uppdaterad: {new Date().toLocaleDateString("sv-SE")}
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              1. Godkännande av villkor
            </h2>
            <p>
              Genom att använda Vextra AI ("Tjänsten") godkänner du dessa
              användarvillkor. Om du inte godkänner villkoren får du inte använda
              Tjänsten.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              2. Beskrivning av Tjänsten
            </h2>
            <p>
              Vextra AI är en plattform för intelligent dokumentextraktion som
              använder artificiell intelligens för att analysera och extrahera
              data från dokument. Tjänsten erbjuder:
            </p>
            <ul className="list-disc ml-6 mt-2">
              <li>OCR och dokumentanalys med AI-modeller</li>
              <li>Integration med Azure Blob Storage</li>
              <li>Export till Excel-format</li>
              <li>Dashboard och statistik</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              3. Kontokrav
            </h2>
            <p>För att använda Tjänsten måste du:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Vara minst 18 år gammal</li>
              <li>Tillhandahålla korrekt kontaktinformation</li>
              <li>Hålla dina inloggningsuppgifter konfidentiella</li>
              <li>Ansvara för all aktivitet på ditt konto</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              4. API-nycklar (BYOK-modell)
            </h2>
            <p>
              Vextra AI använder en "Bring Your Own Key"-modell där du
              tillhandahåller egna API-nycklar för AI-tjänster. Du ansvarar för:
            </p>
            <ul className="list-disc ml-6 mt-2">
              <li>
                Att hantera kostnadsgränser hos dina AI-leverantörer (Google,
                OpenAI, Anthropic)
              </li>
              <li>
                Alla kostnader som uppstår genom användning av dina API-nycklar
              </li>
              <li>Att hålla dina API-nycklar säkra</li>
            </ul>
            <p className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <strong>Viktigt:</strong> Vi rekommenderar starkt att du sätter
              kostnadsgränser hos dina AI-leverantörer för att undvika oväntade
              kostnader.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              5. Tillåten användning
            </h2>
            <p>Du får använda Tjänsten för:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Affärsrelaterad dokumentbearbetning</li>
              <li>Dataextraktion från egna eller godkända dokument</li>
              <li>Integration med dina egna system</li>
            </ul>
            <p className="mt-4">Du får INTE använda Tjänsten för:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Olaglig verksamhet</li>
              <li>Bearbetning av dokument utan behörighet</li>
              <li>Försök att kringgå säkerhetsåtgärder</li>
              <li>Massautomatisering som överbelastar systemen</li>
              <li>Återförsäljning av Tjänsten utan tillstånd</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              6. Betalning och prenumerationer
            </h2>
            <p>
              Betalda prenumerationer faktureras månadsvis. Du kan avsluta din
              prenumeration när som helst, och den fortsätter till slutet av
              innevarande faktureringsperiod. Återbetalningar ges inte för
              delvis använda perioder.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              7. Immateriella rättigheter
            </h2>
            <p>
              Tjänsten och dess innehåll ägs av Vextra AI. Du behåller alla
              rättigheter till de dokument du laddar upp och den data som
              extraheras.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              8. Ansvarsbegränsning
            </h2>
            <p>
              Tjänsten tillhandahålls "i befintligt skick". Vi garanterar inte
              att AI-extraktioner är felfria och ansvarar inte för skador som
              uppstår genom användning av Tjänsten. Du ansvarar för att verifiera
              extraherad data.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              9. Uppsägning
            </h2>
            <p>
              Vi förbehåller oss rätten att stänga av eller avsluta ditt konto
              vid brott mot dessa villkor. Du kan avsluta ditt konto när som
              helst via Inställningar.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              10. Ändringar
            </h2>
            <p>
              Vi kan uppdatera dessa villkor. Fortsatt användning efter ändringar
              innebär att du godkänner de nya villkoren.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              11. Tillämplig lag
            </h2>
            <p>
              Dessa villkor regleras av svensk lag. Tvister avgörs av svensk
              domstol.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              12. Kontakt
            </h2>
            <p>
              Vid frågor om dessa villkor, kontakta:
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
