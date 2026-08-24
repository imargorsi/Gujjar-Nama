import { handleRoute } from "@/lib/http";
import { requireCurrentUser } from "@/lib/require-user";
import { listSavedPosts } from "@/lib/posts/queries";

export async function GET() {
  return handleRoute(async () => {
    const user = await requireCurrentUser();
    const posts = await listSavedPosts(user.id);
    return Response.json({ posts });
  }, "Could not load saved posts.");
}
