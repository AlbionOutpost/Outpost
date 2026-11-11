import type { ReactNode } from "react";
import Link from "@/components/link";
import type { LegalOperator } from "@/lib/legal";
import type { LegalLocale } from "@/lib/legal-language";
import styles from "./legal.module.css";
import { Address, Email, Missing, Provider } from "./operator";
import { supporterTermsSection, withdrawalFormSection, withdrawalSection } from "./supporter-legal";

export type { LegalLocale } from "@/lib/legal-language";
export type { LegalOperator } from "@/lib/legal";
export type LegalCopy = {
  title: string;
  description: string;
  updated: string;
  contentsLabel: string;
  contentsAria: string;
  sections: { id: string; title: string; body: ReactNode }[];
};

/** The Supporter page only exists while billing is configured; otherwise the words stay plain text. */
const supporterLink = (billing: boolean, label: string) =>
  billing ? <Link href="/supporter">{label}</Link> : label;

/**
 * The published Impressum, privacy policy and terms in German and English (same structure, same
 * links). The privacy policy describes what the code does; nothing here switches a service on.
 */
export function legalCopy(
  locale: LegalLocale,
  operator: LegalOperator,
  configuredBilling: boolean,
  ads = false,
): LegalCopy {
  return locale === "de"
    ? germanCopy(operator, configuredBilling, ads)
    : englishCopy(operator, configuredBilling, ads);
}

