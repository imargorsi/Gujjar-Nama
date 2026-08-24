"use client";

import type { CommunityPost } from "@/components/community/community.schemas";
import { getPathname } from "@/i18n/navigation";

export async function shareCommunityPost(post: CommunityPost, locale: string) {
  const path = getPathname({
    href: "/community",
    locale: locale === "ur" ? "ur" : "en",
  });
  const url = `${window.location.origin}${path}#${post.id}`;
  if (navigator.share) {
    await navigator.share({
      title: "Gujjar Nama",
      text: post.body.slice(0, 120),
      url,
    });
    return "shared" as const;
  }
  await navigator.clipboard.writeText(url);
  return "copied" as const;
}
