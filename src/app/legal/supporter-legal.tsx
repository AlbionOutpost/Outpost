import Link from "@/components/link";
import type { LegalOperator } from "@/lib/legal";
import type { LegalLocale } from "@/lib/legal-language";
import { Provider } from "./operator";

/*
 * Terms of service (AGB) for the Supporter plan, the cancellation policy (Widerrufsbelehrung,
 * after the statutory model for services in Anlage 1 zu Art. 246a § 1 Abs. 2 EGBGB, with the
 * owner's full-refund rule in place of compensation and early expiry) and the model withdrawal
 * form (Anlage 2). Both languages come from one structure so they stay in step. While billing is
 * off they say so first: nothing can be ordered, so they describe the plan, not an offer.
 */

const de = (locale: LegalLocale) => locale === "de";
/** Billing pages 404 while billing is off, so the terms name them without a link then. */
const page = (billing: boolean, href: string, label: string) =>
  billing ? <Link href={href}>{label}</Link> : label;

/** How the price reads in the terms: a § 19 UStG note only when the operator set the flag. */
const vatLine = (locale: LegalLocale, operator: LegalOperator) =>
  operator.smallBusiness
    ? de(locale)
      ? "Gemäß § 19 UStG wird keine Umsatzsteuer berechnet."
      : "No VAT is charged under section 19 UStG (small business)."
    : de(locale)
      ? "Der Gesamtpreis einschließlich etwaiger Umsatzsteuer wird vor der Bestellung angezeigt."
      : "The total price, including any VAT that applies, is shown before you order.";

