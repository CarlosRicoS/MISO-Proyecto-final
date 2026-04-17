"""HTTP adapter that calls the Stripe mock payment gateway."""

from decimal import Decimal

import httpx

from booking_orchestrator.domain.exceptions import StripePaymentError


class HttpxStripeClient:
    def __init__(self, client: httpx.AsyncClient) -> None:
        self._client = client

    async def create_payment(
        self,
        transaction_id: str,
        currency: str,
        payment_method_type: str,
        amount: Decimal,
    ) -> str:
        """Create a payment. Returns the referencePaymentId from Stripe."""
        payload = {
            "transactionId": transaction_id,
            "currency": currency,
            "paymentMethodType": payment_method_type,
            "amount": str(amount),
        }
        try:
            response = await self._client.post("/api/stripe/create", json=payload)
        except httpx.HTTPError as exc:
            raise StripePaymentError(f"stripe service unreachable: {exc}") from exc

        if response.status_code != 200:
            raise StripePaymentError(
                f"stripe create returned {response.status_code}: {response.text}"
            )
        return response.json()["referencePaymentId"]

    async def confirm_payment(self, reference_payment_id: str, transaction_id: str) -> None:
        """Confirm a previously created payment."""
        payload = {
            "referencePaymentId": reference_payment_id,
            "transactionId": transaction_id,
        }
        try:
            response = await self._client.post("/api/stripe/confirm", json=payload)
        except httpx.HTTPError as exc:
            raise StripePaymentError(f"stripe service unreachable: {exc}") from exc

        if response.status_code != 200:
            raise StripePaymentError(
                f"stripe confirm returned {response.status_code}: {response.text}"
            )

    async def cancel_payment(self, reference_payment_id: str, transaction_id: str) -> None:
        """Cancel a payment. Used for saga compensation — failures are logged, not raised."""
        payload = {
            "referencePaymentId": reference_payment_id,
            "transactionId": transaction_id,
        }
        try:
            response = await self._client.post("/api/stripe/cancel", json=payload)
        except httpx.HTTPError as exc:
            raise StripePaymentError(f"stripe service unreachable: {exc}") from exc

        if response.status_code != 200:
            raise StripePaymentError(
                f"stripe cancel returned {response.status_code}: {response.text}"
            )
