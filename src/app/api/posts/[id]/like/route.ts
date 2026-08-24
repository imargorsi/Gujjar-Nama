import { handleRoute } from "@/lib/http";
import { requireCurrentUser } from "@/lib/require-user";
import { parseCommunityPostId, togglePostLike } from "@/lib/posts/queries";

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/posts/[id]/like">
) {
  return handleRoute(async () => {
    const { id } = await ctx.params;
    const user = await requireCurrentUser();
    const result = await togglePostLike(user, parseCommunityPostId(id));
    return Response.json(result);
  }, "Could not update this like.");
}