function germanCopy(operator: LegalOperator, configuredBilling: boolean, ads: boolean): LegalCopy {
  return {
    title: "Rechtliches bei Outpost",
    description:
      "Wer hinter dem Projekt steht, welche Daten verarbeitet werden und was für die Nutzung gilt.",
    updated: "Dokumentstand: 11. November 2026 · Deutsche Fassung",
    contentsLabel: "Auf dieser Seite",
    contentsAria: "Rechtliche Themen",
    sections: [
      {
        id: "operator",
        title: "Impressum",
        body: (
          <>
            <p>
              Angaben gemäß <a href="https://www.gesetze-im-internet.de/ddg/__5.html">§ 5 DDG</a>.
              Outpost ist ein unabhängiges Community-Projekt zu Albion Online. Es besteht keine
              Verbindung zu oder Empfehlung durch Sandbox Interactive.
            </p>
            <dl className={styles.details}>
              <dt>Anbieter</dt>
              <dd>{operator.name || <Missing locale="de" />}</dd>
              <dt>Rechtsform</dt>
              <dd>Einzelunternehmen</dd>
              <dt>Ladungsfähige Anschrift</dt>
              <dd>
                <Address operator={operator} locale="de" />
              </dd>
              <dt>E-Mail</dt>
              <dd>
                <Email operator={operator} locale="de" />
              </dd>
              <dt>Kontaktformular</dt>
              <dd>
                <Link href="/contact">albionoutpost.com/contact</Link>
              </dd>
              <dt>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</dt>
              <dd>
                {operator.editor ? (
                  `${operator.editor}, Anschrift wie oben`
                ) : (
                  <Missing locale="de" />
                )}
              </dd>
            </dl>
            <h3>Verbraucherstreitbeilegung</h3>
            <p>
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
              Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </>
        ),
      },
      {
        id: "privacy",
        title: "Datenschutzerklärung",
        body: (
          <>
            <p>
              Verantwortlich für die Verarbeitung personenbezogener Daten auf albionoutpost.com ist{" "}
              <Provider locale="de" operator={operator} />. Ein Datenschutzbeauftragter ist nicht
              benannt, weil dafür keine gesetzliche Pflicht besteht. Diese Erklärung beschreibt,
              welche Daten Outpost tatsächlich verarbeitet, wofür und auf welcher Rechtsgrundlage.
            </p>
            <h3>Besuch der Website und Schutz des Dienstes</h3>
            <p>
              Bei jedem Seiten- und API-Aufruf werden technisch notwendige Verbindungsdaten
              verarbeitet: IP-Adresse, Zeitpunkt, angeforderte Adresse, HTTP-Status und
              Browserangaben. Cloudflare liefert die Website aus, schützt sie vor Angriffen und
              verarbeitet dabei diese Daten. Um Missbrauch zu begrenzen, zählt Outpost Anfragen je
              IP-Adresse oder Konto in Zeitfenstern von höchstens einem Tag; danach verfallen die
              Zähler. Outposts eigene Protokolleinträge enthalten nur Ereignis, Status, Dauer und
              Fehlercode. Für eine Stichprobe der Aufrufe erstellt Cloudflare Betriebsprotokolle,
              die nach wenigen Tagen automatisch gelöscht werden. Rechtsgrundlage ist Art. 6 Abs. 1
              lit. f DSGVO; unser berechtigtes Interesse ist ein sicherer, stabiler und
              missbrauchsfreier Betrieb.
            </p>
            <h3>Discord-Anmeldung und Profil</h3>
            <p>
              Öffentliche Werkzeuge benötigen kein Konto. Wenn Sie Discord zur Anmeldung wählen,
              werden die Berechtigungen „identify“ und „email“ angefragt. Outpost verarbeitet
              Discord-Kennung, Anzeigenamen, Profilbild und – soweit von Discord bereitgestellt –
              E-Mail-Adresse, außerdem Kontoverknüpfung und Sitzung. Die Kontodatenstruktur sieht
              OAuth-Zugriffs- und Aktualisierungstoken vor; soweit Discord diese liefert, werden sie
              serverseitig verarbeitet. Ihr Discord-Passwort wird Outpost nicht übermittelt. Es
              werden keine privaten Discord-Nachrichten oder vollständigen Serverlisten angefordert.
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (das von Ihnen gewünschte Konto).
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
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
            </p>
            <h3>Kontaktformular und E-Mail</h3>
            <p>
              Wenn Sie uns über das <Link href="/contact">Kontaktformular</Link> schreiben,
              verarbeiten wir Ihren Namen, Ihre E-Mail-Adresse, das gewählte Thema und Ihre
              Nachricht, um Ihre Anfrage zu bearbeiten und zu beantworten. Gegen Missbrauch zählt
              Outpost Absendungen je IP-Adresse (höchstens drei in zehn Minuten und 20 am Tag), und
              Cloudflare Turnstile prüft, dass ein Mensch absendet (siehe Empfänger). Outpost selbst
              speichert die Nachricht nicht: Der E-Mail-Versand von Cloudflare stellt sie in unser
              Postfach bei Zoho (Rechenzentrum in der EU) zu. Dasselbe Postfach empfängt E-Mails,
              die Sie uns direkt schreiben. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, soweit
              Ihre Anfrage einen Vertrag oder dessen Anbahnung betrifft, sonst Art. 6 Abs. 1 lit. f
              DSGVO; unser berechtigtes Interesse ist, Anfragen zu beantworten. Wir löschen die
              Nachricht, sobald Ihre Anfrage erledigt ist, es sei denn, gesetzliche
              Aufbewahrungspflichten stehen dem entgegen.
            </p>
            <h3>Rechtsgrundlagen und Herkunft der Daten</h3>
            <p>
              Konto-, Speicher-, Team- und Vertragsfunktionen beruhen auf Art. 6 Abs. 1 lit. b
              DSGVO, gesetzliche Pflichten wie Aufbewahrungspflichten auf lit. c, sicherer Betrieb,
              Missbrauchsabwehr und Fehleranalyse auf lit. f (unser berechtigtes Interesse an einem
              sicheren, funktionsfähigen Dienst). Werbung und die dafür nötigen Speicherzugriffe
              beruhen auf Ihrer Einwilligung nach lit. a und § 25 Abs. 1 TDDDG. Sie müssen uns keine
              Daten bereitstellen; ohne Anmeldung können Sie die öffentlichen Werkzeuge nutzen, aber
              nichts im Konto speichern.
            </p>
            <p>
              Daten erhalten wir von Ihnen, bei der Anmeldung von Discord und aus öffentlichen
              Quellen: Marktpreise aus dem Albion Online Data Project und öffentliche Spielerdaten
              (Charakter- und Gildennamen, Kills und Tode) aus der öffentlichen Spiel-API von Albion
              Online, die Outpost im Kill-Feed und auf Spielerseiten zeigt. Eine automatisierte
              Entscheidung im Einzelfall nach Art. 22 DSGVO findet nicht statt; das technische
              Sortieren von Spielpreisen ist keine Bewertung von Personen.
            </p>
          </>
        ),
      },
      {
        id: "cookies",
        title: "Cookies, Gerätespeicher & Werbung",
        body: (
          <>
            <p>
              Outpost speichert auf Ihrem Gerät nur, was für die von Ihnen genutzten Funktionen
              unbedingt erforderlich ist; dafür ist nach{" "}
              <a href="https://www.gesetze-im-internet.de/ttdsg/__25.html">
                § 25 Abs. 2 Nr. 2 TDDDG
              </a>{" "}
              keine Einwilligung nötig. Speicherzugriffe für Werbung erfolgen nur mit Ihrer
              Einwilligung.
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
                    <td>atlas-theme und atlas-region: gewählte Darstellung / Spielregion</td>
                    <td>Bis zu 365 Tage</td>
                    <td>Durch entsprechende Nutzerauswahl gesetzt; im Browser löschbar</td>
                  </tr>
                  {ads && (
                    <tr>
                      <td>FCCDCF und FCNEC (Google): Ihre Einwilligungsentscheidung zu Werbung</td>
                      <td>Bis zu 390 Tage</td>
                      <td>
                        Nur wenn Werbung aktiv ist; über „Privacy and cookie settings“ änderbar.
                        Werbecookies von Google und Partnern nur nach Ihrer Einwilligung.
                      </td>
                    </tr>
                  )}
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
            {ads ? (
              <>
                <h3 id="advertising">Werbung mit Google AdSense</h3>
                <p>
                  Outpost finanziert sich über Werbung von Google AdSense (Google Ireland Limited,
                  Gordon House, Barrow Street, Dublin 4, Irland). Anzeigen erscheinen höchstens
                  einmal pro Seite, nach der Liste einer Übersichtsseite oder nach einem Guide
                  beziehungsweise einem Bibliotheks-Build, nie in Rechnern, Editoren, Team-Bereichen
                  oder Kontoseiten. Supporter mit Abo oder geschenktem Supporter-Status sehen keine
                  Werbung; das Werbeskript wird für sie nicht geladen. Der kostenlose
                  Launch-Supporter-Status blendet Werbung nicht aus.
                </p>
                <p>
                  Besucher aus dem EWR, dem Vereinigten Königreich und der Schweiz sehen vor jeder
                  Anzeigenanfrage das von Google zertifizierte Einwilligungsfenster (IAB TCF). Sie
                  können zustimmen, ablehnen oder einzelne Zwecke und Partner wählen; Ablehnen ist
                  so einfach wie Zustimmen. Ohne Einwilligung zeigt Google höchstens eingeschränkte,
                  nicht personalisierte Anzeigen. Ihre Wahl speichert Google in den Cookies FCCDCF
                  und FCNEC; über den Link „Privacy and cookie settings“ unten auf der Seite können
                  Sie sie jederzeit ändern oder widerrufen. Besucher aus US-Bundesstaaten mit
                  eigenem Datenschutzrecht erhalten Googles Link „Do Not Sell or Share My Personal
                  Information“.
                </p>
                <p>
                  Mit Ihrer Einwilligung verarbeiten Google und die angezeigten Werbepartner
                  Cookies, Gerätekennungen, IP-Adresse und Besuchsdaten für Auslieferung, Messung,
                  Betrugsabwehr und – soweit gewählt – personalisierte Werbung (Art. 6 Abs. 1 lit. a
                  DSGVO, § 25 Abs. 1 TDDDG). Google ist dafür eigenständig verantwortlich. Dabei
                  können Daten in die USA übermittelt werden; Google ist nach dem EU-US Data Privacy
                  Framework zertifiziert. Die jeweils beteiligten Partner und ihre Speicherdauern
                  nennt das Einwilligungsfenster unter „Manage options“.
                </p>
              </>
            ) : (
              <>
                <h3 id="advertising">Keine Werbung</h3>
                <p>
                  Outpost zeigt derzeit keine Werbung und lädt keine Werbe- oder
                  Einwilligungsskripte. Ein gegebenenfalls ausgegebenes
                  Google-Kontoverifizierungs-Metatag enthält nur die Publisher-Zuordnung und lädt
                  selbst kein Google-Skript.
                </p>
              </>
            )}
            <p>
              Outpost setzt keine Analyse- oder Trackingdienste wie Google Analytics ein. Google
              erläutert,{" "}
              <a href="https://support.google.com/adsense/answer/1348695">
                wie Cookies für Anzeigen eingesetzt werden
              </a>{" "}
              und{" "}
              <a href="https://policies.google.com/technologies/partner-sites">
                wie Google Daten von Websites seiner Partner verwendet
              </a>
              .
            </p>
          </>
        ),
      },
      {
        id: "providers",
        title: "Empfänger & Übermittlungen in Drittländer",
        body: (
          <>
            <ul>
              <li>
                <strong>Cloudflare:</strong> Auslieferung und Schutz der Website über Workers,
                öffentliche Katalog- und Inhaltsdaten in D1, Konto- und Zusammenarbeitsdaten in
                SQLite-basierten Durable Objects sowie der Versand der Nachrichten aus dem
                Kontaktformular. Beim Absenden von Community-Beiträgen und des Kontaktformulars
                prüft Cloudflare Turnstile ein Token und erhält dafür technische Geräte- und
                Verbindungsdaten. Cloudflare ist unser Auftragsverarbeiter.{" "}
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
                IP-Adresse. Bei Fehlern kann ein eigener Bild-Proxy einspringen. Rechtsgrundlage ist
                Art. 6 Abs. 1 lit. f DSGVO (Anzeige der Original-Spielgrafiken).
              </li>
              <li>
                <strong>Albion Online Data Project und öffentliche Inhaltsquellen:</strong> Outpost
                fragt Spielpreise überwiegend serverseitig ab. Externe Links und einzelne
                eingebundene Medien können zu direkten Verbindungen Ihres Browsers mit Dritten
                führen.
              </li>
              <li>
                <strong>Zoho:</strong> unser E-Mail-Postfach (Rechenzentrum in der EU) für
                Nachrichten aus dem Kontaktformular und E-Mails an uns. Zoho ist unser
                Auftragsverarbeiter.
              </li>
              <li>
                <strong>Stripe{configuredBilling ? "" : " (derzeit nicht aktiv)"}:</strong> bei
                Zahlungen das in die Supporter-Seite eingebettete Zahlungsformular von Stripe
                (Stripe.js) und das Kundenportal, Name/E-Mail und eine interne Kundenreferenz,
                Zahlungs- und Abonnementvorgänge. Outpost verarbeitet Zuordnungskennungen, Status,
                Ablauf-/Verlängerungsangaben und Webhook-Ereignisse, keine Eingabefelder für
                vollständige Karten- oder Bankdaten. Stripe verarbeitet Zahlungsdaten in seinen
                eigenen Eingabefeldern (iframes von Stripe) und Oberflächen; Stripe.js wird erst
                geladen, wenn Sie mit der Bestellung beginnen, und erfasst dann zur
                Betrugsprävention Geräte- und Interaktionsdaten und setzt eigene Cookies; je Vorgang
                als Auftragsverarbeiter und/oder eigener Verantwortlicher.{" "}
                <a href="https://stripe.com/privacy">Stripe-Datenschutz</a>,{" "}
                <a href="https://stripe.com/legal/dpa">DPA</a>.
              </li>
              <li>
                <strong>Google (AdSense) und Werbepartner:</strong> nur solange Werbung aktiv ist
                und nie für Supporter; siehe <a href="#advertising">Werbung</a>.
              </li>
            </ul>
            <p>
              Cloudflare, Discord, Stripe und Google können Daten auch in den USA und anderen
              Drittländern verarbeiten. Übermittlungen in die USA stützen sich auf den
              Angemessenheitsbeschluss der EU-Kommission zum EU-US Data Privacy Framework, soweit
              der Empfänger zertifiziert ist, und im Übrigen auf die EU-Standardvertragsklauseln in
              den Datenschutz- und Auftragsverarbeitungsbedingungen der Anbieter (Art. 46 Abs. 2
              lit. c DSGVO). Eine Kopie dieser Garantien finden Sie in den verlinkten Bedingungen
              oder erhalten Sie auf Anfrage bei uns.
            </p>
            <p>
              Eine ausschließlich deutsche oder europäische Speicherung sichern wir nicht zu:
              Cloudflare betreibt Workers, D1 und Durable Objects in seinem weltweiten Netz.
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
              und minimale Administrationsprotokolle bewahren wir getrennt von löschbaren Profilen
              auf, solange sie zur Abwehr von Missbrauch und zur Nachvollziehbarkeit von
              Administrationsentscheidungen erforderlich sind; eine automatische Löschfrist gibt es
              dafür nicht.
            </p>
            <p>
              Kontoinhalte speichern wir, bis Sie sie oder Ihr Konto löschen. Eine Anmeldung endet
              serverseitig nach 14 Tagen ohne Erneuerung. Nach einer Löschung können Daten noch bis
              zu 30 Tage in der Wiederherstellungsfunktion der Datenbank bei Cloudflare
              (Point-in-Time-Recovery) enthalten sein und werden danach überschrieben. Soweit
              gesetzliche Aufbewahrungspflichten bestehen, etwa für Abrechnungsunterlagen nach
              Handels- und Steuerrecht, bewahren wir die betroffenen Daten für diese Fristen auf.
            </p>
            <p>
              Unter <Link href="/settings#account-data">Einstellungen → Ihre Daten</Link> können
              angemeldete Personen einen Export der hierfür bereitgestellten Kontodaten anfordern.
              Er enthält keine OAuth-Geheimnisse und keinen pauschalen Export fremder Teamdaten. Ihr
              Auskunftsrecht nach Art. 15 DSGVO können Sie darüber hinaus jederzeit per E-Mail
              geltend machen.
            </p>
            <p>
              Die <Link href="/settings#account-delete">Kontolöschung</Link> verlangt eine
              Bestätigung. Zuvor müssen eigene Teams übertragen oder geschlossen und vorhandene
              Abonnements beendet beziehungsweise ausstehende Zahlungen geklärt sein; eine
              unbezahlte Bestellung wird dabei storniert. Die Prüfung kann bei nicht erreichbarem
              Zahlungsanbieter blockieren. Die Kontolöschung kündigt kein Abonnement automatisch und
              löscht keine eigenständigen Datenbestände bei Discord, Stripe oder Empfängern
              veröffentlichter Inhalte. Einen Löschungsantrag nach Art. 17 DSGVO können Sie auch per
              E-Mail stellen.
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
              Wenden Sie sich dafür an den <a href="#operator">im Impressum genannten Anbieter</a>,
              am einfachsten per E-Mail an <Email operator={operator} locale="de" />. Wir antworten
              innerhalb eines Monats (Art. 12 DSGVO); in gesetzlich geregelten Fällen kann sich die
              Frist verlängern. Einen Identitätsnachweis verlangen wir nur, soweit er erforderlich
              ist.
            </p>
            <p>
              Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren,
              insbesondere im Mitgliedstaat Ihres gewöhnlichen Aufenthalts, Ihres Arbeitsplatzes
              oder des mutmaßlichen Verstoßes (Art. 77{" "}
              <a href="https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX%3A32016R0679">
                DSGVO
              </a>
              ).
            </p>
          </>
        ),
      },
      {
        id: "terms",
        title: "Nutzungsbedingungen",
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
              sind untersagt. Öffentliche Beiträge bleiben mit ihrem Autor beziehungsweise ihrer
              Quelle verknüpft; Teamrollen bestimmen die jeweiligen Bearbeitungsrechte.
            </p>
            <p>
              Ihre Rechte an eigenen Beiträgen behalten Sie. Mit dem Veröffentlichen erlauben Sie
              Outpost, den Beitrag auf der Website anzuzeigen, solange er veröffentlicht ist.
              Stellen Sie keine fremden Werke ein, an denen Sie keine Rechte haben. Beiträge, die
              gegen diese Regeln oder geltendes Recht verstoßen, können wir ausblenden und Konten
              sperren. Hinweise darauf senden Sie über die Meldefunktion am Beitrag, das{" "}
              <Link href="/contact">Kontaktformular</Link> oder per E-Mail.
            </p>
            <h3>Verantwortung und gesetzliche Rechte</h3>
            <p>
              Für offizielle Spielregeln und Spieleinhalte ist der jeweilige Rechteinhaber
              verantwortlich. Verlinkte oder eingebundene Fremdinhalte können sich ändern; für sie
              ist ihr jeweiliger Anbieter verantwortlich. Werden uns Rechtsverletzungen bekannt,
              entfernen wir den betreffenden Link oder Inhalt umgehend.
            </p>
            <p>
              Die Haftung richtet sich nach den gesetzlichen Vorschriften; zwingende Rechte,
              insbesondere bei Vorsatz, grober Fahrlässigkeit und der Verletzung von Leben, Körper
              oder Gesundheit, bleiben unberührt. Es gilt deutsches Recht; zwingende
              Verbraucherschutzvorschriften des Staates Ihres gewöhnlichen Aufenthalts bleiben
              unberührt.
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
              <strong>Aktueller Stand:</strong>{" "}
              {configuredBilling
                ? "Die Zahlungsabwicklung über Stripe ist eingerichtet. Ob der Supporter-Plan bestellt werden kann und zu welchem Preis, zeigt die Supporter-Seite."
                : "Outpost verkauft derzeit nichts. Die Zahlungsabwicklung ist nicht eingerichtet, und der Supporter-Plan kann nicht bestellt werden."}
            </p>
            <p>
              Der Supporter-Plan ist ein monatliches Abonnement. Er umfasst werbefreie Seiten, ein
              öffentlich sichtbares Supporter-Abzeichen und das Recht, Teams zu erstellen;
              Mitglieder können Teams kostenlos beitreten. Aktuelle Eigenschaften und Verfügbarkeit
              sind auf der {supporterLink(configuredBilling, "Supporter-Seite")} beschrieben.
              Supporter sehen keine Werbung (siehe Abschnitt zu Cookies und Werbung).
            </p>
            <p>
              Wird der Plan angeboten, geben Sie Ihre Zahlungsdaten in ein Formular von Stripe ein,
              das auf der Supporter-Seite eingebettet ist; die Eingaben gehen direkt an Stripe.
              Outpost übermittelt dazu die Kundenzuordnung und, soweit vorhanden, Name/E-Mail.
              Stripe meldet Zahlungen und Abonnementstatus serverseitig zurück. Ein Rücksprung mit
              einer Erfolgsmeldung allein schaltet keine bezahlte Berechtigung frei. Zahlungsdaten
              erreichen Outpost nicht. Welche Zahlungsmittel angeboten werden, hängt von der
              Konfiguration bei Stripe ab.
            </p>
            <p>
              Preis, Währung und Abrechnungsintervall stammen aus der Preiskonfiguration bei Stripe.
              Gesamtpreis einschließlich etwaiger Umsatzsteuer, Laufzeit, Verlängerung und Kündigung
              zeigt die Bestellseite vor der Bestellung. Es gelten die AGB, die Widerrufsbelehrung
              und das Muster-Widerrufsformular unten.
            </p>
            <p>
              Im {supporterLink(configuredBilling, "Kundenportal")} von Stripe können Sie
              Zahlungsmittel und Rechnungen verwalten und kündigen. Vertragspartner für die
              Outpost-Leistung ist der im Impressum genannte Anbieter; Stripe wickelt nur die
              Zahlung ab. Die gesetzlichen Rechte bei digitalen Produkten und Dienstleistungen
              bleiben unberührt.
            </p>
          </>
        ),
      },
      supporterTermsSection("de", operator, configuredBilling),
      withdrawalSection("de", operator, configuredBilling),
      withdrawalFormSection("de", operator),
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
              Dieser Hinweis dient der Transparenz über KI-erzeugte Inhalte. Zu den
              Transparenzpflichten nach Art. 50 der EU-KI-Verordnung siehe die{" "}
              <a href="https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-50">
                amtliche Darstellung von Art. 50
              </a>{" "}
              und die{" "}
              <a href="https://digital-strategy.ec.europa.eu/en/policies/guidelines-ai-transparency-obligations">
                Leitlinien der Europäischen Kommission
              </a>
              .
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
              Sie bitte an die im Impressum genannte E-Mail-Adresse oder über das Kontaktformular
              und benennen Sie die betroffene URL sowie den beanstandeten Inhalt.
            </p>
          </>
        ),
      },
    ],
  };
}

