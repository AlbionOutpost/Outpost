import type { ReactNode } from "react";
import Link from "@/components/link";
import styles from "./legal.module.css";

export type LegalLocale = "en" | "de";
export type LegalOperator = { name?: string; address?: string; email?: string };
export type LegalCopy = {
  title: string;
  description: string;
  updated: string;
  draftTitle: string;
  draftBody: string;
  contentsLabel: string;
  contentsAria: string;
  sections: { id: string; title: string; body: ReactNode }[];
};

/** Faithful bilingual draft; translation does not establish legal approval or activate services. */
export function legalCopy(
  locale: LegalLocale,
  operator: LegalOperator,
  configuredBilling: boolean,
): LegalCopy {
  return locale === "de"
    ? germanCopy(operator, configuredBilling)
    : englishCopy(operator, configuredBilling);
}

function germanCopy(operator: LegalOperator, configuredBilling: boolean): LegalCopy {
  return {
    title: "Rechtliches bei Outpost",
    description:
      "Wer hinter dem Projekt steht, welche Daten verarbeitet werden und was für die Nutzung gilt.",
    updated: "Dokumentstand: 4. November 2026 · Deutsche Fassung",
    draftTitle: "Entwurf: Betreiberangaben und rechtliche Freigabe noch offen.",
    draftBody:
      "Diese Seite legt den geprüften Funktionsstand offen. Gekennzeichnete offene Angaben sind keine vollständige Anbieterkennzeichnung. Vor einem kostenpflichtigen Angebot müssen Betreiber, Vertragstexte und Verbraucherfunktionen vervollständigt und geprüft werden. Diese Veröffentlichung bestätigt keine rechtliche Konformität.",
    contentsLabel: "Auf dieser Seite",
    contentsAria: "Rechtliche Themen",
    sections: [
      {
        id: "operator",
        title: "Impressum & Kontakt",
        body: (
          <>
            <p>
              Outpost ist ein unabhängiges Community-Projekt zu Albion Online. Es besteht keine
              Verbindung zu oder Empfehlung durch Sandbox Interactive. „Outpost“ ist eine
              Projektbezeichnung und ersetzt nicht die Identität des verantwortlichen Anbieters.
            </p>
            <dl className={styles.details}>
              <dt>Anbieter / Verantwortlicher</dt>
              <dd>
                {operator.name || <span className={styles.open}>Vollständiger Name fehlt</span>}
              </dd>
              <dt>Ladungsfähige Anschrift</dt>
              <dd>{operator.address || <span className={styles.open}>Anschrift fehlt</span>}</dd>
              <dt>E-Mail / Kontakt</dt>
              <dd>
                {operator.email ? (
                  <a href={`mailto:${operator.email}`}>{operator.email}</a>
                ) : (
                  <span className={styles.open}>Kontakt-E-Mail fehlt</span>
                )}
              </dd>
              <dt>Register / Kennnummern</dt>
              <dd className={styles.open}>Anwendbarkeit offen</dd>
              <dt>Weitere Pflichtangaben</dt>
              <dd className={styles.open}>Prüfung offen</dd>
            </dl>
            <p>
              Zu ergänzen sind der vollständige Name, gegebenenfalls Rechtsform und
              Vertretungsberechtigte, eine ladungsfähige Anschrift mit Straße, Hausnummer,
              Postleitzahl, Ort und Staat sowie eine erreichbare Kontakt-E-Mail und gegebenenfalls
              ein weiterer unmittelbarer Kontaktweg. Register und Registernummer, Umsatzsteuer- oder
              Wirtschafts-Identifikationsnummer sind nur anzugeben, soweit vorhanden und
              erforderlich; die Anwendbarkeit ist noch ungeklärt. Berufsrechtliche Angaben,
              zuständige Zulassungsbehörde und journalistisch-redaktionelle Verantwortlichkeit sind
              zu prüfen, soweit einschlägig.
            </p>
            <p>
              Die Gewerbe- beziehungsweise Unternehmensorganisation ist noch nicht abschließend
              eingerichtet. Das beseitigt mögliche Informationspflichten für einen bereits
              betriebenen Dienst nicht. Maßgeblich sind die tatsächliche Tätigkeit und unter anderem{" "}
              <a href="https://www.gesetze-im-internet.de/ddg/__5.html">§ 5 DDG</a>.
            </p>
          </>
        ),
      },
      {
        id: "privacy",
        title: "Datenschutz & Verarbeitungszwecke",
        body: (
          <>
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
              Aktualisierungszeit gehören zum Profil. Die öffentliche Kontenzahl zählt registrierte
              Konten; daraus werden keine Besuchszahlen oder aktuell angemeldeten Spieler
              abgeleitet.
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
          </>
        ),
      },
      {
        id: "cookies",
        title: "Cookies & Gerätespeicher",
        body: (
          <>
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
          </>
        ),
      },
      {
        id: "providers",
        title: "Empfänger & internationale Übermittlungen",
        body: (
          <>
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
          </>
        ),
      },
      {
        id: "retention",
        title: "Speicherdauer, Export & Löschung",
        body: (
          <>
            <p>
              Administratoren können befristete oder widerrufliche Supporter-Geschenke und
              Discord-Kontosperren verwalten. Dabei speichern wir die zugehörigen Konto- oder
              Discord-Kennungen, Beginn und gegebenenfalls Ablauf sowie den Grund und die handelnde
              Administration in einem Zugriffsprotokoll. Geschenke ändern keine Stripe-Abonnements.
              Aktive Sperren widerrufen Sitzungen und verhindern weitere Anmeldungen. Sperrkennungen
              und minimale Administrationsprotokolle werden zur Missbrauchsabwehr getrennt von
              löschbaren Profilen aufbewahrt; die konkreten, erforderlichen Aufbewahrungsfristen
              sind noch vom Betreiber festzulegen.
            </p>
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
          </>
        ),
      },
      {
        id: "rights",
        title: "Ihre Datenschutzrechte",
        body: (
          <>
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
          </>
        ),
      },
      {
        id: "terms",
        title: "Nutzungsbedingungen – vorläufiger Stand",
        body: (
          <>
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
          </>
        ),
      },
      {
        id: "payments",
        title: "Supporter, Abonnements & Zahlungen",
        body: (
          <>
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
          </>
        ),
      },
      {
        id: "withdrawal",
        title: "Widerruf & Kündigung unterscheiden",
        body: (
          <>
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
          </>
        ),
      },
      {
        id: "data-sources",
        title: "Datenquellen & Aussagekraft",
        body: (
          <>
            <p>
              Marktpreise beruhen auf Beobachtungen des{" "}
              <a href="https://www.albion-online-data.com/api/">Albion Online Data Project</a>. Eine
              Beobachtung ist kein garantiert ausführbares Angebot. Fehlende oder veraltete Preise,
              Region, Qualitätsstufe und Berechnungsannahmen beeinflussen das Ergebnis. Build- und
              Guide-Inhalte behalten ihre gekennzeichneten Community-Quellen und Autoren; prüfen Sie
              Datum und aktuellen Spielstand. Die Anzeige hier verleiht keine Rechte an fremden
              Quellen.
            </p>
          </>
        ),
      },
      {
        id: "scene-artwork",
        title: "Teilweise KI-generierte Bilder",
        body: (
          <>
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
          </>
        ),
      },
      {
        id: "media",
        title: "Schriften, Medien & Rechte",
        body: (
          <>
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
          </>
        ),
      },
    ],
  };
}

