import type { Metadata } from "next";
import Link from "@/components/link";
import { billingEnabled } from "@/lib/billing/stripe";
import styles from "./legal.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Impressum, Datenschutz & Nutzungsbedingungen",
  description:
    "Betreiberangaben, Datenschutz, Nutzungsregeln und Zahlungshinweise für Outpost. Vorläufiger Stand mit gekennzeichneten offenen Angaben.",
  robots: { index: false, follow: true },
};
const contents = [
  ["operator", "Impressum & Kontakt"],
  ["privacy", "Datenschutz & Zwecke"],
  ["cookies", "Cookies & Gerätespeicher"],
  ["providers", "Empfänger & Übermittlungen"],
  ["retention", "Speicherdauer & Löschung"],
  ["rights", "Ihre Datenschutzrechte"],
  ["terms", "Nutzungsbedingungen"],
  ["payments", "Supporter & Zahlungen"],
  ["withdrawal", "Widerruf & Kündigung"],
  ["data-sources", "Datenquellen"],
  ["scene-artwork", "KI-gestützte Gestaltung"],
  ["media", "Schriften & Medienrechte"],
] as const;

export default function Legal() {
  const operator = {
    name: process.env.OPERATOR_NAME?.trim(),
    address: process.env.OPERATOR_ADDRESS?.trim(),
    email: process.env.OPERATOR_EMAIL?.trim(),
  };
  const configuredBilling = billingEnabled();
  return (
    <div className={styles.page} lang="de">
      <header className={styles.header}>
        <h1>Rechtliches bei Outpost.</h1>
        <p>
          Wer hinter dem Projekt steht, welche Daten verarbeitet werden und was für die Nutzung
          gilt.
        </p>
        <p className={styles.updated}>Dokumentstand: 4. November 2026 · Deutsche Fassung</p>
        <div className={styles.status} role="note" aria-label="Vorläufiger Dokumentstatus">
          <strong>Entwurf: Betreiberangaben und rechtliche Freigabe noch offen.</strong>
          Diese Seite legt den geprüften Funktionsstand offen. Gekennzeichnete Platzhalter sind
          keine vollständige Anbieterkennzeichnung. Vor einem kostenpflichtigen Angebot müssen
          Betreiber, Vertragstexte und Verbraucherfunktionen vervollständigt und geprüft werden.
          Diese Veröffentlichung bestätigt keine rechtliche Konformität.
        </div>
      </header>
      <div className={styles.layout}>
        <nav className={styles.contents} aria-label="Rechtliche Themen">
          <strong>Auf dieser Seite</strong>
          {contents.map(([id, label]) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
        </nav>
        <article className={styles.article}>
          <section id="operator" aria-labelledby="operator-title">
            <h2 id="operator-title">Impressum & Kontakt</h2>
            <p>
              Outpost ist ein unabhängiges Community-Projekt zu Albion Online. Es besteht keine
              Verbindung zu oder Empfehlung durch Sandbox Interactive. „Outpost“ ist eine
              Projektbezeichnung und ersetzt nicht die Identität des verantwortlichen Anbieters.
            </p>
            <dl className={styles.details}>
              <dt>Anbieter / Verantwortlicher</dt>
              <dd>
                {operator.name || (
                  <span className={styles.open}>
                    [Vollständiger Name, gegebenenfalls Rechtsform und Vertretungsberechtigte
                    ergänzen]
                  </span>
                )}
              </dd>
              <dt>Ladungsfähige Anschrift</dt>
              <dd>
                {operator.address || (
                  <span className={styles.open}>
                    [Straße, Hausnummer, Postleitzahl, Ort und Staat ergänzen]
                  </span>
                )}
              </dd>
              <dt>E-Mail / Kontakt</dt>
              <dd>
                {operator.email ? (
                  <a href={`mailto:${operator.email}`}>{operator.email}</a>
                ) : (
                  <span className={styles.open}>
                    [Erreichbare Kontakt-E-Mail und gegebenenfalls weiterer unmittelbarer Kontaktweg
                    ergänzen]
                  </span>
                )}
              </dd>
              <dt>Register / Kennnummern</dt>
              <dd className={styles.open}>
                [Register und Registernummer, Umsatzsteuer- oder Wirtschafts-Identifikationsnummer
                nur ergänzen, soweit vorhanden und erforderlich; Anwendbarkeit noch ungeklärt]
              </dd>
              <dt>Weitere Pflichtangaben</dt>
              <dd className={styles.open}>
                [Berufsrechtliche Angaben, zuständige Zulassungsbehörde und
                journalistisch-redaktionelle Verantwortlichkeit prüfen, soweit einschlägig]
              </dd>
            </dl>
            <p>
              Die Gewerbe- beziehungsweise Unternehmensorganisation ist noch nicht abschließend
              eingerichtet. Das beseitigt mögliche Informationspflichten für einen bereits
              betriebenen Dienst nicht. Maßgeblich sind die tatsächliche Tätigkeit und unter anderem{" "}
              <a href="https://www.gesetze-im-internet.de/ddg/__5.html">§ 5 DDG</a>.
            </p>
          </section>
          <section id="privacy" aria-labelledby="privacy-title">
            <h2 id="privacy-title">Datenschutz & Verarbeitungszwecke</h2>
            <p>
              Datenschutzrechtlich verantwortlich ist der oben zu benennende Anbieter. Ein
              gegebenenfalls erforderlicher Datenschutzbeauftragter und seine Kontaktdaten sind noch
              zu prüfen. Die folgende Übersicht beschreibt den vorhandenen Code; fehlende
              Betreiberentscheidungen zu Rechtsgrundlagen, Interessenabwägung, Auftragsverarbeitung
              und Fristen sind ausdrücklich offen.
            </p>
            <h3>Besuch und Schutz des Dienstes</h3>
            <p>
              Bei Seiten- und API-Aufrufen werden technisch notwendige Verbindungsdaten verarbeitet,
              insbesondere IP-Adresse, Zeitpunkt, angeforderte URL, HTTP-Status und
              Browserinformationen. Cloudflare stellt die Website bereit und verarbeitet
              entsprechende Netzwerk- und Sicherheitsdaten. Anwendungsseitige Schutzmechanismen
              begrenzen Anfragen nach Netzwerk- oder Kontobezug. Fehler- und Betriebsprotokolle
              können technische Ereignisse enthalten; konkrete Protokollfelder und Löschfristen der
              eingesetzten Dienste müssen noch abschließend dokumentiert werden.
            </p>
            <h3>Discord-Anmeldung und Profil</h3>
            <p>
              Öffentliche Werkzeuge benötigen grundsätzlich kein Konto. Wenn Sie Discord zur
              Anmeldung wählen, werden die Berechtigungen „identify“ und „email“ angefragt. Outpost
              verarbeitet Discord-Kennung, Anzeigenamen, Profilbild und – soweit von Discord
              bereitgestellt – E-Mail-Adresse, außerdem Kontoverknüpfung und Sitzung. Die
              Kontodatenstruktur sieht OAuth-Zugriffs- und Aktualisierungstoken vor; soweit Discord
              diese liefert, werden sie serverseitig verarbeitet. Ihr Discord-Passwort wird Outpost
              nicht übermittelt. Es werden hierdurch keine privaten Discord-Nachrichten oder
              vollständigen Serverlisten angefordert.
            </p>
            <p>
              Optionale Angaben wie Albion-Charaktername und Region sowie Erstellungs- und
              Aktualisierungszeit gehören zum Profil. Bei angemeldeten Besuchen wird der
              Aktualisierungszeitpunkt höchstens ungefähr alle zwölf Stunden berührt; er dient auch
              der aggregierten Anzeige aktiver Spieler.
            </p>
            <h3>Gespeicherte Inhalte und Zusammenarbeit</h3>
            <p>
              Je nach genutzter Funktion speichert Outpost Builds, Ausrüstung und Versionen,
              Kompositionen, Szenarien, Favoriten, Reaktionen, Kommentare und Revisionen, Meldungen,
              Marktbeobachtungslisten und Timer. In Teams kommen Mitgliedschaft, Rollen,
              Einladungen, Ankündigungen, Termine, Zusagen sowie gemeinsame Build- und Loot-Daten
              hinzu. Als öffentlich freigegebene Inhalte können andere Besucher sie lesen.
              Gruppenbezogene Inhalte werden nach den jeweiligen Zugriffsrechten angezeigt;
              veröffentlichen Sie dort keine unnötigen personenbezogenen Daten Dritter.
            </p>
            <h3>Zwecke und vorgesehene Rechtsgrundlagen</h3>
            <p>
              Für angeforderte Konto-, Speicher- und Vertragsfunktionen kommt Art. 6 Abs. 1 Buchst.
              b DSGVO in Betracht, für erforderliche gesetzliche Pflichten Buchst. c und für
              verhältnismäßigen Betrieb, Missbrauchsschutz und Fehleranalyse Buchst. f. Dafür sind
              die konkreten berechtigten Interessen und eine Interessenabwägung vom Verantwortlichen
              festzulegen. Nicht erforderliche Werbung beziehungsweise Tracking benötigen die
              jeweils einschlägige Einwilligung. Die Zuordnung ist vor Freigabe durch den
              Verantwortlichen zu bestätigen; diese Seite ersetzt sie nicht durch eine pauschale
              Einwilligung.
            </p>
            <p>
              Daten erhalten wir von Ihnen, bei der Anmeldung von Discord und – soweit Sie Inhalte
              anderer Personen aufrufen – aus deren veröffentlichten Beiträgen beziehungsweise den
              genannten öffentlichen Spiel- und Community-Quellen. Soweit personenbezogene Daten
              nicht direkt bei Betroffenen erhoben werden, sind auch die Informationspflichten nach
              Art. 14 DSGVO zu prüfen. Es ist keine automatisierte Entscheidung mit rechtlicher oder
              vergleichbar erheblicher Wirkung nach Art. 22 DSGVO vorgesehen; das technische
              Sortieren von Spielpreisen ist keine Bonitätsbewertung.
            </p>
          </section>
          <section id="cookies" aria-labelledby="cookies-title">
            <h2 id="cookies-title">Cookies & Gerätespeicher</h2>
            <p>
              Cookies und localStorage sind unterschiedliche Speicherformen.{" "}
              <a href="https://www.gesetze-im-internet.de/ttdsg/__25.html">§ 25 TDDDG</a> erfasst
              grundsätzlich das Speichern oder Auslesen von Informationen auf Ihrem Gerät. Ob eine
              Ausnahme für eine ausdrücklich gewünschte, unbedingt erforderliche Funktion greift,
              muss je Zweck geprüft werden; „first party“ allein macht einen Speicherzugriff nicht
              einwilligungsfrei.
            </p>
            <div
              className={styles.tableScroll}
              role="region"
              aria-label="Cookies und lokale Speicherfunktionen"
              tabIndex={0}
            >
              <table>
                <thead>
                  <tr>
                    <th>Speicher / Zweck</th>
                    <th>Technisch eingestellte Dauer</th>
                    <th>Hinweis</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>NextAuth-Sitzung: Anmeldung erhalten</td>
                    <td>Serverseitig 14 Tage; laufende Anmeldung kann erneuert werden</td>
                    <td>Sitzungscookie, über HTTPS mit Sicherheitsattributen</td>
                  </tr>
                  <tr>
                    <td>OAuth-Schutz: State und PKCE</td>
                    <td>15 Minuten im verwendeten Auth-Modul</td>
                    <td>
                      Nur für den Anmeldeablauf; weitere CSRF-/Rücksprung-Cookies nach Sitzungs-
                      beziehungsweise Bibliotheksvorgaben
                    </td>
                  </tr>
                  <tr>
                    <td>outpost-route: technische Zuordnung von Seitenaufrufen</td>
                    <td>30 Minuten</td>
                    <td>Signiert; keine Anmeldeberechtigung</td>
                  </tr>
                  <tr>
                    <td>atlas-theme und atlas-region: gewählte Darstellung / Spielregion</td>
                    <td>Bis zu 365 Tage</td>
                    <td>Durch entsprechende Nutzerauswahl gesetzt; im Browser löschbar</td>
                  </tr>
                  <tr>
                    <td>
                      localStorage: Gast-Builds, Sammlungen, Filter, Einkaufslisten,
                      Spezialisierungen, Checklisten, Karten und Werkzeug-Verknüpfungen
                    </td>
                    <td>Keine einheitliche automatische Ablaufzeit im Code</td>
                    <td>
                      Auf diesem Gerät; durch Löschen der Website-Daten entfernbar. Erst eine
                      ausdrücklich genutzte Speicher-/Synchronisationsfunktion kann Daten zum Server
                      übertragen.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Das Löschen lokaler Website-Daten entfernt auch lokal gespeicherte Entwürfe und
              Präferenzen. Es löscht weder automatisch das Serverkonto noch ein Abonnement. Browser
              können gespeicherte Daten außerdem selbstständig entfernen.
            </p>
            <h3>Werbung derzeit deaktiviert</h3>
            <p>
              In diesem Stand werden keine AdSense-Anzeigenskripte, Anzeigenplätze oder
              Anzeigenanfragen eingebunden. Das gilt auch dann, wenn eine Publisher-Kennung
              hinterlegt ist. Ein gegebenenfalls ausgegebenes Google-Kontoverifizierungs-Metatag
              enthält nur die Publisher-Zuordnung und lädt selbst kein Google-Skript. Es ist weder
              ein Einwilligungsnachweis noch eine Freigabe für Tracking.
            </p>
            <p>
              Ein vollständiger Einwilligungsmanager mit Widerrufsmöglichkeit ist derzeit nicht
              eingerichtet. Deshalb bleibt die Anzeigenintegration deaktiviert. Vor einer späteren
              Aktivierung müssen erforderliche Einwilligungen und ihr Widerruf,
              Anbieter-/Partnerangaben, Datenübermittlungen sowie das Verhalten für Supporter
              technisch und rechtlich geprüft werden. Eine konfigurierte Kennung oder die bloße
              Nutzung der Website wird nicht als Zustimmung behandelt.
            </p>
            <p>
              Bei einem späteren freigegebenen Werbeeinsatz können Google und gegebenenfalls
              Werbepartner Cookies, Gerätekennungen und Besuchsdaten für Auslieferung, Messung und –
              bei entsprechender Einwilligung – Personalisierung verarbeiten. Die dann tatsächlich
              beteiligten Empfänger und Speicherfristen müssten vorab ergänzt werden. Diese Seite
              holt selbst keine Werbeeinwilligung ein.
            </p>
            <p>
              Google erläutert die{" "}
              <a href="https://support.google.com/adsense/answer/13554116?hl=de">
                Anforderungen an Einwilligungsplattformen im EWR, Vereinigten Königreich und der
                Schweiz
              </a>{" "}
              und die{" "}
              <a href="https://support.google.com/adsense/answer/1348695?hl=de">
                Cookies für Anzeigen
              </a>
              . Eine spätere Einwilligung muss freiwillig, informiert und widerrufbar sein;
              Ablehnung darf nicht durch eine bloße Weiterbenutzung ersetzt werden. Zusätzliche
              Analyseprodukte wie Google Analytics werden im geprüften Anwendungscode nicht
              eingebunden; mögliche Einstellungen außerhalb des Repositorys sind nicht damit
              geprüft.
            </p>
          </section>
          <section id="providers" aria-labelledby="providers-title">
            <h2 id="providers-title">Empfänger & internationale Übermittlungen</h2>
            <ul>
              <li>
                <strong>Cloudflare:</strong> Auslieferung und Schutz über Workers, öffentliche
                Katalog-/Inhaltsdaten in D1, Konto- und Zusammenarbeitsdaten in SQLite-basierten
                Durable Objects. Je nach Konfiguration kommt Turnstile bei Community-Beiträgen
                hinzu; dabei erhält Cloudflare technische Geräte-/Verbindungsdaten und prüft ein
                Token.{" "}
                <a href="https://www.cloudflare.com/privacypolicy/">Datenschutz bei Cloudflare</a>,{" "}
                <a href="https://www.cloudflare.com/cloudflare-customer-dpa/">
                  Auftragsverarbeitungsbedingungen
                </a>
                .
              </li>
              <li>
                <strong>Discord:</strong> eigenständiger Dienst für die freiwillig gewählte
                Anmeldung. Es gelten ergänzend die{" "}
                <a href="https://discord.com/privacy">Discord-Datenschutzhinweise</a>. Der Umfang
                der Anmeldung ist in der{" "}
                <a href="https://docs.discord.com/developers/topics/oauth2">OAuth-Dokumentation</a>{" "}
                beschrieben.
              </li>
              <li>
                <strong>Sandbox Interactive / Albion-Renderer:</strong> Gegenstandsbilder werden
                teilweise unmittelbar von render.albiononline.com geladen. Dadurch erhält dieser
                Server die für den Bildabruf nötigen Verbindungsdaten, einschließlich Ihrer
                IP-Adresse. Bei Fehlern kann ein eigener Bild-Proxy einspringen. Ein externer
                Bildabruf ist kein rein lokales Bild.
              </li>
              <li>
                <strong>Albion Online Data Project und öffentliche Inhaltsquellen:</strong> Outpost
                fragt Spielpreise überwiegend serverseitig ab. Server- und Browserabrufe sind zu
                unterscheiden; externe Links und einzelne eingebundene Medien können zu direkten
                Verbindungen führen.
              </li>
              <li>
                <strong>Stripe, falls Zahlungen eingerichtet werden:</strong> gehosteter Checkout
                und Kundenportal, Name/E-Mail und eine interne Kundenreferenz, Zahlungs- und
                Abonnementvorgänge. Outpost verarbeitet Zuordnungskennungen, Status,
                Ablauf-/Verlängerungsangaben und Webhook-Ereignisse, keine Eingabefelder für
                vollständige Karten- oder Bankdaten. Stripe verarbeitet Zahlungsdaten auf seinen
                eigenen Oberflächen; je Vorgang als Auftragsverarbeiter und/oder eigener
                Verantwortlicher. <a href="https://stripe.com/privacy">Stripe-Datenschutz</a>,{" "}
                <a href="https://stripe.com/legal/dpa">DPA</a>.
              </li>
              <li>
                <strong>Google / Werbepartner, sofern AdSense geladen wird:</strong> siehe den
                Abschnitt zu Werbung. Empfängerkreis, konkrete Partner und Einwilligungszustände
                sind vor Einsatz in der tatsächlichen Konfiguration zu dokumentieren.
              </li>
            </ul>
            <p className={styles.open}>
              Offen: genaue vertragliche Anbieter-Gesellschaften, Auftragsverarbeitungsverträge,
              Unterauftragnehmer, tatsächliche Speicherorte und Drittlandgarantien. Eine
              ausschließlich deutsche oder europäische Speicherung wird nicht zugesichert.
            </p>
            <p>
              Bei Verarbeitung außerhalb des EWR sind die Voraussetzungen von Art. 44 ff. DSGVO
              einzuhalten, etwa ein einschlägiger Angemessenheitsbeschluss oder geeignete Garantien
              einschließlich erforderlicher Zusatzmaßnahmen. Wir behaupten ohne konkrete Prüfung
              weder eine Teilnahme aller Empfänger am EU-US Data Privacy Framework noch den
              Abschluss bestimmter Standardvertragsklauseln. Der Verantwortliche muss die
              einschlägigen Grundlagen und den Zugang zu einer Kopie der Garantien ergänzen.
            </p>
          </section>
          <section id="retention" aria-labelledby="retention-title">
            <h2 id="retention-title">Speicherdauer, Export & Löschung</h2>
            <p>
              Serverseitige Kontoinhalte bleiben grundsätzlich für die jeweils genutzten Funktionen
              gespeichert, bis sie gelöscht werden oder der Zweck entfällt. Eine vollständige
              freigegebene Fristenliste für Konten, Revisionen, Moderation, Betriebsprotokolle,
              Backups und Abrechnungsunterlagen liegt noch nicht vor. Gesetzliche
              Aufbewahrungspflichten können einzelne Daten länger betreffen; konkrete Kategorien und
              Fristen sind nach Einrichtung des Betriebs zu ergänzen. Für Backups wird keine
              sofortige vollständige Entfernung zugesichert.
            </p>
            <p>
              Unter <Link href="/settings#account-data">Einstellungen → Ihre Daten</Link> können
              angemeldete Personen einen Export der hierfür bereitgestellten Kontodaten anfordern.
              Er enthält keine OAuth-Geheimnisse und keinen pauschalen Export fremder Teamdaten. Die
              technische Exportfunktion ersetzt nicht den vollständigen datenschutzrechtlichen
              Auskunftsanspruch.
            </p>
            <p>
              Die <Link href="/settings#account-delete">Kontolöschung</Link> verlangt eine
              Bestätigung. Zuvor müssen eigene Teams übertragen oder geschlossen und vorhandene
              Abonnements beendet beziehungsweise ausstehende Zahlungen und Checkout-Verknüpfungen
              geklärt sein. Die Prüfung kann bei nicht erreichbarem Zahlungsanbieter blockieren. Die
              Kontolöschung kündigt kein Abonnement automatisch und löscht keine eigenständigen
              Datenbestände bei Discord, Stripe oder Empfängern veröffentlichter Inhalte. Ein
              gesetzlicher Löschungsantrag kann unabhängig von diesen Bedienoberflächen gestellt
              werden; die gesetzlichen Voraussetzungen und Ausnahmen sind individuell zu prüfen.
            </p>
          </section>
          <section id="rights" aria-labelledby="rights-title">
            <h2 id="rights-title">Ihre Datenschutzrechte</h2>
            <p>
              Unter den jeweiligen gesetzlichen Voraussetzungen haben Sie Anspruch auf Auskunft,
              Berichtigung, Löschung, Einschränkung und Datenübertragbarkeit. Sie können einer
              Verarbeitung aufgrund berechtigter Interessen aus Gründen Ihrer besonderen Situation
              widersprechen; gegen Direktwerbung besteht ein eigenes Widerspruchsrecht. Eine
              Einwilligung können Sie für die Zukunft widerrufen, ohne dass dadurch die
              Rechtmäßigkeit der früheren Verarbeitung entfällt.
            </p>
            <p>
              Wenden Sie sich hierfür an den <a href="#operator">oben genannten Verantwortlichen</a>
              . Solange die Kontaktangabe fehlt, ist dieser Entwurf an diesem wesentlichen Punkt
              unvollständig. Die Bearbeitungsfristen richten sich nach Art. 12 DSGVO; grundsätzlich
              beträgt die Antwortfrist einen Monat, mit gesetzlich geregelten
              Verlängerungsmöglichkeiten. Identitätsnachweise dürfen nur soweit erforderlich
              verlangt werden.
            </p>
            <p>
              Sie können sich bei einer Datenschutzaufsichtsbehörde beschweren, insbesondere am Ort
              Ihres gewöhnlichen Aufenthalts, Arbeitsplatzes oder eines vermuteten Verstoßes. Eine
              bestimmte deutsche Landesbehörde wird hier mangels geklärtem Betreibersitz nicht als
              zuständig behauptet. Grundlage der Informations- und Betroffenenrechte ist die{" "}
              <a href="https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX%3A32016R0679">
                DSGVO
              </a>
              .
            </p>
          </section>
          <section id="terms" aria-labelledby="terms-title">
            <h2 id="terms-title">Nutzungsbedingungen – vorläufiger Stand</h2>
            <h3>Leistung und technische Voraussetzungen</h3>
            <p>
              Outpost bietet Informationen, Spielpreisbeobachtungen, Rechner, Build- und
              Kompositionswerkzeuge sowie optionale Konto- und Teamfunktionen für Albion Online.
              Ergebnisse hängen von Eingaben, Scanabdeckung, Annahmen und Spieländerungen ab. Sie
              sind keine garantierten Handelsangebote, Spielgewinne oder Zusage einer bestimmten
              Marktverfügbarkeit. Kontrollieren Sie Region, Zeitpunkt, Qualität, Gebühren und
              sonstige Annahmen vor einer Entscheidung im Spiel.
            </p>
            <p>
              Öffentliche Werkzeuge können ohne Anmeldung genutzt werden. Für Speicherung und
              Zusammenarbeit sind je nach Funktion ein Discord-Konto und ein Outpost-Konto
              erforderlich. Ein Browser mit den jeweils benötigten Speicher-/Skriptfunktionen und
              eine Verbindung zu beteiligten Diensten sind Voraussetzung. Es wird keine bestimmte
              ununterbrochene Verfügbarkeit oder Unterstützung jeder alten Browserfassung zugesagt;
              zwingende gesetzliche Leistungs- und Mängelrechte bleiben unberührt.
            </p>
            <h3>Konten, Beiträge und Zugriffsrechte</h3>
            <p>
              Verwenden Sie nur Konten und Inhalte, zu deren Nutzung Sie berechtigt sind. Teilen Sie
              keine fremden Zugangsdaten, personenbezogenen Daten ohne Rechtsgrundlage,
              rechtswidrigen Inhalte oder Inhalte, die Rechte Dritter verletzen. Manipulation von
              Berechtigungen, missbräuchliche automatisierte Abfragen und Angriffe auf den Dienst
              sind nicht vorgesehen. Öffentliche Beiträge bleiben mit ihrem Autor beziehungsweise
              ihrer Quelle verknüpft; Teamrollen bestimmen die jeweiligen Bearbeitungsrechte.
            </p>
            <p>
              Mit dem Einstellen fremder Werke dürfen keine weitergehenden Rechte behauptet werden,
              als tatsächlich vorliegen. Ein allgemeiner unwiderruflicher Rechteverzicht oder eine
              pauschale Übertragung aller Rechte wird durch diese Seite nicht erklärt. Konkrete
              Veröffentlichungs-/Nutzungsrechte für eigene Beiträge, Moderationsverfahren,
              Beschwerdewege und etwaige Einschränkungen sind vor endgültiger Einbeziehung dieser
              Nutzungsbedingungen noch verbindlich auszugestalten.
            </p>
            <h3>Verantwortung und gesetzliche Rechte</h3>
            <p>
              Für offizielle Spielregeln und Spieleinhalte ist der jeweilige Rechteinhaber
              verantwortlich. Verlinkte oder eingebundene Fremdinhalte können sich ändern. Diese
              Hinweise enthalten keinen vollständigen Haftungsausschluss: insbesondere Ansprüche
              wegen Vorsatz, grober Fahrlässigkeit, Verletzung von Leben, Körper oder Gesundheit und
              sonstige zwingende Rechte werden nicht ausgeschlossen. Eine abschließende, rechtlich
              geprüfte Haftungsregelung ist noch offen.
            </p>
            <p className={styles.open}>
              Offen bleiben insbesondere Anbieteridentität, Vertragsschluss und Einbeziehung, Umgang
              mit Minderjährigen, verbindlicher Leistungsumfang, Moderations-/Beschwerdeverfahren
              und gegebenenfalls Bedingungen kostenpflichtiger Leistungen. Keine rückwirkende
              Zustimmung oder automatische Vertragsänderung wird aus der bloßen Veröffentlichung
              dieses Entwurfs abgeleitet.
            </p>
          </section>
          <section id="payments" aria-labelledby="payments-title">
            <h2 id="payments-title">Supporter, Abonnements & Zahlungen</h2>
            <p>
              <strong>Technischer Stand dieser Umgebung:</strong>{" "}
              {configuredBilling
                ? "Eine Stripe-Anbindung ist konfiguriert. Das belegt keine rechtliche Freigabe des Angebots."
                : "Die Stripe-Abrechnung ist nicht vollständig konfiguriert. Die technische Oberfläche bietet dann kein eingerichtetes Kaufangebot."}
            </p>
            <p>
              Die vorhandene Integration ist für ein wiederkehrendes Supporter-Abonnement
              vorgesehen. Dazu gehören laut Produktdarstellung werbefreie Anzeigenplätze und die
              Möglichkeit, einen Team-Arbeitsbereich zu betreiben; Mitglieder können kostenlos
              beitreten. Aktuelle Eigenschaften und Verfügbarkeit sind auf der{" "}
              <Link href="/supporter">Supporter-Seite</Link> beschrieben. Derzeit sind Anzeigen für
              alle Nutzer deaktiviert; ein künftiger Werbeeinsatz ist ein gesonderter, oben
              beschriebener Freigabepunkt.
            </p>
            <p>
              Bei aktivierter Abrechnung werden Sie zum gehosteten Stripe Checkout weitergeleitet.
              Outpost übermittelt dazu die Kundenzuordnung und, soweit vorhanden, Name/E-Mail.
              Stripe meldet Zahlungen und Abonnementstatus serverseitig zurück. Ein Rücksprung mit
              einer Erfolgsmeldung allein schaltet keine bezahlte Berechtigung frei. Zahlungsdaten
              geben Sie auf der Stripe-Oberfläche ein. Welche Zahlungsmittel tatsächlich angeboten
              werden, hängt von der dortigen Konfiguration ab.
            </p>
            <p>
              Preis, Währung und Abrechnungsintervall werden technisch aus der hinterlegten
              Stripe-Preiskonfiguration gelesen. In diesem Entwurf wird kein fester Preis, keine
              Mindestlaufzeit, Kündigungsfrist, Steuerbehandlung oder Erstattungsregel erfunden.
              Gesamtpreis einschließlich anwendbarer Steuern, Kosten je Abrechnungsperiode,
              Laufzeit, Verlängerung, Fälligkeit und Leistungsbeginn müssen vor einer
              zahlungspflichtigen Bestellung klar feststehen. Eine bloße Verlinkung dieser Seite
              ersetzt nicht die gesetzlich erforderlichen Informationen und die eindeutige
              Bestellsituation.
            </p>
            <p>
              Ein eingerichtetes <Link href="/supporter">Kundenportal</Link> kann je nach
              Stripe-Einstellung Zahlungsmittel, Rechnungen und Kündigungen verwalten. Die
              Vertragspartei für die Outpost-Leistung bleibt der zu benennende Anbieter; Stripe ist
              nicht allein dadurch Verkäufer der Outpost-Leistung. Die bereitgestellte Integration
              enthält keinen Nachweis eines bestimmten, bereits freigegebenen
              Portal-Kündigungstermins oder aller gesetzlichen Verbraucherfunktionen.
            </p>
            <p className={styles.open}>
              Vor Verkaufsfreigabe offen: konkrete Anbieter-/Steuerdaten, Preis- und
              Vertragsinformationen, wirksame Einbeziehung der Bedingungen, Vertragsbestätigung auf
              dauerhaftem Datenträger, Widerrufsinformationen, technisch richtige Kündigungs- und
              Widerrufsfunktionen sowie ein Verfahren für Erstattungen und Beschwerden. Die
              gesetzlichen Rechte bei digitalen Produkten und Dienstleistungen bleiben unberührt.
            </p>
          </section>
          <section id="withdrawal" aria-labelledby="withdrawal-title">
            <h2 id="withdrawal-title">Widerruf & Kündigung unterscheiden</h2>
            <p>
              Der Widerruf eines Fernabsatzvertrags und die Kündigung eines laufenden Abonnements
              sind unterschiedliche Erklärungen. Kontolöschung ist weder das eine noch das andere.
              Bei einschlägigen Verbraucherverträgen besteht grundsätzlich ein 14-tägiges
              Widerrufsrecht; Beginn, Belehrung und mögliche Ausnahmen richten sich nach dem Gesetz.
              Eine fehlende oder falsche Belehrung kann den Fristbeginn beeinflussen.
            </p>
            <p>
              Für Dienstleistungen erlischt ein bestehendes Widerrufsrecht nicht allein deshalb
              sofort, weil ein Zugang freigeschaltet wurde. Die Voraussetzungen unterscheiden sich
              von denen für nicht auf einem Datenträger gelieferte digitale Inhalte. Ein vorzeitiger
              Leistungsbeginn, gegebenenfalls Wertersatz und ein mögliches Erlöschen erfordern die
              jeweils gesetzlich vorgesehenen Informationen und ausdrücklichen Erklärungen. Die
              vorhandene Checkout-Implementierung weist hierfür keine abgeschlossene Erfassungs- und
              Nachweiskette aus; eine pauschale Regel „keine Rückerstattung“ wird nicht festgelegt.
            </p>
            <p>
              Für ein entsprechendes entgeltliches Online-Dauerschuldverhältnis ist insbesondere die
              Kündigungsfunktion nach{" "}
              <a href="https://www.gesetze-im-internet.de/bgb/__312k.html">§ 312k BGB</a> zu prüfen.
              Daneben ist seit 19. Juni 2026 die elektronische Widerrufsfunktion nach{" "}
              <a href="https://www.gesetze-im-internet.de/bgb/__356a.html">§ 356a BGB</a> relevant.
              Ein lediglich nach Anmeldung erreichbares Zahlungsportal ist nicht ohne weitere
              Prüfung als Erfüllung aller Anforderungen anzusehen.
            </p>
            <p className={styles.open}>
              Noch nicht bereitgestellt: endgültige Widerrufsbelehrung mit richtigem Empfänger,
              Muster-Widerrufsformular, freigegebene öffentliche Kündigungs-/Bestätigungsstrecke und
              erforderliche elektronische Widerrufs-/Bestätigungsfunktion. Die Links in diesem
              Absatz sind Gesetzesquellen und keine funktionsfähigen Kündigungs- oder
              Widerrufsbuttons.
            </p>
            <p>
              Eine eindeutige Widerrufs- oder Kündigungserklärung ist an den{" "}
              <a href="#operator">Anbieter</a> zu richten. Der Kontakt ist vor einer entsprechenden
              Vertragsfreigabe einzutragen. Für die Ausgestaltung sind insbesondere{" "}
              <a href="https://www.gesetze-im-internet.de/bgb/__355.html">§ 355 BGB</a>,{" "}
              <a href="https://www.gesetze-im-internet.de/bgb/__356.html">§ 356 BGB</a>,{" "}
              <a href="https://www.gesetze-im-internet.de/bgb/__357a.html">§ 357a BGB</a>,{" "}
              <a href="https://www.gesetze-im-internet.de/bgb/__312j.html">§ 312j BGB</a> und{" "}
              <a href="https://www.gesetze-im-internet.de/bgbeg/art_246a__1.html">
                Art. 246a § 1 EGBGB
              </a>{" "}
              heranzuziehen. Eine etwaige Teilnahme an Verbraucherschlichtung und Informationen nach{" "}
              <a href="https://www.gesetze-im-internet.de/vsbg/__36.html">§ 36 VSBG</a> sind noch
              festzulegen; eine zuständige Stelle wird nicht erfunden.
            </p>
          </section>
          <section id="data-sources" aria-labelledby="data-title">
            <h2 id="data-title">Datenquellen & Aussagekraft</h2>
            <p>
              Marktpreise beruhen auf Beobachtungen des{" "}
              <a href="https://www.albion-online-data.com/api/">Albion Online Data Project</a>. Eine
              Beobachtung ist kein garantiert ausführbares Angebot. Fehlende oder veraltete Preise,
              Region, Qualitätsstufe und Berechnungsannahmen beeinflussen das Ergebnis. Build- und
              Guide-Inhalte behalten ihre gekennzeichneten Community-Quellen und Autoren; prüfen Sie
              Datum und aktuellen Spielstand. Die Anzeige hier verleiht keine Rechte an fremden
              Quellen.
            </p>
          </section>
          <section id="scene-artwork" aria-labelledby="art-title">
            <h2 id="art-title">Teilweise KI-generierte Bilder</h2>
            <p>
              Ein Teil der eigens für Outpost gestalteten Hintergrund-, Szenen- und
              Kartenillustrationen wurde mit generativer KI erstellt oder bearbeitet. Dazu zählen
              dekorative Fantasy-Umgebungen und das Supporter-Motiv. Diese Bilder werden tatsächlich
              im aktuellen Auftritt verwendet. Sie sind keine offiziellen Spiel-Screenshots, keine
              von Sandbox bestätigten Ausrüstungsdarstellungen und kein Nachweis einer realen
              Spielsituation.
            </p>
            <p>
              Gegenstands- und Fähigkeitsbilder aus dem Spiel sind davon zu unterscheiden und
              behalten ihre eigenen Quellen und Rechte. Die KI-Illustrationen ersetzen keine
              geprüften Item-IDs, Rezepte, Preise oder Spielmechaniken. Aus dieser Offenlegung folgt
              weder, dass jedes Bild KI-generiert ist, noch dass alle Medien frei weiterverwendet
              werden dürfen.
            </p>
            <p>
              Die Transparenzpflichten aus Art. 50 der EU-KI-Verordnung hängen unter anderem von
              Anbieter-/Betreiberrolle, Art des Systems und Art des Inhalts ab. Ein allgemeiner
              Hinweis ist kein Nachweis der Erfüllung sämtlicher Kennzeichnungs- oder
              Rechtepflichten. Maßgeblich sind die{" "}
              <a href="https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-50">
                amtliche Darstellung von Art. 50
              </a>{" "}
              und die{" "}
              <a href="https://digital-strategy.ec.europa.eu/en/policies/guidelines-ai-transparency-obligations">
                Leitlinien der Europäischen Kommission
              </a>
              ; betroffene konkrete Medien und Metadaten sind gesondert zu prüfen.
            </p>
          </section>
          <section id="media" aria-labelledby="media-title">
            <h2 id="media-title">Schriften, Medien & Rechte</h2>
            <p>
              Barlow Condensed, Inter und Geist Mono werden selbst gehostet. Für diese
              Schriftdateien wird keine Verbindung zu einem externen Fontanbieter benötigt. Die
              SIL-OFL-Lizenztexte sind verfügbar für{" "}
              <a href="/licenses/barlow-condensed-OFL.txt">Barlow Condensed</a>,{" "}
              <a href="/licenses/inter-OFL.txt">Inter</a> und{" "}
              <a href="/licenses/geist-mono-OFL.txt">Geist Mono</a>. Andere eingebundene Medien
              können, wie oben beschrieben, externe Abrufe auslösen.
            </p>
            <p>
              Albion Online und zugehörige Marken, Gegenstands- und Spielgrafiken gehören ihren
              jeweiligen Rechteinhabern. Community-Beiträge und Illustrationen können gesonderten
              Nutzungsrechten unterliegen. Die Verfügbarkeit auf dieser Website ist keine pauschale
              Lizenz für Weiterveröffentlichung. Hinweise auf mögliche Rechtsverletzungen richten
              Sie bitte an den im Impressum zu ergänzenden Kontakt und benennen Sie die betroffene
              URL sowie den beanstandeten Inhalt.
            </p>
          </section>
        </article>
      </div>
    </div>
  );
}
