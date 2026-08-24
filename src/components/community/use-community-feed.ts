"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";
import { useLocale, useTranslations } from "next-intl";
import {
  communityCategories,
  type CommunityCategoryId,
} from "@/components/community/community-categories";
import {
  emptyCommunityCounts,
  type CommunityPost,
} from "@/components/community/community.schemas";
import { communitySliderPostCount } from "@/components/community/community-post-slider";
import {
  useCommunityPosts,
  useDeletePost,
  useTogglePostLike,
  useTogglePostSave,
} from "@/components/community/use-posts";
import { shareCommunityPost } from "@/components/community/share-community-post";
import { getErrorMessage } from "@/lib/get-error-message";
import { useRouter } from "@/i18n/navigation";

export const communityFeedPageSize = 6;

export function communityPath({
  category,
  tag,
  page,
}: {
  category?: CommunityCategoryId;
  tag?: string;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (tag) params.set("tag", tag);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/community?${query}` : "/community";
}

export function useCommunityFeed({
  layout,
  limit,
  showComposer,
  paginate = false,
  initialCategory,
  initialTag,
  initialPage = 1,
}: {
  layout: "feed" | "slider";
  limit?: number;
  showComposer?: boolean;
  paginate?: boolean;
  initialCategory?: CommunityCategoryId;
  initialTag?: string;
  initialPage?: number;
}) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("Community");
  const { isLoaded, isSignedIn } = useAuth();
  const [editing, setEditing] = useState<CommunityPost>();
  const likePost = useTogglePostLike();
  const savePost = useTogglePostSave();
  const removePost = useDeletePost();

  const pageSize =
    layout === "slider"
      ? (limit ?? communitySliderPostCount)
      : paginate
        ? communityFeedPageSize
        : (limit ?? 24);

  const requestedPage = paginate ? Math.max(initialPage, 1) : 1;
  const list = useCommunityPosts({
    category: initialCategory,
    tag: initialTag,
    limit: pageSize,
    offset: paginate ? (requestedPage - 1) * communityFeedPageSize : 0,
  });

  const total = list.data?.total ?? 0;
  const counts = list.data?.counts ?? emptyCommunityCounts();
  const tags = list.data?.tags ?? [];
  const posts = list.data?.posts ?? [];
  const catalogCount = Object.values(counts).reduce(
    (sum, value) => sum + value,
    0
  );
  const pageCount = Math.max(1, Math.ceil(total / communityFeedPageSize));
  const page = paginate
    ? Math.min(requestedPage, pageCount)
    : 1;

  function goTo(next: {
    category?: CommunityCategoryId;
    tag?: string;
    page?: number;
  }) {
    router.replace(
      communityPath({
        category: next.category,
        tag: next.tag,
        page: next.page,
      }),
      { scroll: false }
    );
  }

  function requireSignIn() {
    if (isSignedIn) return true;
    toast.message(t("signInToEngage"));
    return false;
  }

  function toggleLike(id: string) {
    if (!requireSignIn()) return;
    likePost.mutate(id, {
      onError: (error) => {
        toast.error(getErrorMessage(error, t("likeError")));
      },
    });
  }

  function toggleSave(id: string) {
    if (!requireSignIn()) return;
    savePost.mutate(id, {
      onError: (error) => {
        toast.error(getErrorMessage(error, t("saveError")));
      },
    });
  }

  function deletePost(post: CommunityPost) {
    if (!window.confirm(t("deleteConfirm"))) return;
    removePost.mutate(post.id, {
      onSuccess: () => {
        if (editing?.id === post.id) setEditing(undefined);
        toast.success(t("deletedToast"));
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, t("deleteError")));
      },
    });
  }

  async function sharePost(post: CommunityPost) {
    try {
      const result = await shareCommunityPost(post, locale);
      if (result === "copied") toast.success(t("shareCopied"));
    } catch {
      toast.error(t("shareError"));
    }
  }

  useEffect(() => {
    if (!paginate || !list.isSuccess || requestedPage === page) return;
    router.replace(
      communityPath({
        category: initialCategory,
        tag: initialTag,
        page,
      }),
      { scroll: false }
    );
  }, [
    paginate,
    list.isSuccess,
    requestedPage,
    page,
    initialCategory,
    initialTag,
    router,
  ]);

  const rangeStart = total === 0 ? 0 : (page - 1) * communityFeedPageSize + 1;
  const rangeEnd = Math.min(page * communityFeedPageSize, total);

  return {
    editing,
    setEditing,
    catalogCount,
    counts,
    tags,
    posts,
    filteredCount: total,
    page,
    pageCount,
    rangeStart,
    rangeEnd,
    isLoading: list.isLoading,
    isError: list.isError,
    isLoaded,
    isSignedIn,
    canCompose: showComposer ?? Boolean(isLoaded && isSignedIn),
    isAuthPending: showComposer === undefined && !isLoaded,
    isFiltered: Boolean(initialCategory || initialTag),
    categoryLabel: initialCategory
      ? communityCategories.find((category) => category.id === initialCategory)
          ?.label
      : "All posts",
    selectCategory(id?: CommunityCategoryId) {
      goTo({ category: id, tag: initialTag });
    },
    selectTag(nextTag?: string) {
      goTo({ category: initialCategory, tag: nextTag });
    },
    selectPage(nextPage: number) {
      goTo({ category: initialCategory, tag: initialTag, page: nextPage });
    },
    toggleLike,
    toggleSave,
    deletePost,
    sharePost: (post: CommunityPost) => void sharePost(post),
  };
}
