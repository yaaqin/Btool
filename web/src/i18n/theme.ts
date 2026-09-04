import { cookies } from "next/headers";
import { THEME_COOKIE, type Theme } from "./theme-constants";

export async function getRequestTheme(): Promise<Theme> {
  const cookieStore = await cookies();
  return cookieStore.get(THEME_COOKIE)?.value === "dark" ? "dark" : "light";
}

export { THEME_COOKIE };
export type { Theme };
