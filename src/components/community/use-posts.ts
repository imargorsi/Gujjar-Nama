"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import {
  communityLikeResponseSchema,
  communityListResponseSchema,
  communityPostDtoSchema,
  communitySaveResponseSchema,
  communitySavedResponseSchema,
  type CommunityListQuery,
  type CommunityListResponse,
  type CommunityPost,
  type CommunityPostWriteValues,
} from "@/components/community/community.schemas";

export const postsQueryKey = {
  all: ["posts"] as const,
  list: (
    filters: Pick<CommunityListQuery, "category" | "tag" | "limit" | "offset"> & {
      viewer: string;
    }
  ) => ["posts", "list", filters] as const,
  saved: ["posts", "saved"] as const,
  detail: (id: string) => ["posts", "detail", id] as const,
};

async function readError(response: Response) {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && "error" in body) {
      const message = (body as { error: unknown }).error;
      if (typeof message === "string") return message;
    }
  } catch {
    // fall through
  }
  return "Something went wrong, try again.";
}

async function parseJson<T>(
  response: Response,
  parse: (data: unknown) => T,
  fallback: string
): Promise<T> {
  if (response.status === 204) throw new Error(fallback);
  if (!response.ok) throw new Error(await readError(response));
  return parse(await response.json());
}

function listSearchParams(
  query: Partial<CommunityListQuery> & { limit?: number; offset?: number }
) {
  const params = new URLSearchParams();
  if (query.category) params.set("category", query.category);
  if (query.tag) params.set("tag", query.tag);
  if (query.limit) params.set("limit", String(query.limit));
  if (query.offset) params.set("offset", String(query.offset));
  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}

async function fetchPostList(query: Partial<CommunityListQuery> = {}) {
  return parseJson(
    await fetch(`/api/posts${listSearchParams(query)}`, {
      credentials: "same-origin",
    }),
    (data) => communityListResponseSchema.parse(data),
    "Could not load posts."
  );
}

async function fetchSavedPosts() {
  return parseJson(
    await fetch("/api/posts/saved", { credentials: "same-origin" }),
    (data) => communitySavedResponseSchema.parse(data),
    "Could not load saved posts."
  );
}

async function createPost(values: CommunityPostWriteValues) {
  return parseJson(
    await fetch("/api/posts", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    }),
    (data) => communityPostDtoSchema.parse(data),
    "Could not save this post."
  );
}

async function updatePost({
  id,
  values,
}: {
  id: string;
  values: CommunityPostWriteValues;
}) {
  return parseJson(
    await fetch(`/api/posts/${encodeURIComponent(id)}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    }),
    (data) => communityPostDtoSchema.parse(data),
    "Could not save this post."
  );
}

async function deletePost(id: string) {
  const response = await fetch(`/api/posts/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  if (!response.ok) throw new Error(await readError(response));
}

async function toggleLike(id: string) {
  return parseJson(
    await fetch(`/api/posts/${encodeURIComponent(id)}/like`, {
      method: "POST",
      credentials: "same-origin",
    }),
    (data) => communityLikeResponseSchema.parse(data),
    "Could not update this like."
  );
}

async function toggleSave(id: string) {
  return parseJson(
    await fetch(`/api/posts/${encodeURIComponent(id)}/save`, {
      method: "POST",
      credentials: "same-origin",
    }),
    (data) => communitySaveResponseSchema.parse(data),
    "Could not update this save."
  );
}

function patchPostInLists(
  queryClient: ReturnType<typeof useQueryClient>,
  postId: string,
  patch: (post: CommunityPost) => CommunityPost
) {
  queryClient.setQueriesData(
    { queryKey: postsQueryKey.all },
    (current: unknown) => {
      if (!current || typeof current !== "object") return current;

      if ("posts" in current && Array.isArray(current.posts)) {
        const list = current as { posts: CommunityPost[] } & Partial<CommunityListResponse>;
        const posts = list.posts.map((post) =>
          post.id === postId ? patch(post) : post
        );
        const isSavedList = !("total" in list) && !("counts" in list);

        return {
          ...list,
          posts: isSavedList ? posts.filter((post) => post.saved) : posts,
        };
      }

      if ("id" in current && (current as CommunityPost).id === postId) {
        return patch(current as CommunityPost);
      }

      return current;
    }
  );
}

export function useCommunityPosts(
  filters: Pick<CommunityListQuery, "category" | "tag" | "limit" | "offset">,
  enabled = true
) {
  const { userId } = useAuth();
  const viewer = userId ?? "anon";

  return useQuery({
    queryKey: postsQueryKey.list({ ...filters, viewer }),
    queryFn: () => fetchPostList(filters),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useSavedPosts(enabled = true) {
  return useQuery({
    queryKey: postsQueryKey.saved,
    queryFn: fetchSavedPosts,
    enabled,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPost,
    onSuccess: (post) => {
      queryClient.setQueryData(postsQueryKey.detail(post.id), post);
      void queryClient.invalidateQueries({ queryKey: postsQueryKey.all });
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePost,
    onSuccess: (post) => {
      queryClient.setQueryData(postsQueryKey.detail(post.id), post);
      void queryClient.invalidateQueries({ queryKey: postsQueryKey.all });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePost,
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: postsQueryKey.detail(id) });
      void queryClient.invalidateQueries({ queryKey: postsQueryKey.all });
    },
  });
}

export function useTogglePostLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleLike,
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: postsQueryKey.all });
      patchPostInLists(queryClient, postId, (post) => ({
        ...post,
        liked: !post.liked,
        likeCount: Math.max(0, post.likeCount + (post.liked ? -1 : 1)),
      }));
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: postsQueryKey.all });
    },
    onSuccess: (result, postId) => {
      patchPostInLists(queryClient, postId, (post) => ({
        ...post,
        liked: result.liked,
        likeCount: result.likeCount,
        saveCount: result.saveCount,
      }));
    },
  });
}

export function useTogglePostSave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleSave,
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: postsQueryKey.all });
      patchPostInLists(queryClient, postId, (post) => ({
        ...post,
        saved: !post.saved,
        saveCount: Math.max(0, post.saveCount + (post.saved ? -1 : 1)),
      }));
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: postsQueryKey.all });
    },
    onSuccess: (result, postId) => {
      patchPostInLists(queryClient, postId, (post) => ({
        ...post,
        saved: result.saved,
        likeCount: result.likeCount,
        saveCount: result.saveCount,
      }));
      void queryClient.invalidateQueries({ queryKey: postsQueryKey.saved });
    },
  });
}
