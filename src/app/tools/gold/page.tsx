import { History } from "@/components/history";
export default function Page() {
  return (
    <>
      <h1 className="page-title display-title">Gold price history</h1>
      <p className="intro">Public regional price observations. Select the Albion region above.</p>
      <History kind="gold" />
    </>
  );
}
