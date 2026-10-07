import { toReceiptImage } from "@/application/receipts/receipt-image";
import { ValidationError } from "@/domain/errors";
import { errorResponse, unauthorised } from "@/server/http";
import { getServices } from "@/server/services";
import { getCurrentUser } from "@/server/session";

/** Reading a receipt with Gemini usually takes 2–8 seconds; allow for slow days. */
export const maxDuration = 60;

/** Upload a receipt photo (multipart field "image") and scan it. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorised();
  try {
    const form = await request.formData();
    const file = form.get("image");
    if (!(file instanceof Blob)) throw new ValidationError("Attach a photo of the receipt");
    const image = toReceiptImage(new Uint8Array(await file.arrayBuffer()));
    const result = await getServices().receipts.scan(user, image);
    return Response.json(result, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
