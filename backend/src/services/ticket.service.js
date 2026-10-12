import "dotenv/config";
import QRCode from "qrcode";
import cloudinary from "../config/cloudinary.js";
import { prisma } from "../config/prisma.js";

/**
 * Generates a QR code for a confirmed booking, uploads it to Cloudinary,
 * and saves the URL back to booking.qrCodeUrl.
 *
 * @param {number} bookingId
 * @param {string} bookingReference  e.g. "BOOK-<uuid>"
 * @returns {string} the Cloudinary URL of the uploaded QR code image
 */
export const generateAndStoreTicket = async (bookingId, bookingReference) => {
  // Ensure Cloudinary credentials are fully loaded
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  // 1. Build the QR payload — scannable string that uniquely identifies the booking
  const qrPayload = `INSTANT-BOOK:${bookingReference}`;

  // 2. Generate QR code as a base64 data URL
  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 400,
  });

  // 3. Upload the base64 PNG to Cloudinary
  const uploadResult = await cloudinary.uploader.upload(qrDataUrl, {
    folder: "instant-book/tickets",
    public_id: `booking_${bookingId}`,
    overwrite: true,
    resource_type: "image",
  });

  const qrCodeUrl = uploadResult.secure_url;

  // 4. Persist the URL on the booking row
  await prisma.booking.update({
    where: { id: bookingId },
    data: { qrCodeUrl },
  });

  return qrCodeUrl;
};
