"use client";

import { ImageIcon, PenLine } from "lucide-react";
import { useTranslations } from "next-intl";
import { CommunityAvatar } from "@/components/community/community-avatar";
import { CommunityLinkPreview } from "@/components/community/community-link-preview";
import { ComposerPhotoPreview } from "@/components/community/community-composer-fields";
import { communityCategories } from "@/components/community/community-categories";
import { useCommunityComposer } from "@/components/community/use-community-composer";
import { FormField, nativeSelectClassName } from "@/components/form-field";
import { surfaceClass } from "@/components/surface";
import { Text } from "@/components/typography";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CommunityPost } from "@/components/community/community.schemas";
import { maxImageUploadMb } from "@/lib/storage/upload.schemas";
import { cn } from "@/lib/utils";

export function CommunityComposer({
  post,
  onSaved,
  onCancel,
  showWriteButton = true,
}: {
  post?: CommunityPost;
  onSaved?: () => void;
  onCancel?: () => void;
  showWriteButton?: boolean;
}) {
  const t = useTranslations("Community");
  const common = useTranslations("Common");
  const composer = useCommunityComposer({ post, onSaved, onCancel });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = composer.form;

  return (
    <>
      <button
        type="button"
        disabled={composer.isEdit}
        aria-haspopup="dialog"
        aria-expanded={composer.open}
        aria-label={t("writeAria")}
        onClick={composer.openCreate}
        className={cn(
          surfaceClass,
          "flex w-full cursor-pointer gap-3 p-5 text-start transition-shadow hover:shadow-lg sm:px-6",
          showWriteButton
            ? "flex-col sm:flex-row sm:items-center sm:gap-4"
            : "flex-row items-center",
          composer.isEdit && "pointer-events-none opacity-70"
        )}
      >
        <CommunityAvatar
          name={composer.displayName}
          imageUrl={composer.imageUrl}
          size="lg"
        />
        <Text as="span" variant="small" className="min-w-0 flex-1">
          {t("writePrompt")}
        </Text>
        {showWriteButton ? (
          <span className={cn(buttonVariants(), "pointer-events-none w-full shrink-0 sm:w-auto")}>
            <PenLine className="size-4" />
            {t("writeButton")}
          </span>
        ) : null}
      </button>

      <Dialog
        open={composer.open}
        onOpenChange={(next) => {
          if (!next) composer.requestClose();
        }}
      >
        <DialogContent
          showCloseButton
          overlayClassName="bg-espresso/55 backdrop-blur-none supports-backdrop-filter:backdrop-blur-none"
          className="flex max-h-dvh flex-col gap-0 overflow-hidden bg-ivory p-0 shadow-[0_2px_6px_color-mix(in_srgb,var(--gorsi-espresso)_16%,transparent),0_24px_56px_color-mix(in_srgb,var(--gorsi-espresso)_28%,transparent)] ring-1 ring-espresso/12 sm:max-h-[90svh] sm:max-w-3xl lg:max-w-4xl"
        >
          <DialogHeader className="shrink-0 border-b border-espresso/10 px-6 pt-5 pe-14 pb-3 sm:px-8 sm:pt-6">
            <p className="heritage-eyebrow">{t("composerEyebrow")}</p>
            <DialogTitle className="mt-2 text-xl">
              {composer.isEdit ? t("editTitle") : t("writeTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("composerDescription")}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit(composer.onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4 sm:px-8">
              <FormField
                id="community-body"
                label={t("bodyLabel")}
                hint={`${composer.bodyValue.length}/2000`}
                error={errors.body?.message}
              >
                <Textarea
                  id="community-body"
                  rows={4}
                  autoFocus
                  placeholder={t("bodyPlaceholder")}
                  className="min-h-28 resize-none"
                  aria-invalid={Boolean(errors.body)}
                  {...register("body")}
                />
              </FormField>

              <FormField
                id="community-photo"
                label={t("photoLabel")}
                hint={t("photoHint", { mb: maxImageUploadMb })}
              >
                {composer.photoPreview ? (
                  <ComposerPhotoPreview
                    previewUrl={composer.photoPreview}
                    isUploading={composer.isUploading}
                    onRemove={composer.onRemovePhoto}
                  />
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    disabled={composer.isUploading}
                    onClick={composer.photo.openPicker}
                  >
                    <ImageIcon className="size-4" />
                    {t("addPhoto")}
                  </Button>
                )}
                <input id="community-photo" {...composer.photo.fileInputProps} />
              </FormField>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  id="community-link"
                  label={t("linkLabel")}
                  hint={common("optional")}
                  error={errors.linkUrl?.message}
                >
                  <Input
                    id="community-link"
                    type="url"
                    placeholder="https://"
                    aria-invalid={Boolean(errors.linkUrl)}
                    {...register("linkUrl")}
                  />
                </FormField>
                <FormField id="community-category" label={t("categoryLabel")}>
                  <select
                    id="community-category"
                    {...register("categoryId")}
                    className={nativeSelectClassName}
                  >
                    {communityCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {t(`categories.${category.id}`)}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>
              {composer.linkUrl ? (
                <CommunityLinkPreview url={composer.linkUrl} />
              ) : null}
            </div>

            <DialogFooter className="mx-0 mb-0 shrink-0 rounded-none border-espresso/10 bg-ivory px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:rounded-b-xl sm:px-8">
              <Button
                type="button"
                variant="outline"
                disabled={composer.isBusy}
                onClick={composer.requestClose}
                className="w-full sm:w-auto"
              >
                {common("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={composer.isBusy}
                variant="gold"
                className="w-full sm:w-auto"
              >
                {composer.isBusy
                  ? composer.isEdit
                    ? t("saving")
                    : t("publishing")
                  : composer.isEdit
                    ? common("save")
                    : t("publish")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
