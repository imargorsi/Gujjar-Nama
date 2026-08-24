import "server-only";

import { siteOrigin } from "@/lib/site";

const espresso = "#271D1B";
const parchment = "#FFE9C5";
const ivory = "#F9ECDB";
const gold = "#9E896A";
const warmGray = "#555555";

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function greetingName(firstName: string | null | undefined) {
  const name = firstName?.trim();
  return name || "there";
}

function wrapEmail(options: {
  preview: string;
  heading: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  const emblemUrl = `${siteOrigin}/gujjar-emblem.png`;
  const ctaHref = escapeHtml(options.ctaHref);
  const heading = escapeHtml(options.heading);
  const preview = escapeHtml(options.preview);

  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:${parchment};font-family:Georgia,'Times New Roman',serif;">
    <div style="display:none;max-height:0;overflow:hidden;">${preview}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${parchment};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:${ivory};border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:${espresso};padding:28px 32px;text-align:center;">
                <img src="${emblemUrl}" alt="" width="56" height="56" style="display:block;margin:0 auto 12px auto;" />
                <p style="margin:0;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:${gold};">Gujjar Nama</p>
              </td>
            </tr>
            <tr>
              <td style="height:3px;background:${gold};font-size:0;line-height:0;">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:36px 32px 28px 32px;color:${espresso};">
                <h1 style="margin:0 0 16px 0;font-size:26px;line-height:1.25;font-weight:normal;">${heading}</h1>
                ${options.bodyHtml}
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 8px 0;">
                  <tr>
                    <td style="background:${espresso};border-radius:6px;">
                      <a href="${ctaHref}" style="display:inline-block;padding:12px 22px;color:${ivory};text-decoration:none;font-size:15px;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(options.ctaLabel)}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 32px 32px;color:${warmGray};font-size:13px;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
                Preserving our past, connecting our people, inspiring our future.<br />
                <a href="${escapeHtml(siteOrigin)}" style="color:${gold};text-decoration:none;">${escapeHtml(siteOrigin.replace(/^https?:\/\//, ""))}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function welcomeEmail(firstName: string | null | undefined) {
  const name = greetingName(firstName);
  const profileUrl = `${siteOrigin}/profile`;

  return {
    subject: "Welcome to Gujjar Nama",
    text: [
      `Hello ${name},`,
      "",
      "Welcome to Gujjar Nama — a living archive and community for the Gujjar people. We are glad you are here.",
      "",
      "You can complete your profile, share with the community, and write a story when you are ready.",
      "",
      `Complete your profile: ${profileUrl}`,
      "",
      "Preserving our past, connecting our people, inspiring our future.",
    ].join("\n"),
    html: wrapEmail({
      preview: "Your place in the Gujjar community starts here.",
      heading: "Welcome to Gujjar Nama",
      ctaLabel: "Complete your profile",
      ctaHref: profileUrl,
      bodyHtml: `
        <p style="margin:0 0 14px 0;font-size:16px;line-height:1.6;">Hello ${escapeHtml(name)},</p>
        <p style="margin:0 0 14px 0;font-size:16px;line-height:1.6;">
          Welcome to Gujjar Nama — a living archive and community for the Gujjar people. We are glad you are here.
        </p>
        <p style="margin:0;font-size:16px;line-height:1.6;">
          Start with your profile, then share a community post or write a story when you are ready.
        </p>
      `,
    }),
  };
}

export function storyPublishedEmail(input: {
  firstName: string | null | undefined;
  title: string;
  excerpt: string;
  slug: string;
}) {
  const name = greetingName(input.firstName);
  const storyUrl = `${siteOrigin}/blog/${encodeURIComponent(input.slug)}`;
  const title = input.title.trim();
  const excerpt = input.excerpt.trim();

  const lines = [
    `Hello ${name},`,
    "",
    `Your story "${title}" is now on Gujjar Nama for the community to read.`,
  ];
  if (excerpt) {
    lines.push("", excerpt);
  }
  lines.push(
    "",
    `Read your story: ${storyUrl}`,
    "",
    "Preserving our past, connecting our people, inspiring our future."
  );

  return {
    subject: "Your story is live on Gujjar Nama",
    text: lines.join("\n"),
    html: wrapEmail({
      preview: `"${title}" is now on Gujjar Nama.`,
      heading: "Your story is live",
      ctaLabel: "Read your story",
      ctaHref: storyUrl,
      bodyHtml: `
        <p style="margin:0 0 14px 0;font-size:16px;line-height:1.6;">Hello ${escapeHtml(name)},</p>
        <p style="margin:0 0 14px 0;font-size:16px;line-height:1.6;">
          Your story <strong>${escapeHtml(title)}</strong> is now on Gujjar Nama for the community to read.
        </p>
        ${
          excerpt
            ? `<p style="margin:0;font-size:15px;line-height:1.6;color:${warmGray};">${escapeHtml(excerpt)}</p>`
            : ""
        }
      `,
    }),
  };
}

export function postCreatedEmail(input: {
  firstName: string | null | undefined;
  excerpt: string;
  postId: string;
}) {
  const name = greetingName(input.firstName);
  const communityUrl = `${siteOrigin}/community#${encodeURIComponent(input.postId)}`;
  const excerpt = input.excerpt.trim();

  const lines = [
    `Hello ${name},`,
    "",
    "Your post is now on the Gujjar Nama community.",
  ];
  if (excerpt) {
    lines.push("", excerpt);
  }
  lines.push(
    "",
    `See it in the community: ${communityUrl}`,
    "",
    "Preserving our past, connecting our people, inspiring our future."
  );

  return {
    subject: "Your post is on the Gujjar Nama community",
    text: lines.join("\n"),
    html: wrapEmail({
      preview: "Your post is now on the Gujjar Nama community.",
      heading: "Your post is live",
      ctaLabel: "See your post",
      ctaHref: communityUrl,
      bodyHtml: `
        <p style="margin:0 0 14px 0;font-size:16px;line-height:1.6;">Hello ${escapeHtml(name)},</p>
        <p style="margin:0 0 14px 0;font-size:16px;line-height:1.6;">
          Your post is now on the Gujjar Nama community.
        </p>
        ${
          excerpt
            ? `<p style="margin:0;font-size:15px;line-height:1.6;color:${warmGray};">${escapeHtml(excerpt)}</p>`
            : ""
        }
      `,
    }),
  };
}
