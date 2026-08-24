"use client";

import { useTranslations } from "next-intl";
import { CommunityPostCard } from "@/components/community/community-post-card";
import {
  PagedSlider,
  chunkPages,
  usePagedSliderPageSize,
} from "@/components/paged-slider";
import type { CommunityPost } from "@/components/community/community.schemas";

export const communitySliderPostCount = 12;

export function CommunityPostSlider({
  posts,
  onLike,
  onSave,
  onShare,
  onTagClick,
}: {
  posts: CommunityPost[];
  onLike: (id: string) => void;
  onSave: (id: string) => void;
  onShare: (post: CommunityPost) => void;
  onTagClick: (tag: string) => void;
}) {
  const t = useTranslations("Home.pulse");
  const pageSize = usePagedSliderPageSize();
  const pages = chunkPages(posts, pageSize);

  return (
    <PagedSlider
      tablistLabel={t("pagesAria")}
      pageClassName="grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      getPageLabel={(index) =>
        t("pageLabel", {
          from: index * pageSize + 1,
          to: Math.min((index + 1) * pageSize, posts.length),
        })
      }
      pages={pages.map((pagePosts, pageIndex) => ({
        key: pagePosts[0]?.id ?? String(pageIndex),
        content: pagePosts.map((post) => (
          <div key={post.id} className="min-w-0">
            <CommunityPostCard
              post={post}
              compact
              isLiked={post.liked}
              isSaved={post.saved}
              onLike={() => onLike(post.id)}
              onSave={() => onSave(post.id)}
              onShare={() => onShare(post)}
              onTagClick={onTagClick}
            />
          </div>
        )),
      }))}
    />
  );
}
