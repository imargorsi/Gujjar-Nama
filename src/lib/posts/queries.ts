import "server-only";

import {
  and,
  count,
  desc,
  eq,
  exists,
  inArray,
  sql,
  type SQL,
} from "drizzle-orm";
import type { User } from "@clerk/nextjs/server";
import { after } from "next/server";
import {
  emptyCommunityCounts,
  isCommunityCategoryCountKey,
  type CommunityCategoryCounts,
  type CommunityListQuery,
  type CommunityListResponse,
  type CommunityPost,
  type CommunityPostWriteValues,
  type CommunityTagCount,
} from "@/components/community/community.schemas";
import { db } from "@/lib/db";
import {
  postImages,
  postLikes,
  postSaves,
  postTags,
  posts,
  tags,
  users,
  type Post,
} from "@/lib/db/schema";
import { ensureAppUser } from "@/lib/db/ensure-app-user";
import { notifyPostCreated } from "@/lib/email/notify";
import { HttpError } from "@/lib/http";
import { parseTags } from "@/lib/parse-tags";
import { slugify } from "@/lib/slugify";
import { canManageContent } from "@/lib/roles";
import { excerptFromContent, displayName } from "@/lib/stories/format";
import { objectPublicUrl } from "@/lib/storage/r2";
import { revalidatePostPaths } from "@/lib/posts/revalidate";

type PostAuthor = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
};

type PostRow = {
  post: Post;
  author: PostAuthor;
};

const postAuthorSelect = {
  post: posts,
  author: {
    id: users.id,
    firstName: users.firstName,
    lastName: users.lastName,
    imageUrl: users.imageUrl,
  },
} as const;

function isOwnedCommunityImageKey(key: string, userId: string) {
  if (key.includes("..") || key.includes("\\") || key.includes("//")) {
    return false;
  }
  const prefix = `community/${userId}/`;
  if (!key.startsWith(prefix)) return false;
  const rest = key.slice(prefix.length);
  return rest.length > 0 && !rest.includes("/");
}

export function parseCommunityPostId(id: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id
    )
  ) {
    throw new HttpError(400, "Invalid post.");
  }
  return id;
}

function isUniqueViolation(error: unknown) {
  if (!error || typeof error !== "object") return false;
  if ("code" in error && error.code === "23505") return true;
  const message =
    "message" in error && typeof error.message === "string" ? error.message : "";
  return message.includes("duplicate key");
}

function tagEntries(raw: string | undefined) {
  const bySlug = new Map<string, string>();
  for (const label of parseTags(raw ?? "")) {
    const slug = slugify(label);
    if (!slug) continue;
    if (!bySlug.has(slug)) bySlug.set(slug, label);
  }
  return [...bySlug.entries()];
}

function writerMailbox(writer: User) {
  return (
    writer.primaryEmailAddress?.emailAddress ??
    writer.emailAddresses[0]?.emailAddress ??
    ""
  );
}

function resolvePostImage(
  writerId: string,
  imageKey: string | undefined,
  existingKey?: string
) {
  const key = imageKey?.trim() || null;
  if (!key) return null;

  const isExisting = key === existingKey;
  if (!isExisting && !isOwnedCommunityImageKey(key, writerId)) {
    throw new HttpError(400, "That image cannot be used.");
  }

  const publicUrl = objectPublicUrl(key);
  if (!publicUrl) {
    throw new HttpError(503, "Image storage is not configured.");
  }

  return { objectKey: key, publicUrl };
}

async function replacePostTags(postId: string, rawTags: string | undefined) {
  await db.delete(postTags).where(eq(postTags.postId, postId));

  const entries = tagEntries(rawTags);
  if (entries.length === 0) return;

  const rows: { postId: string; tagId: string }[] = [];
  for (const [slug, label] of entries) {
    const [tag] = await db
      .insert(tags)
      .values({ slug, label })
      .onConflictDoUpdate({
        target: tags.slug,
        set: { label },
      })
      .returning();

    if (!tag) continue;
    rows.push({ postId, tagId: tag.id });
  }

  if (rows.length > 0) {
    await db.insert(postTags).values(rows);
  }
}

