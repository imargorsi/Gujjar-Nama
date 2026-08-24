"use client";

import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { CommunityPostCard } from "@/components/community/community-post-card";
import { CommunityFeedSkeleton } from "@/components/community/community-skeletons";
import { shareCommunityPost } from "@/components/community/share-community-post";
import {
  useSavedPosts,
  useTogglePostLike,
  useTogglePostSave,
} from "@/components/community/use-posts";
import { EmptyWell } from "@/components/empty-well";
import { SectionHeading } from "@/components/home/section-heading";
import { useRouter } from "@/i18n/navigation";
import { getErrorMessage } from "@/lib/get-error-message";

export function ProfileSavedContent() {
  const t = useTranslations("Profile");
  const community = useTranslations("Community");
  const locale = useLocale();
  const router = useRouter();
  const saved = useSavedPosts();
  const likePost = useTogglePostLike();
  const savePost = useTogglePostSave();
  const posts = saved.data?.posts ?? [];

  return (
    <section id="saved-content">
      <SectionHeading
        eyebrow={t("savedEyebrow")}
        title={t("savedTitle")}
        description={t("savedDescription")}
      />

      {saved.isError ? (
        <EmptyWell
          icon={Bookmark}
          className="mt-8 py-12"
          title={t("savedLoadErrorTitle")}
          text={t("savedLoadErrorText")}
        />
      ) : saved.isLoading ? (
        <div className="mt-8">
          <CommunityFeedSkeleton count={2} />
        </div>
      ) : posts.length === 0 ? (
        <EmptyWell
          icon={Bookmark}
          className="mt-8 py-12"
          title={t("savedEmptyTitle")}
          text={t("savedEmptyText")}
        />
      ) : (
        <div className="mt-8 flex flex-col gap-5">
          {posts.map((post) => (
            <CommunityPostCard
              key={post.id}
              post={post}
              isLiked={post.liked}
              isSaved={post.saved}
              onLike={() =>
                likePost.mutate(post.id, {
                  onError: (error) => {
                    toast.error(
                      getErrorMessage(error, community("likeError"))
                    );
                  },
                })
              }
              onSave={() =>
                savePost.mutate(post.id, {
                  onError: (error) => {
                    toast.error(
                      getErrorMessage(error, community("saveError"))
                    );
                  },
                })
              }
              onShare={() => {
                void shareCommunityPost(post, locale)
                  .then((result) => {
                    if (result === "copied") {
                      toast.success(community("shareCopied"));
                    }
                  })
                  .catch(() => toast.error(community("shareError")));
              }}
              onTagClick={(tag) => {
                router.push(`/community?tag=${encodeURIComponent(tag)}`);
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
