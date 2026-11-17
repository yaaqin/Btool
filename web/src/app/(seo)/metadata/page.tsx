import { MetadataWorkspace } from "@/components/metadata/metadata-workspace";
import { getDictionary } from "@/i18n/dictionaries";
import { getRequestLocale } from "@/i18n/locale";

export default async function MetadataPage() {
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale);

  return <MetadataWorkspace dict={dict} />;
}
