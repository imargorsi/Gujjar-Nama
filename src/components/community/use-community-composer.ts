"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import {
  communityPostSchema,
  type CommunityPost,
  type CommunityPostValues,
} from "@/components/community/community.schemas";
import { useCreatePost, useUpdatePost } from "@/components/community/use-posts";
import { useUploadPhoto } from "@/components/uploads/use-upload-photo";
import { getErrorMessage } from "@/lib/get-error-message";

function emptyValues(): CommunityPostValues {
  return { body: "", categoryId: "our-stories", linkUrl: "" };
}

function valuesFromPost(post: CommunityPost): CommunityPostValues {
  return {
    body: post.body,
    categoryId: post.categoryId,
    linkUrl: post.linkUrl ?? "",
  };
}

export function useCommunityComposer({
  post,
  onSaved,
  onCancel,
}: {
  post?: CommunityPost;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const t = useTranslations("Community");
  const { user } = useUser();
  const isEdit = Boolean(post);
  const [open, setOpen] = useState(isEdit);
  const [keptImage, setKeptImage] = useState(post?.images[0]);
  const photo = useUploadPhoto();
  const createPost = useCreatePost();
  const updatePost = useUpdatePost();

  const form = useForm<CommunityPostValues>({
    resolver: zodResolver(communityPostSchema),
    defaultValues: post ? valuesFromPost(post) : emptyValues(),
  });

  const { reset, control } = form;
  const bodyValue = useWatch({ control, name: "body" }) ?? "";
  const linkUrl = useWatch({ control, name: "linkUrl" });
  const displayName = post?.authorName || user?.fullName || "Member";
  const photoPreview = photo.photoPreview || photo.photoUrl || keptImage?.url;
  const isBusy =
    form.formState.isSubmitting ||
    photo.isUploading ||
    createPost.isPending ||
    updatePost.isPending;

  useEffect(() => {
    if (!post) return;
    reset(valuesFromPost(post));
    setKeptImage(post.images[0]);
    photo.clearPhoto();
    setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset from the post being edited
  }, [post?.id, reset]);

  function resetComposer() {
    reset(emptyValues());
    photo.clearPhoto();
    setKeptImage(undefined);
    setOpen(false);
  }

  function requestClose() {
    if (isBusy) return;
    resetComposer();
    onCancel?.();
  }

  function openCreate() {
    reset(emptyValues());
    photo.clearPhoto();
    setKeptImage(undefined);
    setOpen(true);
  }

  async function onSubmit(values: CommunityPostValues) {
    if (!isEdit && !user?.id) {
      toast.error(t("signInToPublish"));
      return;
    }

    const payload = {
      ...values,
      imageKey: photo.photoKey || keptImage?.key || "",
    };

    try {
      if (post) {
        await updatePost.mutateAsync({ id: post.id, values: payload });
        toast.success(t("updatedToast"));
      } else {
        await createPost.mutateAsync(payload);
        toast.success(t("publishedToast"));
      }
      resetComposer();
      onSaved?.();
    } catch (error) {
      toast.error(
        getErrorMessage(error, isEdit ? t("updateError") : t("publishError"))
      );
    }
  }

  return {
    isEdit,
    open,
    displayName,
    imageUrl: isEdit ? post?.authorImageUrl : user?.imageUrl,
    bodyValue,
    linkUrl,
    photoPreview,
    isUploading: photo.isUploading,
    isBusy,
    form,
    photo,
    openCreate,
    requestClose,
    onSubmit,
    onRemovePhoto() {
      photo.clearPhoto();
      setKeptImage(undefined);
    },
  };
}
