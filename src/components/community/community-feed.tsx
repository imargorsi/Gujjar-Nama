"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence } from "motion/react";
import { CommunityComposer } from "@/components/community/community-composer";
import {
  CommunityEmptyPrompt,
  CommunityJoinPrompt,
} from "@/components/community/community-join-prompt";
import { CommunityPagination } from "@/components/community/community-pagination";
import { CommunityPostCard } from "@/components/community/community-post-card";
import { CommunityPostSlider } from "@/components/community/community-post-slider";
import { CommunitySidebar } from "@/components/community/community-sidebar";
import {
  CommunityFeedSkeleton,
  CommunitySliderSkeleton,
} from "@/components/community/community-skeletons";
import { useCommunityFeed } from "@/components/community/use-community-feed";
import type { CommunityCategoryId } from "@/components/community/community-categories";
import { formatTag } from "@/lib/parse-tags";
import { EmptyWell } from "@/components/empty-well";
import { FeedItem, SplitReveal } from "@/components/reveal";
import { Text } from "@/components/typography";
import { Skeleton } from "@/components/ui/skeleton";
import { MessagesSquare } from "lucide-react";
import { cn } from "@/lib/utils";

export function CommunityFeed({
  layout = "feed",
  limit,
  showComposer,
  showFilters = false,
  initialCategory,
  initialTag,
  initialPage = 1,
}: {
  layout?: "feed" | "slider";
  showComposer?: boolean;
  showFilters?: boolean;
  limit?: number;
  initialCategory?: CommunityCategoryId;
  initialTag?: string;
  initialPage?: number;
}) {
  const t = useTranslations("Community");
  const isFeedLayout = layout === "feed";
  const isSliderLayout = layout === "slider";
  const isBoard = isFeedLayout && showFilters;
  const feed = useCommunityFeed({
    layout,
    limit,
    showComposer,
    paginate: isBoard,
    initialCategory,
    initialTag,
    initialPage,
  });

  const boardRef = useRef<HTMLDivElement>(null);
  const hasMountedBoard = useRef(false);

  useEffect(() => {
    if (!isBoard) return;
    if (!hasMountedBoard.current) {
      hasMountedBoard.current = true;
      return;
    }
    boardRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  }, [feed.page, initialCategory, initialTag, isBoard]);

  const composer = feed.isAuthPending ? (
    <Skeleton className="h-20 w-full rounded-xl" />
  ) : feed.canCompose ? (
    <CommunityComposer
      post={feed.editing}
      onSaved={() => feed.setEditing(undefined)}
      onCancel={() => feed.setEditing(undefined)}
      showWriteButton={!isSliderLayout}
    />
  ) : isBoard && feed.isLoaded && !feed.isSignedIn ? (
    <CommunityJoinPrompt />
  ) : null;

  const list = feed.isError ? (
    <EmptyWell
      icon={MessagesSquare}
      title={t("loadErrorTitle")}
      text={t("loadErrorText")}
    />
  ) : feed.isLoading ? (
    isSliderLayout ? (
      <CommunitySliderSkeleton />
    ) : (
      <CommunityFeedSkeleton />
    )
  ) : feed.posts.length === 0 ? (
    <CommunityEmptyPrompt isFiltered={feed.isFiltered} />
  ) : isSliderLayout ? (
    <CommunityPostSlider
      posts={feed.posts}
      onLike={feed.toggleLike}
      onSave={feed.toggleSave}
      onShare={feed.sharePost}
      onTagClick={feed.selectTag}
    />
  ) : (
    <div className="flex flex-col gap-5">
      <AnimatePresence initial={false}>
        {feed.posts.map((post, index) => (
          <FeedItem key={post.id} index={index}>
            <CommunityPostCard
              post={post}
              isLiked={post.liked}
              isSaved={post.saved}
              onLike={() => feed.toggleLike(post.id)}
              onSave={() => feed.toggleSave(post.id)}
              onShare={() => feed.sharePost(post)}
              onTagClick={feed.selectTag}
              onEdit={() => feed.setEditing(post)}
              onDelete={() => feed.deletePost(post)}
            />
          </FeedItem>
        ))}
      </AnimatePresence>
    </div>
  );

  if (isBoard) {
    return (
      <SplitReveal
        sidebar={
          <div className="lg:sticky lg:top-32">
            <CommunitySidebar
              categoryId={initialCategory}
              tag={initialTag}
              totalCount={feed.catalogCount}
              counts={feed.counts}
              tags={feed.tags}
              onCategoryChange={feed.selectCategory}
              onTagChange={feed.selectTag}
            />
          </div>
        }
        mainClassName="scroll-mt-28 sm:scroll-mt-32"
      >
        <div ref={boardRef}>
          {composer ? <div className="mb-5">{composer}</div> : null}
          <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-espresso/10 pb-3">
            <div className="min-w-0">
              <p className="heritage-eyebrow">
                {initialCategory
                  ? t(`categories.${initialCategory}`)
                  : t("allPosts")}
              </p>
              {initialTag ? (
                <Text as="span" variant="meta" className="mt-1 block">
                  {formatTag(initialTag)}
                </Text>
              ) : null}
            </div>
            <Text as="span" variant="meta">
              {feed.filteredCount === 0
                ? t("zeroPosts")
                : t("showingRange", {
                    from: feed.rangeStart,
                    to: feed.rangeEnd,
                    total: feed.filteredCount,
                  })}
            </Text>
          </div>
          {list}
          <CommunityPagination
            page={feed.page}
            pageCount={feed.pageCount}
            onPageChange={feed.selectPage}
          />
        </div>
      </SplitReveal>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col gap-6",
        isFeedLayout && "mx-auto max-w-3xl"
      )}
    >
      {composer}
      {list}
    </div>
  );
}
