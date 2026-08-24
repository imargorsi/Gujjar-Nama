"use client";

import type { ReactNode } from "react";
import { Bookmark, Heart, Pencil, Share2, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "motion/react";
import { useCanManageContent } from "@/components/auth/use-can-manage-content";
import { CommunityAvatar } from "@/components/community/community-avatar";
import { CommunityLinkPreview } from "@/components/community/community-link-preview";
import { CommunityPostBody } from "@/components/community/community-post-body";
import { CommunityPostMedia } from "@/components/community/community-post-media";
import { getCommunityCategory } from "@/components/community/community-categories";
import { formatTag } from "@/lib/parse-tags";
import {
  extractPostLink,
  type CommunityPost,
} from "@/components/community/community.schemas";
import { cn } from "@/lib/utils";
import { motionEase } from "@/components/reveal";
import { surfaceClass } from "@/components/surface";
import { Heading, Text } from "@/components/typography";

const COMPACT_TAG_LIMIT = 3;

function formatPostTime(
  iso: string,
  t: (key: "justNow" | "minutesAgo" | "hoursAgo" | "daysAgo", values?: { n: number }) => string,
  locale: string
) {
  const date = new Date(iso);
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return t("justNow");
  if (minutes < 60) return t("minutesAgo", { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("hoursAgo", { n: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t("daysAgo", { n: days });
  return new Intl.DateTimeFormat(locale === "ur" ? "ur-PK" : "en", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function CommunityPostCard({
  post,
  compact = false,
  isLiked,
  isSaved,
  onLike,
  onSave,
  onShare,
  onTagClick,
  onEdit,
  onDelete,
}: {
  post: CommunityPost;
  compact?: boolean;
  isLiked: boolean;
  isSaved: boolean;
  onLike: () => void;
  onSave: () => void;
  onShare: () => void;
  onTagClick: (tag: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const t = useTranslations("Community");
  const locale = useLocale();
  const { canManage } = useCanManageContent(post.authorId);
  const category = getCommunityCategory(post.categoryId);
  const categoryLabel = t(`categories.${post.categoryId}`);
  const CategoryIcon = category.icon;
  const linkUrl = extractPostLink(post.body, post.linkUrl);
  const likeCount = post.likeCount;
  const saveCount = post.saveCount;
  const visibleTags = compact
    ? post.tags.slice(0, COMPACT_TAG_LIMIT)
    : post.tags;
  const hiddenTagCount = compact
    ? Math.max(0, post.tags.length - COMPACT_TAG_LIMIT)
    : 0;
  const imageUrls = (compact ? post.images.slice(0, 1) : post.images).map(
    (image) => image.url
  );

  return (
    <article
      id={post.id}
      className={cn(
        surfaceClass,
        "flex min-w-0 flex-col",
        compact
          ? "h-full p-3.5 sm:p-4"
          : "p-5 transition-shadow hover:shadow-lg sm:px-6 sm:py-5"
      )}
    >
      <header className="flex min-w-0 items-start gap-3">
        <CommunityAvatar name={post.authorName} imageUrl={post.authorImageUrl} />
        <div className="min-w-0 flex-1">
          <Heading as="h3" variant="card" className="truncate text-base sm:text-base">
            {post.authorName}
          </Heading>
          <Text variant="meta" className="mt-0.5 truncate">
            {formatPostTime(post.createdAt, t, locale)}
            {compact ? (
              <>
                <span className="mx-1.5">·</span>
                <span className="inline-flex items-center gap-1">
                  <CategoryIcon className="size-3 text-gold" strokeWidth={1.75} />
                  {categoryLabel}
                </span>
              </>
            ) : null}
          </Text>
        </div>
        {compact ? null : (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-espresso/15 px-2.5 py-1 text-xs font-medium text-espresso">
            <CategoryIcon className="size-3 text-gold" strokeWidth={1.75} />
            {categoryLabel}
          </span>
        )}
      </header>

      <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", compact ? "mt-2.5" : "mt-3.5")}>
        <div className="min-w-0">
          <CommunityPostBody body={post.body} compact={compact} />
        </div>

        {compact || visibleTags.length > 0 ? (
          <ul
            className={cn(
              "flex flex-wrap gap-1.5",
              compact ? "mt-2.5 h-7 overflow-hidden" : "mt-3"
            )}
          >
            {visibleTags.map((tag) => (
              <li key={tag}>
                <button
                  type="button"
                  onClick={() => onTagClick(tag)}
                  className="rounded-full bg-espresso/8 px-2.5 py-1 text-xs font-medium text-espresso transition-colors hover:bg-espresso/12"
                >
                  {formatTag(tag)}
                </button>
              </li>
            ))}
            {hiddenTagCount > 0 ? (
              <li className="px-1 py-1 text-xs text-warm-gray">
                +{hiddenTagCount}
              </li>
            ) : null}
          </ul>
        ) : null}

        {linkUrl && !compact ? (
          <div className="mt-3.5 min-w-0">
            <CommunityLinkPreview url={linkUrl} />
          </div>
        ) : null}

        {imageUrls.length > 0 || compact ? (
          <CommunityPostMedia images={imageUrls} compact={compact} />
        ) : null}

        <footer
          className={cn(
            "flex flex-wrap items-center",
            compact
              ? "-ms-2 mt-auto gap-1 pt-2"
              : "mt-4 justify-between gap-2 border-t border-espresso/10 pt-2.5"
          )}
        >
          <div className={cn("flex flex-wrap items-center gap-1", !compact && "-ms-2")}>
            <PostAction
              label={isLiked ? t("post.unlike") : t("post.like")}
              count={likeCount}
              isActive={isLiked}
              onClick={onLike}
            >
              <Heart
                className="size-4"
                strokeWidth={1.75}
                fill={isLiked ? "currentColor" : "none"}
              />
            </PostAction>
            <PostAction
              label={isSaved ? t("post.unsave") : t("post.save")}
              count={saveCount}
              isActive={isSaved}
              onClick={onSave}
            >
              <Bookmark
                className="size-4"
                strokeWidth={1.75}
                fill={isSaved ? "currentColor" : "none"}
              />
            </PostAction>
            <PostAction label={t("post.share")} onClick={onShare}>
              <Share2 className="size-4" strokeWidth={1.75} />
              {t("post.share")}
            </PostAction>
          </div>
          {canManage && !compact && onEdit && onDelete ? (
            <div className="flex items-center gap-1">
              <PostAction label={t("post.edit")} onClick={onEdit}>
                <Pencil className="size-4" strokeWidth={1.75} />
                {t("post.edit")}
              </PostAction>
              <PostAction label={t("post.delete")} onClick={onDelete}>
                <Trash2 className="size-4" strokeWidth={1.75} />
                {t("post.delete")}
              </PostAction>
            </div>
          ) : null}
        </footer>
      </div>
    </article>
  );
}

function PostAction({
  label,
  count,
  isActive,
  onClick,
  children,
}: {
  label: string;
  count?: number;
  isActive?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={isActive}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.15, ease: motionEase }}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 text-sm transition-colors",
        isActive
          ? "text-gold"
          : "text-warm-gray hover:bg-espresso/5 hover:text-espresso"
      )}
    >
      {children}
      {typeof count === "number" ? (
        <span className="tabular-nums">{count}</span>
      ) : null}
    </motion.button>
  );
}