export function supporterTermsSection(
  locale: LegalLocale,
  operator: LegalOperator,
  billing: boolean,
) {
  const g = de(locale);
  return {
    id: "supporter-terms",
    title: g ? "AGB für den Supporter-Plan" : "Terms of service for the Supporter plan",
    body: (
      <>
        {!billing && (
          <p>
            <strong>
              {g
                ? "Der Supporter-Plan wird derzeit nicht angeboten."
                : "The Supporter plan is not offered at present."}
            </strong>{" "}
            {g
              ? "Diese Bedingungen gelten für Bestellungen, sobald er auf der Supporter-Seite bestellt werden kann."
              : "These terms apply to orders once it can be ordered on the Supporter page."}
          </p>
        )}
        <h3>{g ? "1. Geltung und Anbieter" : "1. Scope and provider"}</h3>
        <p>
          {g
            ? "Diese Bedingungen gelten für den kostenpflichtigen Supporter-Plan von Outpost zwischen dem Anbieter "
            : "These terms apply to the paid Outpost Supporter plan between the provider "}
          (<Provider locale={locale} operator={operator} />)
          {g
            ? " und Ihnen. Abweichende Bedingungen gelten nur, wenn der Anbieter ihnen ausdrücklich zustimmt. Für die kostenlose Nutzung von Outpost gelten die allgemeinen Nutzungsbedingungen oben."
            : " and you. Other terms apply only if the provider expressly agrees to them. Free use of Outpost is covered by the general terms above."}
        </p>
        <h3>{g ? "2. Leistung" : "2. What the plan includes"}</h3>
        <p>
          {g
            ? "Der Supporter-Plan umfasst für das Outpost-Konto, auf dem er läuft: keine Werbeanzeigen auf Outpost, ein Supporter-Abzeichen neben Ihrem Namen dort, wo Outpost ihn öffentlich oder in Teams zeigt (Builds, Kompositionen, Kommentare, Mitgliederlisten, Profil), und das Recht, Teams zu erstellen. Das Abzeichen zeigt anderen Besuchern, dass Ihr Konto Supporter ist. Alle übrigen Funktionen bleiben kostenlos. Spielinhalte, Marktdaten und Drittdienste können sich ändern; eine ununterbrochene Verfügbarkeit wird nicht zugesagt."
            : "The Supporter plan covers the Outpost account it runs on: no ads on Outpost, a Supporter badge beside your name wherever Outpost shows it publicly or in Teams (builds, comps, comments, member lists, profile), and the right to create Teams. The badge tells other visitors that your account is a Supporter. Every other feature stays free. Game content, market data and third-party services can change; uninterrupted availability is not promised."}
        </p>
        <p>
          {g
            ? "Konten, die vor dem Ende des Launch-Zeitraums angelegt wurden, behalten das Recht, Teams zu erstellen und zu führen, dauerhaft und kostenlos. Der Supporter-Plan fügt für sie die Werbefreiheit und das Abzeichen hinzu."
            : "Accounts created before the launch period ended keep the right to create and run Teams for life, free. For them the Supporter plan adds the ad-free experience and the badge."}
        </p>
        <h3>{g ? "3. Vertragsschluss" : "3. How the contract is made"}</h3>
        <p>
          {g ? "Die Darstellung auf der " : "The description on the "}
          {page(billing, "/supporter", g ? "Supporter-Seite" : "Supporter page")}
          {g
            ? " ist kein bindendes Angebot. Sie bestellen, indem Sie diesen Bedingungen zustimmen, auf „Zahlungspflichtig bestellen“ klicken und die Zahlung auf der Seite von Stripe abschließen. Damit geben Sie ein verbindliches Angebot ab. Der Vertrag kommt zustande, wenn der Plan auf Ihrem Konto freigeschaltet wird; die Leistung beginnt sofort. Stripe schickt Ihnen eine Bestätigung per E-Mail. Vertragssprachen sind Deutsch und Englisch. Diese Bedingungen bleiben auf dieser Seite abrufbar."
            : " is not a binding offer. You order by accepting these terms, clicking “Subscribe and pay” and completing payment on Stripe’s page. This is your binding offer. The contract is made when the plan is activated on your account, and the plan starts right away. Stripe emails you a confirmation. The contract languages are German and English. These terms stay available on this page."}
        </p>
        <h3>{g ? "4. Preis und Zahlung" : "4. Price and payment"}</h3>
        <p>
          {g
            ? "Es gilt der Preis, der bei der Bestellung auf der Supporter-Seite angezeigt wird. Er ist monatlich im Voraus fällig und wird über Stripe eingezogen. "
            : "The price shown on the Supporter page when you order applies. It is due monthly in advance and collected through Stripe. "}
          {vatLine(locale, operator)}
          {g
            ? " Schlägt eine Zahlung fehl, versucht Stripe sie erneut; die Leistungen bleiben so lange bestehen, bis Stripe den Einzug aufgibt."
            : " If a payment fails, Stripe tries again; the plan stays on until Stripe gives up."}
        </p>
        <h3>{g ? "5. Laufzeit und Kündigung" : "5. Term and cancellation"}</h3>
        <p>
          {g
            ? "Der Plan läuft auf unbestimmte Zeit und verlängert sich jeweils um einen Monat. Es gibt keine Mindestlaufzeit. Sie können jederzeit zum Ende des bezahlten Monats kündigen: über "
            : "The plan runs indefinitely and renews one month at a time. There is no minimum term. You can cancel any time, effective at the end of the paid month: through "}
          {page(
            billing,
            "/supporter/cancel",
            g ? "Verträge hier kündigen" : "Cancel your subscription",
          )}
          {g
            ? ", im Stripe-Kundenportal oder in Textform (zum Beispiel per E-Mail) an den Anbieter. Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt. Nach dem Ende des Plans bleiben Ihr Konto und Ihre Inhalte bestehen; nur die Supporter-Vorteile enden."
            : ", in Stripe’s customer portal, or in text form (for example by email) to the provider. The right to cancel without notice for good cause is unaffected. When the plan ends, your account and content stay; only the Supporter benefits end."}
        </p>
        <h3>{g ? "6. Widerruf" : "6. Withdrawal"}</h3>
        <p>
          {g
            ? "Als Verbraucher können Sie den Vertrag binnen 14 Tagen ab Vertragsschluss ohne Angabe von Gründen widerrufen, auch wenn der Plan schon läuft: über "
            : "As a consumer you can withdraw from the contract within 14 days of its conclusion without giving a reason, even though the plan is already running: through "}
          {page(
            billing,
            "/supporter/withdraw",
            g ? "Vertrag widerrufen" : "Withdraw from contract",
          )}
          {g
            ? ", per E-Mail oder per Brief. Der Plan endet dann sofort, und wir erstatten alle Zahlungen vollständig, ohne Abzug für die genutzte Zeit. Einzelheiten stehen in der "
            : ", by email or by letter. The plan then ends at once and we refund every payment in full, with no deduction for the time used. Details are in the "}
          <a href="#withdrawal">{g ? "Widerrufsbelehrung" : "cancellation policy"}</a>.
        </p>
        <h3>{g ? "7. Haftung und anwendbares Recht" : "7. Liability and governing law"}</h3>
        <p>
          {g
            ? "Die Haftung richtet sich nach den gesetzlichen Vorschriften. Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts; zwingende Verbraucherschutzvorschriften des Staates, in dem Sie Ihren gewöhnlichen Aufenthalt haben, bleiben unberührt."
            : "Liability follows the statutory rules. German law applies, excluding the UN Convention on Contracts for the International Sale of Goods; mandatory consumer protection rules of the country where you normally live are unaffected."}
        </p>
        <p>
          {g
            ? "Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen."
            : "We are neither willing nor obliged to take part in dispute resolution proceedings before a consumer arbitration board."}
        </p>
      </>
    ),
  };
}

