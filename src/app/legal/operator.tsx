import { Fragment } from "react";
import { addressLines, type LegalOperator } from "@/lib/legal";
import type { LegalLocale } from "@/lib/legal-language";
import styles from "./legal.module.css";

/**
 * A detail the deployment did not configure (only ever locally: production sets every
 * `OPERATOR_*` var in `scripts/cloudflare-release-config.mjs`). Missing stays visibly missing.
 */
export function Missing({ locale }: { locale: LegalLocale }) {
  return <span className={styles.open}>— {locale === "de" ? "nicht hinterlegt" : "not set"}</span>;
}

/** The address for service, one row per line. */
export function Address({ operator, locale }: { operator: LegalOperator; locale: LegalLocale }) {
  const rows = addressLines(operator.address);
  if (!rows.length) return <Missing locale={locale} />;
  return rows.map((row, index) => (
    <Fragment key={index}>
      {index > 0 && <br />}
      {row}
    </Fragment>
  ));
}

export function Email({ operator, locale }: { operator: LegalOperator; locale: LegalLocale }) {
  return operator.email ? (
    <a href={`mailto:${operator.email}`}>{operator.email}</a>
  ) : (
    <Missing locale={locale} />
  );
}

/** The provider in running text: name, address on one line, email. */
export function Provider({ locale, operator }: { locale: LegalLocale; operator: LegalOperator }) {
  const rows = addressLines(operator.address);
  return (
    <>
      {operator.name || <Missing locale={locale} />},{" "}
      {rows.length ? rows.join(", ") : <Missing locale={locale} />},{" "}
      <Email operator={operator} locale={locale} />
    </>
  );
}