async function replacePostImages(
  postId: string,
  image: { objectKey: string; publicUrl: string } | null
) {
  await db.delete(postImages).where(eq(postImages.postId, postId));
  if (!image) return;

  await db.insert(postImages).values({
    postId,
    objectKey: image.objectKey,
    publicUrl: image.publicUrl,
    sortOrder: 0,
  });
}

async function imagesByPostId(postIds: string[]) {
  const grouped = new Map<
    string,
    { key: string; url: string; sortOrder: number }[]
  >();
  if (postIds.length === 0) return grouped;

  const rows = await db
    .select({
      postId: postImages.postId,
      key: postImages.objectKey,
      url: postImages.publicUrl,
      sortOrder: postImages.sortOrder,
    })
    .from(postImages)
    .where(inArray(postImages.postId, postIds));

  for (const row of rows) {
    const list = grouped.get(row.postId) ?? [];
    list.push({
      key: row.key,
      url: objectPublicUrl(row.key) ?? row.url,
      sortOrder: row.sortOrder,
    });
    grouped.set(row.postId, list);
  }

  for (const list of grouped.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return grouped;
}

async function tagsByPostId(postIds: string[]) {
  const grouped = new Map<string, string[]>();
  if (postIds.length === 0) return grouped;

  const rows = await db
    .select({
      postId: postTags.postId,
      label: tags.label,
    })
    .from(postTags)
    .innerJoin(tags, eq(postTags.tagId, tags.id))
    .where(inArray(postTags.postId, postIds));

  for (const row of rows) {
    const list = grouped.get(row.postId) ?? [];
    list.push(row.label);
    grouped.set(row.postId, list);
  }

  return grouped;
}

async function engagementByPostId(
  postIds: string[],
  viewerId?: string | null
) {
  const likeCounts = new Map<string, number>();
  const saveCounts = new Map<string, number>();
  const liked = new Set<string>();
  const saved = new Set<string>();

  if (postIds.length === 0) {
    return { likeCounts, saveCounts, liked, saved };
  }

  const [likeRows, saveRows, likedRows, savedRows] = await Promise.all([
    db
      .select({ postId: postLikes.postId, value: count() })
      .from(postLikes)
      .where(inArray(postLikes.postId, postIds))
      .groupBy(postLikes.postId),
    db
      .select({ postId: postSaves.postId, value: count() })
      .from(postSaves)
      .where(inArray(postSaves.postId, postIds))
      .groupBy(postSaves.postId),
    viewerId
      ? db
          .select({ postId: postLikes.postId })
          .from(postLikes)
          .where(
            and(
              eq(postLikes.userId, viewerId),
              inArray(postLikes.postId, postIds)
            )
          )
      : Promise.resolve([]),
    viewerId
      ? db
          .select({ postId: postSaves.postId })
          .from(postSaves)
          .where(
            and(
              eq(postSaves.userId, viewerId),
              inArray(postSaves.postId, postIds)
            )
          )
      : Promise.resolve([]),
  ]);

  for (const row of likeRows) {
    likeCounts.set(row.postId, Number(row.value));
  }
  for (const row of saveRows) {
    saveCounts.set(row.postId, Number(row.value));
  }
  for (const row of likedRows) liked.add(row.postId);
  for (const row of savedRows) saved.add(row.postId);

  return { likeCounts, saveCounts, liked, saved };
}

function mapPost(
  row: PostRow,
  extras: {
    tags: string[];
    images: { key: string; url: string }[];
    likeCount: number;
    saveCount: number;
    liked: boolean;
    saved: boolean;
  }
): CommunityPost {
  return {
    id: row.post.id,
    authorId: row.post.authorId,
    authorName: displayName(row.author),
    authorImageUrl: row.author.imageUrl || undefined,
    createdAt: row.post.createdAt.toISOString(),
    updatedAt: row.post.updatedAt.toISOString(),
    categoryId: row.post.category,
    body: row.post.body,
    tags: extras.tags,
    images: extras.images,
    likeCount: extras.likeCount,
    saveCount: extras.saveCount,
    liked: extras.liked,
    saved: extras.saved,
    linkUrl: row.post.linkUrl ?? undefined,
  };
}

async function mapRows(
  rows: PostRow[],
  viewerId?: string | null
): Promise<CommunityPost[]> {
  const ids = rows.map((row) => row.post.id);
  const [groupedTags, groupedImages, engagement] = await Promise.all([
    tagsByPostId(ids),
    imagesByPostId(ids),
    engagementByPostId(ids, viewerId),
  ]);

  return rows.map((row) =>
    mapPost(row, {
      tags: groupedTags.get(row.post.id) ?? [],
      images: (groupedImages.get(row.post.id) ?? []).map(({ key, url }) => ({
        key,
        url,
      })),
      likeCount: engagement.likeCounts.get(row.post.id) ?? 0,
      saveCount: engagement.saveCounts.get(row.post.id) ?? 0,
      liked: engagement.liked.has(row.post.id),
      saved: engagement.saved.has(row.post.id),
    })
  );
}

function listWhere(query: CommunityListQuery) {
  const filters: SQL[] = [];
  if (query.category) filters.push(eq(posts.category, query.category));
  if (query.tag) {
    filters.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(postTags)
          .innerJoin(tags, eq(postTags.tagId, tags.id))
          .where(
            and(eq(postTags.postId, posts.id), eq(tags.label, query.tag))
          )
      )
    );
  }
  return filters.length > 0 ? and(...filters) : undefined;
}