function englishCopy(operator: LegalOperator, configuredBilling: boolean, ads: boolean): LegalCopy {
  return {
    title: "Legal information at Outpost",
    description:
      "Who runs the project, how data is processed and which rules apply when you use it.",
    updated: "Document updated: 11 November 2026 · English version",
    contentsLabel: "On this page",
    contentsAria: "Legal topics",
    sections: [
      {
        id: "operator",
        title: "Legal notice (Impressum)",
        body: (
          <>
            <p>
              Information under{" "}
              <a href="https://www.gesetze-im-internet.de/ddg/__5.html">section 5 DDG</a>. Outpost
              is an independent community project for Albion Online. It is not affiliated with or
              endorsed by Sandbox Interactive.
            </p>
            <dl className={styles.details}>
              <dt>Provider</dt>
              <dd>{operator.name || <Missing locale="en" />}</dd>
              <dt>Legal form</dt>
              <dd>Sole proprietorship (Einzelunternehmen)</dd>
              <dt>Address for service</dt>
              <dd>
                <Address operator={operator} locale="en" />
              </dd>
              <dt>Email</dt>
              <dd>
                <Email operator={operator} locale="en" />
              </dd>
              <dt>Contact form</dt>
              <dd>
                <Link href="/contact">albionoutpost.com/contact</Link>
              </dd>
              <dt>Responsible for content under section 18(2) MStV</dt>
              <dd>
                {operator.editor ? `${operator.editor}, address as above` : <Missing locale="en" />}
              </dd>
            </dl>
            <h3>Consumer dispute resolution</h3>
            <p>
              We are neither willing nor obliged to take part in dispute resolution proceedings
              before a consumer arbitration board.
            </p>
          </>
        ),
      },
      {
        id: "privacy",
        title: "Privacy policy",
        body: (
          <>
            <p>
              The controller responsible for processing personal data on albionoutpost.com is{" "}
              <Provider locale="en" operator={operator} />. No data protection officer is appointed
              because there is no legal obligation to appoint one. This policy describes which data
              Outpost actually processes, for what purpose and on which legal basis.
            </p>
            <h3>Visiting the website and protecting the service</h3>
            <p>
              Every page and API request involves technically necessary connection data: IP address,
              time, requested address, HTTP status and browser information. Cloudflare delivers the
              website, protects it against attacks and processes this data in doing so. To limit
              abuse, Outpost counts requests per IP address or account in windows of at most one
              day; the counters then expire. Outpost’s own log entries contain only the event,
              status, duration and error code. For a sample of requests Cloudflare keeps operational
              logs, which are deleted automatically after a few days. The legal basis is Article
              6(1)(f) GDPR; our legitimate interest is secure, stable operation free of abuse.
            </p>
            <h3>Discord sign-in and profile</h3>
            <p>
              Public tools do not require an account. If you choose Discord sign-in, the “identify”
              and “email” permissions are requested. Outpost processes your Discord ID, display
              name, profile image and, where supplied by Discord, email address, as well as account
              linkage and session information. The account data structure provides for OAuth access
              and refresh tokens; where Discord supplies them, they are processed on the server.
              Your Discord password is not sent to Outpost. No private Discord messages or complete
              server lists are requested. The legal basis is Article 6(1)(b) GDPR (the account you
              asked for).
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
              people there. The legal basis is Article 6(1)(b) GDPR.
            </p>
            <h3>Contact form and email</h3>
            <p>
              When you write to us through the <Link href="/contact">contact form</Link>, we process
              your name, email address, the topic you chose and your message to handle and answer
              your request. Against abuse, Outpost counts submissions per IP address (at most three
              in ten minutes and 20 a day), and Cloudflare Turnstile checks that a person is sending
              (see recipients). Outpost itself does not store the message: Cloudflare’s email
              sending delivers it to our mailbox at Zoho (EU data centre). The same mailbox receives
              emails you send us directly. The legal basis is Article 6(1)(b) GDPR where your
              request concerns a contract or steps before one, and otherwise Article 6(1)(f) GDPR;
              our legitimate interest is answering requests. We delete the message once your request
              has been dealt with, unless statutory retention duties require otherwise.
            </p>
            <h3>Legal bases and sources of data</h3>
            <p>
              Account, storage, Team and contract features rely on Article 6(1)(b) GDPR, statutory
              duties such as retention duties on point (c), and secure operation, abuse prevention
              and error analysis on point (f) (our legitimate interest in a secure, working
              service). Advertising and the device access it needs rely on your consent under point
              (a) and section 25(1) TDDDG. You are not required to provide data; without signing in
              you can use the public tools but cannot save anything to an account.
            </p>
            <p>
              We receive data from you, from Discord when you sign in and from public sources:
              market prices from the Albion Online Data Project and public player data (character
              and guild names, kills and deaths) from Albion Online’s public game API, which Outpost
              shows in the kill feed and on player pages. No automated individual decision under
              Article 22 GDPR takes place; technically sorting game prices is not an assessment of
              people.
            </p>
          </>
        ),
      },
      {
        id: "cookies",
        title: "Cookies, device storage & advertising",
        body: (
          <>
            <p>
              Outpost stores on your device only what is strictly necessary for the features you
              use; under{" "}
              <a href="https://www.gesetze-im-internet.de/ttdsg/__25.html">
                section 25(2) no. 2 TDDDG
              </a>{" "}
              this needs no consent. Device access for advertising happens only with your consent.
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
                    <td>atlas-theme and atlas-region: selected appearance / game region</td>
                    <td>Up to 365 days</td>
                    <td>Set through the corresponding user selection; removable in the browser</td>
                  </tr>
                  {ads && (
                    <tr>
                      <td>FCCDCF and FCNEC (Google): your advertising consent choice</td>
                      <td>Up to 390 days</td>
                      <td>
                        Only while advertising is active; change it under “Privacy and cookie
                        settings”. Advertising cookies from Google and partners only with your
                        consent.
                      </td>
                    </tr>
                  )}
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
            {ads ? (
              <>
                <h3 id="advertising">Advertising with Google AdSense</h3>
                <p>
                  Outpost is funded by advertising from Google AdSense (Google Ireland Limited,
                  Gordon House, Barrow Street, Dublin 4, Ireland). Ads appear at most once per page,
                  after the list on an overview page or after a guide or library build, never in
                  calculators, editors, Team areas or account pages. Supporters with a plan or a
                  gifted Supporter status see no ads; the ad script is not loaded for them. The free
                  launch Supporter status does not hide ads.
                </p>
                <p>
                  Visitors from the EEA, the United Kingdom and Switzerland see Google’s certified
                  consent message (IAB TCF) before any ad request. You can consent, decline, or
                  choose individual purposes and partners; declining is as easy as consenting.
                  Without consent, Google shows at most limited, non-personalised ads. Google stores
                  your choice in the FCCDCF and FCNEC cookies; you can change or withdraw it at any
                  time through the “Privacy and cookie settings” link at the bottom of the page.
                  Visitors from US states with their own privacy laws get Google’s “Do Not Sell or
                  Share My Personal Information” link.
                </p>
                <p>
                  With your consent, Google and the listed advertising partners process cookies,
                  device identifiers, IP address and visit data for delivery, measurement, fraud
                  prevention and, where chosen, personalised advertising (Article 6(1)(a) GDPR,
                  section 25(1) TDDDG). Google is an independent controller for this. Data may be
                  transferred to the USA; Google is certified under the EU-US Data Privacy
                  Framework. The consent message lists the partners involved and their retention
                  periods under “Manage options”.
                </p>
              </>
            ) : (
              <>
                <h3 id="advertising">No advertising</h3>
                <p>
                  Outpost shows no advertising at present and loads no advertising or consent
                  scripts. A Google account-verification meta tag, if output, only identifies the
                  publisher association and does not itself load a Google script.
                </p>
              </>
            )}
            <p>
              Outpost uses no analytics or tracking services such as Google Analytics. Google
              explains{" "}
              <a href="https://support.google.com/adsense/answer/1348695">
                how cookies are used for advertising
              </a>{" "}
              and{" "}
              <a href="https://policies.google.com/technologies/partner-sites">
                how Google uses information from sites that use its services
              </a>
              .
            </p>
          </>
        ),
      },
      {
        id: "providers",
        title: "Recipients & transfers to third countries",
        body: (
          <>
            <ul>
              <li>
                <strong>Cloudflare:</strong> delivery and protection of the website through Workers,
                public catalog and content data in D1, account and collaboration data in
                SQLite-based Durable Objects, and sending the messages from the contact form. When
                community contributions or the contact form are submitted, Cloudflare Turnstile
                verifies a token and receives technical device and connection data for it.
                Cloudflare is our processor.{" "}
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
                proxy may be used if errors occur. The legal basis is Article 6(1)(f) GDPR (showing
                the original game art).
              </li>
              <li>
                <strong>Albion Online Data Project and public content sources:</strong> Outpost
                retrieves game prices predominantly on the server. External links and individual
                embedded media may connect your browser directly to third parties.
              </li>
              <li>
                <strong>Zoho:</strong> our email mailbox (EU data centre) for messages from the
                contact form and emails to us. Zoho is our processor.
              </li>
              <li>
                <strong>Stripe{configuredBilling ? "" : " (not active at present)"}:</strong> for
                payments, Stripe’s payment form embedded in the Supporter page (Stripe.js) and the
                customer portal, name/email and an internal customer reference, payment and
                subscription transactions. Outpost processes association IDs, status, expiry/renewal
                information and webhook events, not input fields for complete card or bank details.
                Stripe processes payment data in its own input fields (Stripe iframes) and
                interfaces; Stripe.js loads only once you start an order and then collects device
                and interaction data and sets its own cookies for fraud prevention. Stripe acts as a
                processor and/or an independent controller depending on the transaction.{" "}
                <a href="https://stripe.com/privacy">Stripe privacy policy</a>,{" "}
                <a href="https://stripe.com/legal/dpa">DPA</a>.
              </li>
              <li>
                <strong>Google (AdSense) and advertising partners:</strong> only while advertising
                is active and never for Supporters; see <a href="#advertising">advertising</a>.
              </li>
            </ul>
            <p>
              Cloudflare, Discord, Stripe and Google may also process data in the USA and other
              third countries. Transfers to the USA rely on the European Commission’s adequacy
              decision for the EU-US Data Privacy Framework where the recipient is certified, and
              otherwise on the EU standard contractual clauses in the providers’ privacy and data
              processing terms (Article 46(2)(c) GDPR). You can find a copy of these safeguards in
              the linked terms or obtain one from us on request.
            </p>
            <p>
              We do not promise storage exclusively in Germany or Europe: Cloudflare runs Workers,
              D1 and Durable Objects in its global network.
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
              and minimal administrative audit records are kept separately from deletable profiles
              for as long as they are needed to prevent abuse and to account for administrative
              decisions; there is no automatic deletion period for them.
            </p>
            <p>
              We keep account content until you delete it or your account. A sign-in ends on the
              server after 14 days without renewal. After deletion, data can remain in the
              database’s recovery feature at Cloudflare (point-in-time recovery) for up to 30 days
              and is then overwritten. Where statutory retention duties apply, for example to
              billing records under commercial and tax law, we keep the data concerned for those
              periods.
            </p>
            <p>
              Signed-in users can request an export of the account data provided for this purpose
              under <Link href="/settings#account-data">Settings → Your data</Link>. It contains no
              OAuth secrets and is not a blanket export of other people’s Team data. You can also
              exercise your right of access under Article 15 GDPR by email at any time.
            </p>
            <p>
              <Link href="/settings#account-delete">Account deletion</Link> requires confirmation.
              Beforehand, Teams you own must be transferred or closed, and existing subscriptions
              must be ended or outstanding payments resolved; an unpaid order is cancelled. The
              check may block deletion if the payment provider cannot be reached. Deleting an
              account does not automatically cancel a subscription or delete independent data held
              by Discord, Stripe or recipients of published content. You can also request erasure
              under Article 17 GDPR by email.
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
              Contact the <a href="#operator">provider named in the legal notice</a>, most easily by
              email at <Email operator={operator} locale="en" />. We answer within one month
              (Article 12 GDPR); in cases set out by law the period can be extended. We ask for
              proof of identity only where it is necessary.
            </p>
            <p>
              You have the right to lodge a complaint with a data protection supervisory authority,
              in particular in the member state of your habitual residence, place of work or the
              alleged infringement (Article 77{" "}
              <a href="https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX%3A32016R0679">
                GDPR
              </a>
              ).
            </p>
          </>
        ),
      },
      {
        id: "terms",
        title: "Terms of use",
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
              attacks on the service are prohibited. Public contributions remain linked to their
              author or source; Team roles determine the corresponding editing permissions.
            </p>
            <p>
              You keep your rights in your own contributions. By publishing one, you allow Outpost
              to show it on the website for as long as it is published. Do not upload other people’s
              works you have no rights to. We may hide contributions that break these rules or the
              law and suspend accounts. Report them through the report function on the contribution,
              the <Link href="/contact">contact form</Link> or by email.
            </p>
            <h3>Responsibility and statutory rights</h3>
            <p>
              The respective rights holder is responsible for official game rules and game content.
              Linked or embedded third-party content can change; its provider is responsible for it.
              If we become aware of an infringement, we remove the link or content concerned
              promptly.
            </p>
            <p>
              Liability follows the statutory rules; mandatory rights, in particular for intent,
              gross negligence and injury to life, body or health, remain unaffected. German law
              applies; mandatory consumer protection rules of the country where you normally live
              remain unaffected.
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
              <strong>Current status:</strong>{" "}
              {configuredBilling
                ? "Payments through Stripe are set up. The Supporter page shows whether the Supporter plan can be ordered and at what price."
                : "Outpost sells nothing at present. Payments are not set up, and the Supporter plan cannot be ordered."}
            </p>
            <p>
              The Supporter plan is a monthly subscription. It includes ad-free pages, a publicly
              visible Supporter badge and the right to create Teams; members can join Teams for
              free. Current features and availability are described on the{" "}
              {supporterLink(configuredBilling, "Supporter page")}. Supporters see no ads (see the
              section on cookies and advertising).
            </p>
            <p>
              When the plan is offered, you enter payment details in a Stripe form embedded in the
              Supporter page; what you type goes straight to Stripe. Outpost sends the customer
              association and, where available, name/email. Stripe reports payments and subscription
              status back to the server. Returning with a success message alone does not activate
              paid entitlement. Payment details never reach Outpost. The payment methods offered
              depend on the configuration at Stripe.
            </p>
            <p>
              Price, currency and billing interval come from the price configured at Stripe. The
              order page shows the total price including any VAT, the term, renewal and cancellation
              before you order. The terms of service, cancellation policy and model withdrawal form
              below apply.
            </p>
            <p>
              In Stripe’s {supporterLink(configuredBilling, "customer portal")} you can manage
              payment methods and invoices and cancel. The contracting party for the Outpost service
              is the provider named in the legal notice; Stripe only processes the payment.
              Statutory rights for digital products and services remain unaffected.
            </p>
          </>
        ),
      },
      supporterTermsSection("en", operator, configuredBilling),
      withdrawalSection("en", operator, configuredBilling),
      withdrawalFormSection("en", operator),
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
              This notice is for transparency about AI-generated content. For the transparency
              duties under Article 50 of the EU AI Act, see the{" "}
              <a href="https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-50">
                official presentation of Article 50
              </a>{" "}
              and the{" "}
              <a href="https://digital-strategy.ec.europa.eu/en/policies/guidelines-ai-transparency-obligations">
                European Commission guidelines
              </a>
              .
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
              licence to republish. Please report possible rights infringements to the email address
              in the legal notice or through the contact form, identifying the affected URL and
              disputed content.
            </p>
          </>
        ),
      },
    ],
  };
}