function englishCopy(operator: LegalOperator, configuredBilling: boolean): LegalCopy {
  return {
    title: "Legal information at Outpost",
    description:
      "Who runs the project, how data is processed and which rules apply when you use it.",
    updated: "Document updated: 4 November 2026 · English version",
    draftTitle: "Draft: operator details and legal approval are still pending.",
    draftBody:
      "This page describes the reviewed functionality. Marked missing information does not constitute a complete provider notice. Before any paid offer, the operator details, contract documents and consumer features must be completed and reviewed. Publishing this page does not confirm legal compliance.",
    contentsLabel: "On this page",
    contentsAria: "Legal topics",
    sections: [
      {
        id: "operator",
        title: "Provider details & contact",
        body: (
          <>
            <p>
              Outpost is an independent community project for Albion Online. It is not affiliated
              with or endorsed by Sandbox Interactive. “Outpost” is a project name and does not
              replace the identity of the responsible provider.
            </p>
            <dl className={styles.details}>
              <dt>Provider / data controller</dt>
              <dd>{operator.name || <span className={styles.open}>Full name pending</span>}</dd>
              <dt>Address for legal service</dt>
              <dd>{operator.address || <span className={styles.open}>Address pending</span>}</dd>
              <dt>Email / contact</dt>
              <dd>
                {operator.email ? (
                  <a href={`mailto:${operator.email}`}>{operator.email}</a>
                ) : (
                  <span className={styles.open}>Contact email pending</span>
                )}
              </dd>
              <dt>Registers / identification numbers</dt>
              <dd className={styles.open}>Applicability under review</dd>
              <dt>Other required information</dt>
              <dd className={styles.open}>Review pending</dd>
            </dl>
            <p>
              The full name and, where applicable, legal form and authorised representatives must be
              supplied, together with an address for legal service including street, house number,
              postcode, town/city and country, an accessible contact email and, where applicable,
              another direct means of contact. Register and registration numbers, VAT or business
              identification numbers must be stated only where they exist and are required; their
              applicability has not yet been determined. Professional rules, the competent licensing
              authority and responsibility for journalistic or editorial content must be assessed
              where relevant.
            </p>
            <p>
              The business or company organisation has not yet been fully established. This does not
              remove possible information duties for a service that is already operating. The actual
              activity and, among other provisions,{" "}
              <a href="https://www.gesetze-im-internet.de/ddg/__5.html">section 5 DDG</a> are
              relevant.
            </p>
          </>
        ),
      },
      {
        id: "privacy",
        title: "Privacy & processing purposes",
        body: (
          <>
            <p>
              The provider to be identified above is the data controller. Whether a data protection
              officer is required and, if so, their contact details still need to be assessed. The
              following overview describes the existing code; operator decisions on legal bases,
              balancing of interests, processing agreements and retention periods remain explicitly
              unresolved.
            </p>
            <h3>Visiting and protecting the service</h3>
            <p>
              Page and API requests involve the processing of technically necessary connection data,
              particularly IP address, time, requested URL, HTTP status and browser information.
              Cloudflare delivers the website and processes corresponding network and security data.
              Application safeguards limit requests by network or account context. Error and
              operational logs may contain technical events; the precise log fields and deletion
              periods of the services in use still need to be fully documented.
            </p>
            <h3>Discord sign-in and profile</h3>
            <p>
              Public tools generally do not require an account. If you choose Discord sign-in, the
              “identify” and “email” permissions are requested. Outpost processes your Discord ID,
              display name, profile image and, where supplied by Discord, email address, as well as
              account linkage and session information. The account data structure provides for OAuth
              access and refresh tokens; where Discord supplies them, they are processed on the
              server. Your Discord password is not sent to Outpost. This does not request private
              Discord messages or complete server lists.
            </p>
            <p>
              Optional details such as your Albion character name and region, along with creation
              and update timestamps, form part of your profile. The public account count measures
              registered accounts, not website visits or players currently online.
            </p>
            <h3>Saved content and collaboration</h3>
            <p>
              Depending on the features used, Outpost stores builds, equipment and versions,
              compositions, scenarios, favourites, reactions, comments and revisions, reports,
              market watchlists and timers. Teams additionally involve membership, roles,
              invitations, announcements, events, responses and shared build and loot data. Other
              visitors can read content released as public. Team-related content is shown according
              to the applicable access rights; do not publish unnecessary personal data about other
              people there.
            </p>
            <h3>Purposes and intended legal bases</h3>
            <p>
              Article 6(1)(b) GDPR may apply to requested account, storage and contractual features,
              point (c) to necessary statutory duties and point (f) to proportionate operation,
              abuse prevention and error analysis. The controller must identify the specific
              legitimate interests and carry out the corresponding balancing assessment.
              Non-essential advertising or tracking requires the applicable consent. The controller
              must confirm this allocation before approval; this page does not replace that
              assessment with blanket consent.
            </p>
            <p>
              We receive data from you, from Discord when you sign in and, when you view other
              people’s content, from their published contributions or the public game and community
              sources identified here. Where personal data is not collected directly from the
              individuals concerned, the information duties under Article 14 GDPR must also be
              assessed. No automated decision producing legal or similarly significant effects under
              Article 22 GDPR is intended; technically sorting game prices is not a credit
              assessment.
            </p>
          </>
        ),
      },
      {
        id: "cookies",
        title: "Cookies & device storage",
        body: (
          <>
            <p>
              Cookies and localStorage are different forms of storage.{" "}
              <a href="https://www.gesetze-im-internet.de/ttdsg/__25.html">Section 25 TDDDG</a>{" "}
              generally covers storing or accessing information on your device. Whether an exception
              applies to an explicitly requested, strictly necessary feature must be assessed for
              each purpose; “first party” alone does not make storage access exempt from consent.
            </p>
            <div
              className={styles.tableScroll}
              role="region"
              aria-label="Cookies and local storage features"
              tabIndex={0}
            >
              <table>
                <thead>
                  <tr>
                    <th>Storage / purpose</th>
                    <th>Technically configured duration</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>NextAuth session: keeping you signed in</td>
                    <td>14 days on the server; an ongoing sign-in can be renewed</td>
                    <td>Session cookie, with security attributes over HTTPS</td>
                  </tr>
                  <tr>
                    <td>OAuth protection: state and PKCE</td>
                    <td>15 minutes in the authentication module used</td>
                    <td>
                      Only for the sign-in flow; further CSRF/callback cookies follow session or
                      library settings
                    </td>
                  </tr>
                  <tr>
                    <td>outpost-route: technical assignment of page requests</td>
                    <td>30 minutes</td>
                    <td>Signed; does not grant sign-in authorisation</td>
                  </tr>
                  <tr>
                    <td>atlas-theme and atlas-region: selected appearance / game region</td>
                    <td>Up to 365 days</td>
                    <td>Set through the corresponding user selection; removable in the browser</td>
                  </tr>
                  <tr>
                    <td>
                      localStorage: guest builds, collections, filters, shopping lists,
                      specialisations, checklists, maps and tool shortcuts
                    </td>
                    <td>No uniform automatic expiry period in the code</td>
                    <td>
                      Stored on this device; removable by clearing website data. Only an explicitly
                      used save/synchronisation feature can transfer data to the server.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Clearing local website data also removes locally saved drafts and preferences. It does
              not automatically delete the server account or a subscription. Browsers may also
              remove stored data themselves.
            </p>
            <h3>Advertising is currently disabled</h3>
            <p>
              This version does not embed AdSense advertising scripts, ad placements or ad requests.
              This also applies when a publisher ID has been configured. A Google
              account-verification meta tag, if output, only identifies the publisher association
              and does not itself load a Google script. It is neither evidence of consent nor
              permission for tracking.
            </p>
            <p>
              A complete consent manager with withdrawal controls has not yet been established.
              Advertising therefore remains disabled. Before any future activation, the required
              consent and its withdrawal, provider/partner information, data transfers and the
              behaviour for Supporters must be technically and legally reviewed. A configured ID or
              merely using the website is not treated as consent.
            </p>
            <p>
              If advertising is subsequently approved, Google and, where applicable, advertising
              partners may process cookies, device identifiers and visit data for delivery,
              measurement and, with the corresponding consent, personalisation. The actual
              recipients and retention periods would need to be added beforehand. This page does not
              itself obtain advertising consent.
            </p>
            <p>
              Google explains its{" "}
              <a href="https://support.google.com/adsense/answer/13554116?hl=de">
                requirements for consent platforms in the EEA, United Kingdom and Switzerland
              </a>{" "}
              and{" "}
              <a href="https://support.google.com/adsense/answer/1348695?hl=de">
                advertising cookies
              </a>
              . Any future consent must be freely given, informed and withdrawable; rejection cannot
              be replaced by mere continued use. Additional analytics products such as Google
              Analytics are not embedded in the reviewed application code; this does not verify
              possible settings outside the repository.
            </p>
          </>
        ),
      },
      {
        id: "providers",
        title: "Recipients & international transfers",
        body: (
          <>
            <ul>
              <li>
                <strong>Cloudflare:</strong> delivery and protection through Workers, public
                catalog/content data in D1, and account/collaboration data in SQLite-based Durable
                Objects. Depending on configuration, Turnstile is also used for community
                contributions; Cloudflare then receives technical device/connection data and
                verifies a token.{" "}
                <a href="https://www.cloudflare.com/privacypolicy/">Cloudflare privacy policy</a>,{" "}
                <a href="https://www.cloudflare.com/cloudflare-customer-dpa/">
                  data processing terms
                </a>
                .
              </li>
              <li>
                <strong>Discord:</strong> an independent service for optional sign-in. The{" "}
                <a href="https://discord.com/privacy">Discord privacy policy</a> also applies. The
                scope of sign-in is described in the{" "}
                <a href="https://docs.discord.com/developers/topics/oauth2">OAuth documentation</a>.
              </li>
              <li>
                <strong>Sandbox Interactive / Albion renderer:</strong> some item images load
                directly from render.albiononline.com. That server therefore receives connection
                data required to retrieve the image, including your IP address. An Outpost image
                proxy may be used if errors occur. An external image request is not a purely local
                image.
              </li>
              <li>
                <strong>Albion Online Data Project and public content sources:</strong> Outpost
                retrieves game prices predominantly on the server. Server and browser requests must
                be distinguished; external links and individual embedded media may create direct
                connections.
              </li>
              <li>
                <strong>Stripe, if payments are established:</strong> hosted Checkout and customer
                portal, name/email and an internal customer reference, payment and subscription
                transactions. Outpost processes association IDs, status, expiry/renewal information
                and webhook events, not input fields for complete card or bank details. Stripe
                processes payment data on its own interfaces, acting as a processor and/or an
                independent controller depending on the transaction.{" "}
                <a href="https://stripe.com/privacy">Stripe privacy policy</a>,{" "}
                <a href="https://stripe.com/legal/dpa">DPA</a>.
              </li>
              <li>
                <strong>Google / advertising partners, if AdSense is loaded:</strong> see the
                advertising section. Recipients, specific partners and consent states must be
                documented against the actual configuration before use.
              </li>
            </ul>
            <p className={styles.open}>
              Still unresolved: the precise contracting provider entities, data processing
              agreements, subprocessors, actual storage locations and third-country safeguards.
              Storage exclusively in Germany or Europe is not promised.
            </p>
            <p>
              Processing outside the EEA must meet the requirements of Article 44 onwards GDPR, such
              as an applicable adequacy decision or appropriate safeguards including any necessary
              supplementary measures. Without a specific review, we do not claim that all recipients
              participate in the EU–US Data Privacy Framework or that particular standard
              contractual clauses have been executed. The controller must add the relevant grounds
              and information on obtaining a copy of the safeguards.
            </p>
          </>
        ),
      },
      {
        id: "retention",
        title: "Retention, export & deletion",
        body: (
          <>
            <p>
              Administrators can manage time-limited or revocable Supporter gifts and Discord
              account bans. We record the related account or Discord identifiers, start and optional
              expiry, reason and administrator in an access audit trail. Gifts do not change Stripe
              subscriptions. Active bans revoke sessions and prevent new sign-ins. Ban identifiers
              and minimal administrative audit records are retained separately from deletable
              profiles for abuse prevention; the operator still needs to define the necessary
              retention periods.
            </p>
            <p>
              Server-side account content is generally stored for the features used until it is
              deleted or its purpose ceases. A complete approved retention schedule for accounts,
              revisions, moderation, operational logs, backups and billing records is not yet
              available. Statutory retention duties may require certain data to be kept longer;
              specific categories and periods must be added once operations are established.
              Immediate complete removal from backups is not promised.
            </p>
            <p>
              Signed-in users can request an export of the account data provided for this purpose
              under <Link href="/settings#account-data">Settings → Your data</Link>. It contains no
              OAuth secrets and is not a blanket export of other people’s Team data. The technical
              export feature does not replace the full statutory right of access to personal data.
            </p>
            <p>
              <Link href="/settings#account-delete">Account deletion</Link> requires confirmation.
              Beforehand, Teams you own must be transferred or closed, and existing subscriptions
              must be ended or outstanding payments and Checkout associations resolved. The check
              may block deletion if the payment provider cannot be reached. Deleting an account does
              not automatically cancel a subscription or delete independent data held by Discord,
              Stripe or recipients of published content. A statutory erasure request can be made
              independently of these interfaces; the legal conditions and exceptions must be
              assessed individually.
            </p>
          </>
        ),
      },
      {
        id: "rights",
        title: "Your data protection rights",
        body: (
          <>
            <p>
              Subject to the applicable legal conditions, you have rights of access, rectification,
              erasure, restriction and data portability. You may object to processing based on
              legitimate interests for reasons relating to your particular situation; a separate
              right to object applies to direct marketing. You may withdraw consent for the future
              without affecting the lawfulness of earlier processing.
            </p>
            <p>
              Contact the <a href="#operator">controller identified above</a> to exercise these
              rights. Until contact information has been supplied, this draft remains incomplete in
              this essential respect. Response periods follow Article 12 GDPR; the response period
              is generally one month, with extensions permitted by law. Proof of identity may be
              requested only to the extent necessary.
            </p>
            <p>
              You may lodge a complaint with a data protection supervisory authority, particularly
              in the place of your habitual residence, workplace or a suspected infringement. No
              specific German state authority is stated to be competent because the operator’s place
              of establishment has not yet been determined. The{" "}
              <a href="https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX%3A32016R0679">
                GDPR
              </a>{" "}
              is the basis for these information and data-subject rights.
            </p>
          </>
        ),
      },
      {
        id: "terms",
        title: "Terms of use — draft",
        body: (
          <>
            <h3>Service and technical requirements</h3>
            <p>
              Outpost provides information, game-price observations, calculators, build and
              composition tools, and optional account and Team features for Albion Online. Results
              depend on inputs, scan coverage, assumptions and game changes. They are not guaranteed
              executable offers, in-game profits or assurances of specific market availability.
              Check region, timestamp, quality, fees and other assumptions before making an in-game
              decision.
            </p>
            <p>
              Public tools can be used without signing in. Depending on the feature, storage and
              collaboration require a Discord account and an Outpost account. A browser with the
              necessary storage/script capabilities and a connection to participating services are
              required. No specific uninterrupted availability or support for every old browser
              version is promised; mandatory statutory performance and defect rights remain
              unaffected.
            </p>
            <h3>Accounts, contributions and access rights</h3>
            <p>
              Use only accounts and content you are authorised to use. Do not share other people’s
              credentials, personal data without a legal basis, unlawful content or content that
              infringes third-party rights. Manipulating permissions, abusive automated requests and
              attacks on the service are not intended uses. Public contributions remain linked to
              their author or source; Team roles determine the corresponding editing permissions.
            </p>
            <p>
              Uploading third-party works must not assert broader rights than actually exist. This
              page does not declare a general irrevocable waiver or blanket transfer of all rights.
              Specific publication/usage rights for your contributions, moderation procedures,
              complaint channels and any restrictions still need to be established before these
              terms are finally incorporated.
            </p>
            <h3>Responsibility and statutory rights</h3>
            <p>
              The respective rights holder is responsible for official game rules and game content.
              Linked or embedded third-party content can change. These notices do not constitute a
              complete exclusion of liability: in particular, claims involving intent, gross
              negligence, injury to life, body or health and other mandatory rights are not
              excluded. A final legally reviewed liability provision is still pending.
            </p>
            <p className={styles.open}>
              Matters still unresolved include provider identity, contract formation and
              incorporation of terms, treatment of minors, binding service scope,
              moderation/complaint procedures and any terms for paid services. Mere publication of
              this draft is not treated as retrospective consent or an automatic contract change.
            </p>
          </>
        ),
      },
      {
        id: "payments",
        title: "Supporter, subscriptions & payments",
        body: (
          <>
            <p>
              <strong>Technical status in this environment:</strong>{" "}
              {configuredBilling
                ? "A Stripe integration is configured. This does not establish legal approval of the offer."
                : "Stripe billing is not fully configured. In this state, the technical interface does not provide an established purchase offer."}
            </p>
            <p>
              The existing integration is intended for a recurring Supporter subscription. According
              to the product description, this includes ad-free placements and the ability to run a
              Team workspace; members can join for free. Current features and availability are
              described on the <Link href="/supporter">Supporter page</Link>. Advertising is
              currently disabled for everyone; any future advertising use is a separate approval
              point described above.
            </p>
            <p>
              When billing is activated, you are redirected to hosted Stripe Checkout. Outpost sends
              the customer association and, where available, name/email. Stripe reports payments and
              subscription status back to the server. Returning with a success message alone does
              not activate paid entitlement. Payment details are entered on Stripe’s interface. The
              payment methods actually offered depend on its configuration.
            </p>
            <p>
              Price, currency and billing interval are technically read from the configured Stripe
              price. This draft does not invent a fixed price, minimum term, notice period, tax
              treatment or refund policy. The total price including applicable taxes, costs per
              billing period, term, renewal, due date and start of service must be clear before a
              paid order. Merely linking this page does not replace the legally required information
              and an unambiguous ordering process.
            </p>
            <p>
              A configured <Link href="/supporter">customer portal</Link> may manage payment
              methods, invoices and cancellations depending on Stripe settings. The provider to be
              identified remains the contracting party for the Outpost service; Stripe does not
              become its seller merely by processing payment. The supplied integration does not
              establish a specific, already approved portal cancellation date or all statutory
              consumer features.
            </p>
            <p className={styles.open}>
              Before sales approval, the following remain unresolved: specific provider/tax details,
              price and contract information, effective incorporation of terms, contractual
              confirmation on a durable medium, withdrawal information, technically correct
              cancellation and withdrawal features, and a procedure for refunds and complaints.
              Statutory rights for digital products and services remain unaffected.
            </p>
          </>
        ),
      },
      {
        id: "withdrawal",
        title: "Withdrawal & subscription cancellation",
        body: (
          <>
            <p>
              Withdrawing from a distance contract and cancelling an ongoing subscription are
              different declarations. Account deletion is neither. For applicable consumer
              contracts, a 14-day right of withdrawal generally exists; its start, required
              information and possible exceptions are governed by law. Missing or incorrect
              information can affect when the period begins.
            </p>
            <p>
              For services, an existing right of withdrawal does not immediately expire merely
              because access was activated. The conditions differ from those for digital content not
              supplied on a physical medium. An early start of performance, any compensation for
              value and possible expiry require the information and express declarations prescribed
              by the applicable law. The current Checkout implementation does not establish a
              complete collection and evidence chain for this; no blanket “no refunds” rule is set.
            </p>
            <p>
              For a relevant paid ongoing online contract, the cancellation feature under{" "}
              <a href="https://www.gesetze-im-internet.de/bgb/__312k.html">section 312k BGB</a> must
              in particular be assessed. The electronic withdrawal feature under{" "}
              <a href="https://www.gesetze-im-internet.de/bgb/__356a.html">section 356a BGB</a> has
              also been relevant since 19 June 2026. A payment portal reachable only after sign-in
              must not be treated as meeting all requirements without further assessment.
            </p>
            <p className={styles.open}>
              Not yet provided: final withdrawal information naming the correct recipient, a model
              withdrawal form, an approved public cancellation/confirmation flow and the required
              electronic withdrawal/confirmation feature. The links in this paragraph are legal
              sources, not functioning cancellation or withdrawal buttons.
            </p>
            <p>
              An unambiguous withdrawal or cancellation declaration must be addressed to the{" "}
              <a href="#operator">provider</a>. Contact details must be entered before the
              corresponding contract is approved. The relevant provisions include{" "}
              <a href="https://www.gesetze-im-internet.de/bgb/__355.html">section 355 BGB</a>,{" "}
              <a href="https://www.gesetze-im-internet.de/bgb/__356.html">section 356 BGB</a>,{" "}
              <a href="https://www.gesetze-im-internet.de/bgb/__357a.html">section 357a BGB</a>,{" "}
              <a href="https://www.gesetze-im-internet.de/bgb/__312j.html">section 312j BGB</a> and{" "}
              <a href="https://www.gesetze-im-internet.de/bgbeg/art_246a__1.html">
                Article 246a section 1 EGBGB
              </a>
              . Any participation in consumer dispute resolution and information under{" "}
              <a href="https://www.gesetze-im-internet.de/vsbg/__36.html">section 36 VSBG</a> still
              need to be determined; no competent body is invented here.
            </p>
          </>
        ),
      },
      {
        id: "data-sources",
        title: "Data sources & reliability",
        body: (
          <>
            <p>
              Market prices are based on observations from the{" "}
              <a href="https://www.albion-online-data.com/api/">Albion Online Data Project</a>. An
              observation is not a guaranteed executable offer. Missing or stale prices, region,
              quality level and calculation assumptions affect the result. Build and guide content
              retain their identified community sources and authors; check the date and current
              state of the game. Displaying content here does not grant rights to third-party
              sources.
            </p>
          </>
        ),
      },
      {
        id: "scene-artwork",
        title: "Partly AI-generated images",
        body: (
          <>
            <p>
              Some background, scene and card illustrations created specifically for Outpost were
              made or edited with generative AI. These include decorative fantasy environments and
              the Supporter scene. These images are actually used in the current website. They are
              not official game screenshots, equipment depictions approved by Sandbox or evidence of
              a real gameplay situation.
            </p>
            <p>
              In-game item and ability images are separate and retain their own sources and rights.
              AI illustrations do not replace verified item IDs, recipes, prices or game mechanics.
              This disclosure does not mean that every image is AI-generated or that all media may
              be freely reused.
            </p>
            <p>
              The transparency duties under Article 50 of the EU AI Act depend, among other things,
              on the provider/deployer role, system type and content type. A general notice does not
              prove that all labelling or rights obligations have been met. Refer to the{" "}
              <a href="https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-50">
                official presentation of Article 50
              </a>{" "}
              and the{" "}
              <a href="https://digital-strategy.ec.europa.eu/en/policies/guidelines-ai-transparency-obligations">
                European Commission guidelines
              </a>
              ; the specific media and metadata concerned must be assessed separately.
            </p>
          </>
        ),
      },
      {
        id: "media",
        title: "Fonts, media & rights",
        body: (
          <>
            <p>
              Barlow Condensed, Inter and Geist Mono are self-hosted. These font files do not
              require a connection to an external font provider. SIL Open Font License texts are
              available for <a href="/licenses/barlow-condensed-OFL.txt">Barlow Condensed</a>,{" "}
              <a href="/licenses/inter-OFL.txt">Inter</a> and{" "}
              <a href="/licenses/geist-mono-OFL.txt">Geist Mono</a>. Other embedded media may
              trigger external requests as described above.
            </p>
            <p>
              Albion Online and its associated trademarks, item images and game graphics belong to
              their respective rights holders. Community contributions and illustrations may be
              subject to separate usage rights. Availability on this website is not a blanket
              licence to republish. Please report possible rights infringements to the contact still
              to be supplied in the provider notice, identifying the affected URL and disputed
              content.
            </p>
          </>
        ),
      },
    ],
  };
}
