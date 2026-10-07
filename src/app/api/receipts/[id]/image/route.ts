import { errorResponse, unauthorised } from "@/server/http";
import { getServices } from "@/server/services";
import { getCurrentUser } from "@/server/session";

/** Streams a receipt photo from private storage, to its owner only. */
export async function GET(_request: Request, context: RouteContext<"/api/receipts/[id]/image">) {
  const user = await getCurrentUser();
  if (!user) return unauthorised();
  try {
    const { id } = await context.params;
    const photo = await getServices().receipts.photo(user.id, id);
    if (!photo) return new Response(null, { status: 404 });
    return new Response(photo.body, {
      headers: {
        "content-type": photo.contentType,
        // Photos never change once stored, but are personal: browser cache only.
        "cache-control": "private, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
