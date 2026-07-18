export interface MagicLinkEmail {
  subject: string;
  text: string;
  html: string;
}

export function buildMagicLinkEmail(
  email: string,
  url: string,
  expiresInHours = 24,
): MagicLinkEmail {
  const subject = "Your secure sign-in link for Orbura";
  const expires = `${expiresInHours} hour${expiresInHours === 1 ? "" : "s"}`;

  const text =
    `Hi,\n\n` +
    `You requested a secure sign-in link for Orbura.\n\n` +
    `Sign in:\n${url}\n\n` +
    `This link is single-use and expires in ${expires}. ` +
    `If you did not request this email, you can safely ignore it.\n\n` +
    `Orbura\n` +
    `https://orbura.famile.xyz`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${subject}</title>
</head>
<body style="margin:0; padding:0; background:#f7f7f7; font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#1f1f1f;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7f7f7; padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff; border-radius:12px; overflow:hidden; max-width:640px; width:100%;">
          <tr>
            <td style="background:#0f172a; padding:24px 32px; text-align:left;">
              <h1 style="margin:0; color:#ffffff; font-size:20px; font-weight:600; letter-spacing:-0.2px;">Orbura</h1>
              <p style="margin:4px 0 0; color:#94a3b8; font-size:13px;">Secure sign-in</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px; font-size:16px; line-height:1.5;">Hi,</p>
              <p style="margin:0 0 24px; font-size:16px; line-height:1.5;">
                You requested a secure, passwordless sign-in link for <strong>Orbura</strong>. Click the button below to continue.
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
                <tr>
                  <td align="left">
                    <a href="${url}" style="display:inline-block; background:#ea580c; color:#ffffff; text-decoration:none; padding:14px 28px; border-radius:10px; font-size:16px; font-weight:600;">Sign in to Orbura</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px; font-size:15px; line-height:1.5; color:#334155;">
                Button not working? Paste this URL into your browser:
              </p>
              <p style="margin:0 0 24px; font-size:13px; word-break:break-all; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:12px; color:#0f172a;">
                ${url}
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff7ed; border-left:4px solid #ea580c; border-radius:6px; margin:0 0 24px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0; font-size:14px; line-height:1.5; color:#7c2d12;">
                      This link is single-use and expires in <strong>${expires}</strong>. If you did not request this email, you can safely ignore it.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0; padding-top:24px; border-top:1px solid #e2e8f0; font-size:13px; line-height:1.5; color:#64748b;">
                Orbura puts your recovery data under your control. No password needed — just your email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc; padding:20px 32px; text-align:center;">
              <p style="margin:0; font-size:12px; color:#94a3b8;">
                &copy; Orbura · <a href="https://orbura.famile.xyz" style="color:#64748b; text-decoration:none;">orbura.famile.xyz</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return { subject, text, html };
}
