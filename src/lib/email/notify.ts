import "server-only";

import { sendMail } from "@/lib/email/smtp";
import {
  postCreatedEmail,
  storyPublishedEmail,
  welcomeEmail,
} from "@/lib/email/templates";

function isMailbox(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function deliver(
  label: string,
  to: string,
  message: { subject: string; text: string; html: string }
) {
  try {
    return await sendMail({ to, ...message });
  } catch (error) {
    console.error(label, error);
    return false;
  }
}

export async function notifyWelcome(input: {
  to: string;
  firstName: string | null | undefined;
}) {
  const to = input.to.trim();
  if (!isMailbox(to)) return false;
  return deliver("Welcome email failed", to, welcomeEmail(input.firstName));
}

export async function notifyStoryPublished(input: {
  to: string;
  firstName: string | null | undefined;
  title: string;
  excerpt: string;
  slug: string;
}) {
  const to = input.to.trim();
  if (!isMailbox(to)) return false;
  return deliver(
    "Story published email failed",
    to,
    storyPublishedEmail(input)
  );
}

export async function notifyPostCreated(input: {
  to: string;
  firstName: string | null | undefined;
  excerpt: string;
  postId: string;
}) {
  const to = input.to.trim();
  if (!isMailbox(to)) return false;
  return deliver("Community post email failed", to, postCreatedEmail(input));
}