async function countPostsByCategory(): Promise<CommunityCategoryCounts> {
  const counts = emptyCommunityCounts();
  const rows = await db
    .select({
      category: posts.category,
      value: count(),
    })
    .from(posts)
    .groupBy(posts.category);

  for (const row of rows) {
    if (isCommunityCategoryCountKey(row.category)) {
      counts[row.category] = Number(row.value);
    }
  }

  return counts;
}

async function listTagCounts(): Promise<CommunityTagCount[]> {
  const rows = await db
    .select({
      tag: tags.label,
      value: count(),
    })
    .from(postTags)
    .innerJoin(tags, eq(postTags.tagId, tags.id))
    .groupBy(tags.label)
    .orderBy(desc(sql<number>`count(*)`), tags.label);

  return rows.map((row) => ({
    tag: row.tag,
    count: Number(row.value),
  }));
}

async function requirePost(postId: string) {
  const [row] = await db
    .select({
      id: posts.id,
      authorId: posts.authorId,
    })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (!row) throw new HttpError(404, "Post not found.");
  return row;
}

async function countEngagement(postId: string) {
  const [[likes], [saves]] = await Promise.all([
    db
      .select({ value: count() })
      .from(postLikes)
      .where(eq(postLikes.postId, postId)),
    db
      .select({ value: count() })
      .from(postSaves)
      .where(eq(postSaves.postId, postId)),
  ]);

  return {
    likeCount: Number(likes?.value ?? 0),
    saveCount: Number(saves?.value ?? 0),
  };
}

export async function listCommunityPosts(
  query: CommunityListQuery,
  viewerId?: string | null
): Promise<CommunityListResponse> {
  const where = listWhere(query);

  const [totalRows, rows, counts, tagCounts] = await Promise.all([
    db
      .select({ value: count() })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(where),
    db
      .select(postAuthorSelect)
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(where)
      .orderBy(desc(posts.createdAt))
      .limit(query.limit)
      .offset(query.offset),
    countPostsByCategory(),
    listTagCounts(),
  ]);

  return {
    posts: await mapRows(rows, viewerId),
    total: Number(totalRows[0]?.value ?? 0),
    counts,
    tags: tagCounts,
  };
}

export async function listSavedPosts(
  viewerId: string
): Promise<CommunityPost[]> {
  const rows = await db
    .select(postAuthorSelect)
    .from(postSaves)
    .innerJoin(posts, eq(postSaves.postId, posts.id))
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(eq(postSaves.userId, viewerId))
    .orderBy(desc(postSaves.createdAt))
    .limit(50);

  return mapRows(rows, viewerId);
}

export async function getCommunityPost(
  postId: string,
  viewerId?: string | null
) {
  const [row] = await db
    .select(postAuthorSelect)
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.id, postId))
    .limit(1);

  if (!row) return undefined;
  const [mapped] = await mapRows([row], viewerId);
  return mapped;
}

