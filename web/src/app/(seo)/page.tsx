import { AuditWorkspace } from "@/components/audit/audit-workspace";
import { getDictionary } from "@/i18n/dictionaries";
import { getRequestLocale } from "@/i18n/locale";

export default async function Page() {
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale);

  return <AuditWorkspace dict={dict} />;
}
