/** Mirror the existing server cancellation boundary; never override it in the UI. */
export function foodCancellationAvailable(order: { status: string; picked_up_at?: string | null; return_requested_at?: string | null }) {
  return !["delivered", "completed", "cancelled", "returned_to_store", "delivering", "failed_delivery"].includes(order.status)
    && !order.picked_up_at && !order.return_requested_at;
}