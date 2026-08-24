import { handleRoute } from "@/lib/http";
import { requireCurrentUser } from "@/lib/require-user";
import { parseCommunityPostId, togglePostSave } from "@/lib/posts/queries";

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/posts/[id]/save">
) {
  return handleRoute(async () => {
    const { id } = await ctx.params;
    const user = await requireCurrentUser();
    const result = await togglePostSave(user, parseCommunityPostId(id));
    return Response.json(result);
  }, "Could not update this save.");
}
