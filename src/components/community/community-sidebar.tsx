"use client";

import { Hash, LayoutGrid } from "lucide-react";
import { useTranslations } from "next-intl";
import { HeritageCircleMark } from "@/components/heritage-ornaments";
import {
  communityCategories,
  type CommunityCategoryId,
} from "@/components/community/community-categories";
import { surfaceClass } from "@/components/surface";
import type { CommunityTagCount } from "@/components/community/community.schemas";
import { formatTag } from "@/lib/parse-tags";
import { cn } from "@/lib/utils";

export function CommunitySidebar({
  categoryId,
  tag,
  totalCount,
  counts,
  tags,
  onCategoryChange,
  onTagChange,
}: {
  categoryId?: CommunityCategoryId;
  tag?: string;
  totalCount: number;
  counts: Record<CommunityCategoryId, number>;
  tags: CommunityTagCount[];
  onCategoryChange: (id?: CommunityCategoryId) => void;
  onTagChange: (tag?: string) => void;
}) {
  const t = useTranslations("Community");
  const common = useTranslations("Common");
  const items = [
    { id: undefined, label: t("allPosts"), icon: LayoutGrid, count: totalCount },
    ...communityCategories.map((category) => ({
      id: category.id,
      label: t(`categories.${category.id}`),
      icon: category.icon,
      count: counts[category.id],
    })),
  ];

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <div className="scrollbar-hide flex gap-2 overflow-x-auto touch-pan-x lg:hidden">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = categoryId === item.id;
          return (
            <button
              key={item.id ?? "all"}
              type="button"
              aria-pressed={isActive}
              onClick={() => onCategoryChange(item.id)}
              className={cn(
                "inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm font-medium whitespace-nowrap shadow-md",
                isActive ? "bg-gold text-espresso" : "bg-ivory text-warm-gray"
              )}
            >
              <Icon
                className={cn("size-3.5", isActive ? "text-espresso" : "text-gold")}
                strokeWidth={1.75}
              />
              {item.label}
              <span className={cn("text-xs", isActive ? "text-espresso/70" : "text-warm-gray")}>
                {item.count}
              </span>
            </button>
          );
        })}
      </div>

      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 lg:hidden">
          {tags.map((item) => {
            const isActive = tag === item.tag;
            return (
              <button
                key={item.tag}
                type="button"
                aria-pressed={isActive}
                onClick={() => onTagChange(isActive ? undefined : item.tag)}
                className={cn(
                  "inline-flex h-11 items-center rounded-full px-3 text-xs font-medium shadow-md",
                  isActive ? "bg-gold text-espresso" : "bg-ivory text-warm-gray"
                )}
              >
                {formatTag(item.tag)}
              </button>
            );
          })}
        </div>
      ) : null}

      <nav
        aria-label={t("categoriesAria")}
        className={cn(surfaceClass, "hidden p-5 lg:block")}
      >
        <p className="mb-4 flex items-center gap-2.5">
          <HeritageCircleMark className="size-5" />
          <span className="heritage-eyebrow">{common("categories")}</span>
        </p>
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = categoryId === item.id;
            return (
              <li key={item.id ?? "all"}>
                <button
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onCategoryChange(item.id)}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-sm transition-colors",
                    isActive
                      ? "bg-gold/20 font-medium text-espresso"
                      : "text-warm-gray hover:bg-espresso/5 hover:text-espresso"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-3.5 shrink-0",
                      isActive ? "text-espresso" : "text-gold"
                    )}
                    strokeWidth={1.75}
                  />
                  <span className="min-w-0 flex-1 truncate text-start">
                    {item.label}
                  </span>
                  <span className="font-heading text-sm font-light text-gold">
                    {item.count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {tags.length > 0 ? (
        <nav
          aria-label={t("tagsAria")}
          className={cn(surfaceClass, "hidden p-5 lg:block")}
        >
          <p className="mb-4 flex items-center gap-2.5">
            <Hash className="size-4 text-gold" strokeWidth={1.75} />
            <span className="heritage-eyebrow">{common("tags")}</span>
          </p>
          <ul className="flex flex-col gap-0.5">
            {tags.map((item) => {
              const isActive = tag === item.tag;
              return (
                <li key={item.tag}>
                  <button
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => onTagChange(isActive ? undefined : item.tag)}
                    className={cn(
                      "flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-sm transition-colors",
                      isActive
                        ? "bg-gold/20 font-medium text-espresso"
                        : "text-warm-gray hover:bg-espresso/5 hover:text-espresso"
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate text-start">
                      {formatTag(item.tag)}
                    </span>
                    <span className="font-heading text-sm font-light text-gold">
                      {item.count}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