function maybeNotifyPostCreated(writer: User, post: CommunityPost) {
  if (writer.id !== post.authorId) return;

  const to = writerMailbox(writer);
  if (!to) return;

  after(() =>
    notifyPostCreated({
      to,
      firstName: writer.firstName,
      excerpt: excerptFromContent(post.body),
      postId: post.id,
    })
  );
}

export async function createCommunityPost(
  writer: User,
  values: CommunityPostWriteValues
) {
  await ensureAppUser(writer);

  const image = resolvePostImage(writer.id, values.imageKey);
  const [created] = await db
    .insert(posts)
    .values({
      authorId: writer.id,
      category: values.categoryId,
      body: values.body,
      linkUrl: values.linkUrl?.trim() || null,
    })
    .returning();

  if (!created) throw new HttpError(500, "Could not save this post.");

  try {
    await replacePostImages(created.id, image);
    await replacePostTags(created.id, values.tags);
  } catch (error) {
    await db.delete(posts).where(eq(posts.id, created.id));
    throw error;
  }

  revalidatePostPaths();
  const post = await getCommunityPost(created.id, writer.id);
  if (!post) throw new HttpError(500, "Could not load the saved post.");
  maybeNotifyPostCreated(writer, post);
  return post;
}

export async function updateCommunityPost(
  writer: User,
  postId: string,
  values: CommunityPostWriteValues
) {
  const [existing] = await db
    .select()
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (!existing) throw new HttpError(404, "Post not found.");

  if (
    !canManageContent({
      authorId: existing.authorId,
      userId: writer.id,
      role: writer.publicMetadata.role,
    })
  ) {
    throw new HttpError(403, "You cannot edit this post.");
  }

  const [currentImage] = await db
    .select({ key: postImages.objectKey })
    .from(postImages)
    .where(eq(postImages.postId, existing.id))
    .orderBy(postImages.sortOrder)
    .limit(1);

  const image = resolvePostImage(
    writer.id,
    values.imageKey,
    currentImage?.key
  );

  await db
    .update(posts)
    .set({
      category: values.categoryId,
      body: values.body,
      linkUrl: values.linkUrl?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, existing.id));

  await replacePostImages(existing.id, image);
  if (values.tags !== undefined) {
    await replacePostTags(existing.id, values.tags);
  }

  revalidatePostPaths();
  const post = await getCommunityPost(existing.id, writer.id);
  if (!post) throw new HttpError(500, "Could not load the saved post.");
  return post;
}

export async function deleteCommunityPost(writer: User, postId: string) {
  const existing = await requirePost(postId);

  if (
    !canManageContent({
      authorId: existing.authorId,
      userId: writer.id,
      role: writer.publicMetadata.role,
    })
  ) {
    throw new HttpError(403, "You cannot delete this post.");
  }

  await db.delete(posts).where(eq(posts.id, existing.id));
  revalidatePostPaths();
}

export async function togglePostLike(writer: User, postId: string) {
  await ensureAppUser(writer);
  await requirePost(postId);

  const removed = await db
    .delete(postLikes)
    .where(and(eq(postLikes.userId, writer.id), eq(postLikes.postId, postId)))
    .returning({ userId: postLikes.userId });

  let liked = false;
  if (removed.length === 0) {
    try {
      await db.insert(postLikes).values({
        userId: writer.id,
        postId,
      });
      liked = true;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      liked = true;
    }
  }

  const { likeCount, saveCount } = await countEngagement(postId);
  return { liked, likeCount, saveCount };
}

export async function togglePostSave(writer: User, postId: string) {
  await ensureAppUser(writer);
  await requirePost(postId);

  const removed = await db
    .delete(postSaves)
    .where(and(eq(postSaves.userId, writer.id), eq(postSaves.postId, postId)))
    .returning({ userId: postSaves.userId });

  let saved = false;
  if (removed.length === 0) {
    try {
      await db.insert(postSaves).values({
        userId: writer.id,
        postId,
      });
      saved = true;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      saved = true;
    }
  }

  const { likeCount, saveCount } = await countEngagement(postId);
  revalidatePostPaths();
  return { saved, likeCount, saveCount };
}
