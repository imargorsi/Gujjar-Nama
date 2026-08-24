import { communityPostWriteSchema } from "@/components/community/community.schemas";
import { handleRoute, HttpError, readRequestJson } from "@/lib/http";
import { getCurrentUser, requireCurrentUser } from "@/lib/require-user";
import {
  deleteCommunityPost,
  getCommunityPost,
  parseCommunityPostId,
  updateCommunityPost,
} from "@/lib/posts/queries";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/posts/[id]">
) {
  return handleRoute(async () => {
    const { id } = await ctx.params;
    const postId = parseCommunityPostId(id);
    const viewer = await getCurrentUser();
    const post = await getCommunityPost(postId, viewer?.id);
    if (!post) throw new HttpError(404, "Post not found.");
    return Response.json(post);
  }, "Could not load this post.");
}

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/posts/[id]">
) {
  return handleRoute(async () => {
    const { id } = await ctx.params;
    const postId = parseCommunityPostId(id);
    const user = await requireCurrentUser();
    const parsed = communityPostWriteSchema.safeParse(
      await readRequestJson(request)
    );
    if (!parsed.success) {
      throw new HttpError(400, "Validation failed");
    }

    const post = await updateCommunityPost(user, postId, parsed.data);
    return Response.json(post);
  }, "Could not save this post.");
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/posts/[id]">
) {
  return handleRoute(async () => {
    const { id } = await ctx.params;
    const postId = parseCommunityPostId(id);
    const user = await requireCurrentUser();
    await deleteCommunityPost(user, postId);
    return new Response(null, { status: 204 });
  }, "Could not delete this post.");
}
