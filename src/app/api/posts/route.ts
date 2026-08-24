import type { NextRequest } from "next/server";
import {
  communityListQuerySchema,
  communityPostWriteSchema,
} from "@/components/community/community.schemas";
import { handleRoute, HttpError, readRequestJson } from "@/lib/http";
import { getCurrentUser, requireCurrentUser } from "@/lib/require-user";
import {
  createCommunityPost,
  listCommunityPosts,
} from "@/lib/posts/queries";

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const raw = Object.fromEntries(request.nextUrl.searchParams);
    if (!raw.category) delete raw.category;
    if (!raw.tag) delete raw.tag;

    const parsed = communityListQuerySchema.safeParse(raw);
    if (!parsed.success) {
      throw new HttpError(400, "Invalid query");
    }

    const viewer = await getCurrentUser();
    const result = await listCommunityPosts(parsed.data, viewer?.id);
    return Response.json(result);
  }, "Could not load posts.");
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const user = await requireCurrentUser();
    const parsed = communityPostWriteSchema.safeParse(
      await readRequestJson(request)
    );
    if (!parsed.success) {
      throw new HttpError(400, "Validation failed");
    }

    const post = await createCommunityPost(user, parsed.data);
    return Response.json(post, { status: 201 });
  }, "Could not save this post.");
}