export function withdrawalSection(locale: LegalLocale, operator: LegalOperator, billing: boolean) {
  const g = de(locale);
  return {
    id: "withdrawal",
    title: g ? "Widerrufsbelehrung" : "Cancellation policy (right of withdrawal)",
    body: (
      <>
        <h3>{g ? "Widerrufsrecht" : "Right of withdrawal"}</h3>
        <p>
          {g
            ? "Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses."
            : "You have the right to withdraw from this contract within fourteen days without giving any reason. The withdrawal period is fourteen days from the day the contract is concluded."}
        </p>
        <p>
          {g
            ? "Um Ihr Widerrufsrecht auszuüben, müssen Sie uns ("
            : "To exercise the right of withdrawal, you must inform us ("}
          <Provider locale={locale} operator={operator} />
          {g
            ? ") mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder eine E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Am einfachsten widerrufen Sie über die Schaltfläche "
            : ") of your decision to withdraw from this contract by an unequivocal statement (for example a letter sent by post or an email). The simplest way is the "}
          {page(
            billing,
            "/supporter/withdraw",
            g ? "„Vertrag widerrufen“" : "“Withdraw from contract”",
          )}
          {g
            ? " im Fuß jeder Seite (elektronische Widerrufsfunktion nach § 356a BGB); wir bestätigen den Eingang sofort mit Datum und Uhrzeit. Sie können auch das "
            : " link in the footer of every page (the electronic withdrawal function under section 356a BGB); we confirm receipt at once with the date and time. You may also use the "}
          <a href="#withdrawal-form">{g ? "Muster-Widerrufsformular" : "model withdrawal form"}</a>
          {g
            ? " verwenden, das jedoch nicht vorgeschrieben ist. Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden."
            : ", but it is not obligatory. To meet the withdrawal deadline, it is sufficient for you to send your communication concerning your exercise of the right of withdrawal before the withdrawal period has expired."}
        </p>
        <h3>{g ? "Folgen des Widerrufs" : "Effects of withdrawal"}</h3>
        <p>
          {g
            ? "Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, einschließlich der Lieferkosten (mit Ausnahme der zusätzlichen Kosten, die sich daraus ergeben, dass Sie eine andere Art der Lieferung als die von uns angebotene, günstigste Standardlieferung gewählt haben), unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet."
            : "If you withdraw from this contract, we shall reimburse to you all payments received from you, including the costs of delivery (with the exception of the supplementary costs resulting from your choice of a type of delivery other than the least expensive type of standard delivery offered by us), without undue delay and in any event not later than fourteen days from the day on which we are informed about your decision to withdraw from this contract. We will carry out such reimbursement using the same means of payment as you used for the initial transaction, unless you have expressly agreed otherwise; in any event, you will not incur any fees as a result of such reimbursement."}
        </p>
        <h3>{g ? "Volle Erstattung" : "Full refund"}</h3>
        <p>
          {g
            ? "Der Plan beginnt sofort nach der Bestellung. Widerrufen Sie innerhalb der Frist, endet er mit dem Widerruf, und wir erstatten alle Zahlungen vollständig. Einen Wertersatz für die bis zum Widerruf genutzte Zeit verlangen wir nicht, und Ihr Widerrufsrecht erlischt nicht dadurch, dass der Plan schon läuft."
            : "The plan starts right after you order. If you withdraw within the period, it ends when you withdraw and we refund every payment in full. We charge nothing for the time used before the withdrawal, and your right of withdrawal does not expire because the plan has already started."}
        </p>
        <h3>{g ? "Kündigen ist etwas anderes" : "Cancelling is different"}</h3>
        <p>
          {g
            ? "Ein laufendes Abonnement kündigen Sie über "
            : "You cancel a running subscription through "}
          {page(
            billing,
            "/supporter/cancel",
            g ? "Verträge hier kündigen" : "Cancel your subscription",
          )}
          {g ? " (Kündigungsbutton nach " : " (the cancellation button under "}
          <a href="https://www.gesetze-im-internet.de/bgb/__312k.html">
            {g ? "§ 312k BGB" : "section 312k BGB"}
          </a>
          {g
            ? "). Eine Kündigung wirkt zum Ende des bezahlten Monats, ohne Erstattung; ein Widerruf beendet den Vertrag sofort und mit voller Erstattung nach den Regeln oben ("
            : "). A cancellation takes effect at the end of the paid month, without a refund; a withdrawal ends the contract at once with a full refund under the rules above ("}
          <a href="https://www.gesetze-im-internet.de/bgb/__356a.html">
            {g ? "Widerrufsbutton nach § 356a BGB" : "withdrawal button under section 356a BGB"}
          </a>
          {g
            ? "). Kontolöschung ist weder das eine noch das andere."
            : "). Deleting your account is neither."}
        </p>
      </>
    ),
  };
}

