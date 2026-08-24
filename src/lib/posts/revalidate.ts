import "server-only";

import { revalidatePath } from "next/cache";

export function revalidatePostPaths() {
  const paths = ["/", "/community", "/profile"];

  for (const path of paths) {
    revalidatePath(path);
    revalidatePath(path === "/" ? "/ur" : `/ur${path}`);
  }
}
