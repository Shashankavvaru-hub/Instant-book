import { resend } from "../config/resend.js";

const FROM_EMAIL = process.env.EMAIL_FROM || "tickets@instantbook.com";

/**
 * Sends a booking confirmation email with the QR code ticket.
 */
export const sendBookingConfirmationEmail = async ({
  toEmail,
  userName,
  bookingReference,
  eventTitle,
  eventDate,
  seats,        // array of seat strings e.g. ["A1", "A2"]
  totalAmount,
  qrCodeUrl,
}) => {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping confirmation email");
    return;
  }

  const formattedDate = new Date(eventDate).toLocaleString("en-IN", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });

  const seatList = seats.length
    ? seats.map((s) => `<li style="margin:4px 0;">${s}</li>`).join("")
    : "<li>—</li>";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Booking Confirmation</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">🎟️ Booking Confirmed!</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Your tickets are ready</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 24px;color:#374151;font-size:16px;">Hi <strong>${userName}</strong>,</p>
              <p style="margin:0 0 28px;color:#6b7280;font-size:15px;line-height:1.6;">
                Your booking for <strong style="color:#111827;">${eventTitle}</strong> is confirmed. Show the QR code below at the venue entrance.
              </p>

              <!-- Booking Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:28px;">
                <tr>
                  <td style="padding:24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:13px;width:140px;">Booking Ref</td>
                        <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;">${bookingReference}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:13px;">Event</td>
                        <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;">${eventTitle}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:13px;">Date & Time</td>
                        <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;">${formattedDate}</td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:13px;vertical-align:top;">Seats</td>
                        <td style="padding:6px 0;">
                          <ul style="margin:0;padding-left:16px;color:#111827;font-size:13px;font-weight:600;">${seatList}</ul>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;color:#6b7280;font-size:13px;">Amount Paid</td>
                        <td style="padding:6px 0;color:#059669;font-size:13px;font-weight:700;">₹${Number(totalAmount).toLocaleString("en-IN")}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- QR Code -->
              ${qrCodeUrl ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <p style="margin:0 0 12px;color:#374151;font-size:14px;font-weight:600;">Your Entry QR Code</p>
                    <img src="${qrCodeUrl}" alt="Booking QR Code" width="180" height="180"
                      style="border-radius:8px;border:1px solid #e5e7eb;" />
                  </td>
                </tr>
              </table>
              ` : ""}

              <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;text-align:center;">
                Please arrive 15 minutes before the event. This QR code is your entry pass — keep it safe!
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">InstantBook &bull; Automated confirmation — no need to reply</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject: `🎟️ Booking Confirmed — ${eventTitle}`,
      html,
    });

    if (error) {
      console.error("[email] Resend error:", error);
    } else {
      console.log(`[email] Confirmation sent to ${toEmail} (id: ${data?.id})`);
    }
  } catch (err) {
    // Never let email failure break the booking flow
    console.error("[email] Failed to send confirmation email:", err.message);
  }
};