export function withdrawalFormSection(locale: LegalLocale, operator: LegalOperator) {
  const g = de(locale);
  return {
    id: "withdrawal-form",
    title: g ? "Muster-Widerrufsformular" : "Model withdrawal form",
    body: (
      <>
        <p>
          {g
            ? "(Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular aus und senden Sie es zurück.)"
            : "(Complete and return this form only if you wish to withdraw from the contract.)"}
        </p>
        <ul>
          <li>
            {g ? "An " : "To "}
            <Provider locale={locale} operator={operator} />:
          </li>
          <li>
            {g
              ? "Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über die Erbringung der folgenden Dienstleistung (*): Outpost Supporter-Plan"
              : "I/We (*) hereby give notice that I/We (*) withdraw from my/our (*) contract for the provision of the following service (*): Outpost Supporter plan"}
          </li>
          <li>{g ? "Bestellt am (*)" : "Ordered on (*)"}</li>
          <li>{g ? "Name des/der Verbraucher(s)" : "Name of consumer(s)"}</li>
          <li>{g ? "Anschrift des/der Verbraucher(s)" : "Address of consumer(s)"}</li>
          <li>
            {g
              ? "Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier)"
              : "Signature of consumer(s) (only if this form is notified on paper)"}
          </li>
          <li>{g ? "Datum" : "Date"}</li>
        </ul>
        <p>{g ? "(*) Unzutreffendes streichen." : "(*) Delete as appropriate."}</p>
      </>
    ),
  };
}
