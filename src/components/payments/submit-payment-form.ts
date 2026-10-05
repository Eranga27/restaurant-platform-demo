import type { PaymentForm } from "@/lib/payments/payhere";

/**
 * Sends the browser to PayHere with the signed form from the server. A real
 * form post (not fetch) so PayHere receives the Referer it checks against the
 * registered domain.
 */
export function submitPaymentForm({ action, fields }: PaymentForm): void {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  form.hidden = true;
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.append(input);
  }
  document.body.append(form);
  form.submit();
}
