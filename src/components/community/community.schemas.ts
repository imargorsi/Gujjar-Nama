import { z } from "zod";
import {
  communityCategoryIds,
  type CommunityCategoryId,
} from "./community-categories";

export const communityPostSchema = z.object({
  body: z
    .string()
    .trim()
    .min(3, "Write a little more before publishing.")
    .max(2000, "Keep posts under 2,000 characters."),
  categoryId: z.enum(communityCategoryIds),
  linkUrl: z
    .string()
    .trim()
    .url("Enter a valid link.")
    .or(z.literal(""))
    .optional(),
});

export type CommunityPostValues = z.infer<typeof communityPostSchema>;

export const communityPostWriteSchema = communityPostSchema.extend({
  imageKey: z.string().trim().max(500).optional(),
  tags: z.string().max(160).optional(),
});

export type CommunityPostWriteValues = z.infer<typeof communityPostWriteSchema>;

export const communityPostImageSchema = z.object({
  key: z.string(),
  url: z.string(),
});

export const communityPostDtoSchema = z.object({
  id: z.string().uuid(),
  authorId: z.string(),
  authorName: z.string(),
  authorImageUrl: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  categoryId: z.enum(communityCategoryIds),
  body: z.string(),
  tags: z.array(z.string()),
  images: z.array(communityPostImageSchema),
  likeCount: z.number().int().nonnegative(),
  saveCount: z.number().int().nonnegative(),
  liked: z.boolean(),
  saved: z.boolean(),
  linkUrl: z.string().optional(),
});

export type CommunityPost = z.infer<typeof communityPostDtoSchema>;

export const communityCategoryCountsSchema = z.object({
  "our-stories": z.number().int().nonnegative(),
  discussions: z.number().int().nonnegative(),
  "places-communities": z.number().int().nonnegative(),
  "history-heritage": z.number().int().nonnegative(),
  "language-traditions": z.number().int().nonnegative(),
});

export type CommunityCategoryCounts = z.infer<
  typeof communityCategoryCountsSchema
>;

export const communityTagCountSchema = z.object({
  tag: z.string(),
  count: z.number().int().nonnegative(),
});

export type CommunityTagCount = z.infer<typeof communityTagCountSchema>;

export const communityListResponseSchema = z.object({
  posts: z.array(communityPostDtoSchema),
  total: z.number().int().nonnegative(),
  counts: communityCategoryCountsSchema,
  tags: z.array(communityTagCountSchema),
});

export type CommunityListResponse = z.infer<typeof communityListResponseSchema>;

export const communitySavedResponseSchema = z.object({
  posts: z.array(communityPostDtoSchema),
});

export const communityLikeResponseSchema = z.object({
  liked: z.boolean(),
  likeCount: z.number().int().nonnegative(),
  saveCount: z.number().int().nonnegative(),
});

export const communitySaveResponseSchema = z.object({
  saved: z.boolean(),
  likeCount: z.number().int().nonnegative(),
  saveCount: z.number().int().nonnegative(),
});

export const communityListQuerySchema = z.object({
  category: z.enum(communityCategoryIds).optional(),
  tag: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(24),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});

export type CommunityListQuery = z.infer<typeof communityListQuerySchema>;

export function emptyCommunityCounts(): CommunityCategoryCounts {
  return {
    "our-stories": 0,
    discussions: 0,
    "places-communities": 0,
    "history-heritage": 0,
    "language-traditions": 0,
  };
}

export function isCommunityCategoryCountKey(
  id: string
): id is CommunityCategoryId {
  return communityCategoryIds.includes(id as CommunityCategoryId);
}

export function extractPostLink(body: string, linkUrl?: string) {
  if (linkUrl) return linkUrl;
  const match = body.match(/https?:\/\/[^\s]+/);
  return match?.[0];
}
