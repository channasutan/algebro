---

Mayar Payment Gateway Integration Documentation

Source: https://docs.mayar.id
Headless API: https://api.mayar.id/headless/docs/

Dokumen ini merupakan knowledge base untuk AI agent yang akan mengimplementasikan Mayar Payment Gateway pada aplikasi web (Next.js / backend API / Supabase).

Dokumentasi ini mencakup:

Authentication

Payment Link

Payment Request

Invoice

Product API

Dynamic QR

Webhook

Best practices implementasi



---

1. Overview

Mayar adalah payment gateway Indonesia yang menyediakan API untuk menerima pembayaran melalui:

Payment Link

Payment Request

Invoice

Product Page

Dynamic QR Code

Subscription / Membership

Webhook notification


Metode pembayaran yang didukung:

Virtual Account

BCA

BNI

BRI

Mandiri

Permata


E-Wallet

GoPay

OVO

DANA

ShopeePay

LinkAja


QRIS

Credit / Debit Card

Visa

Mastercard


Retail

Alfamart

Indomaret



---

2. Environment

Production

https://api.mayar.id

Headless API

https://api.mayar.id/hl/v1

Sandbox / Testing

Testing dilakukan melalui dashboard:

https://web.mayar.club/

API key sandbox bisa dibuat di:

https://web.mayar.club/api-keys


---

3. Environment Variables

Contoh konfigurasi environment:

MAYAR_API_KEY=your_api_key
MAYAR_BASE_URL=https://api.mayar.id
MAYAR_WEBHOOK_SECRET=your_secret
APP_BASE_URL=https://yourdomain.com


---

4. Authentication

Semua request ke Mayar menggunakan Bearer Token.

Header wajib:

Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

Contoh request:

POST https://api.mayar.id/hl/v1/paymentrequest
Authorization: Bearer YOUR_API_KEY


---

5. Rate Limit

Rate limit API Mayar:

20 requests per minute per IP

Jika limit terlampaui akan mendapat response:

429 Too Many Requests

Rekomendasi:

gunakan caching

hindari request dari frontend

gunakan backend proxy



---

6. Status Codes

Code Meaning

200 Success
400 Bad request
401 Unauthorized
404 Not found
422 Unprocessable
429 Rate limit
500 Server error



---

7. Payment Link

Payment Link adalah halaman checkout siap pakai.

Endpoint:

POST /hl/v1/paymentlink

Example request:

{
  "name": "Produk Premium",
  "amount": 50000,
  "description": "Premium plan",
  "redirectUrl": "https://example.com/success",
  "currency": "IDR"
}

Response:

{
  "statusCode": 200,
  "messages": "success",
  "data": {
    "id": "xxxx",
    "link": "https://mayar.id/pay/xxxx",
    "status": "active"
  }
}

User harus diarahkan ke:

data.link


---

8. Payment Request (Tagihan)

Endpoint membuat tagihan:

POST /hl/v1/paymentrequest

Example:

{
  "name": "John Doe",
  "mobile": "08123456789",
  "email": "john@email.com",
  "amount": 100000,
  "description": "Payment subscription",
  "redirectUrl": "https://example.com/success"
}


---

Get Payment Requests

GET /hl/v1/paymentrequest?page=1&pageSize=10&status=paid

Parameters:

Param Description

page page number
pageSize items per page
status paid / unpaid / expired



---

Reopen Payment Request

POST /hl/v1/paymentrequest/{id}/reopen


---

9. Invoice

Ambil status pembayaran.

Endpoint:

GET /hl/v1/invoice/{id}

Example response:

{
  "statusCode": 200,
  "data": {
    "id": "invoice-id",
    "status": "paid",
    "amount": 100000,
    "paidAt": "2025-03-15T10:00:00Z",
    "customer": {
      "name": "Budi",
      "email": "budi@email.com"
    }
  }
}

Invoice status:

Status Meaning

paid payment success
unpaid waiting payment
pending processing
expired timeout



---

10. Product API

Cari produk dari Mayar.

Endpoint:

GET /hl/v1/product/search?keyword=produk

Response berisi:

id
name
price
slug
status
type
redirectUrl


---
[16/03/26 00.53] Sutansyah: 11. Dynamic QR Code

Endpoint:

POST /hl/v1/transaction/createdynamicqrcode

Digunakan untuk:

POS

membership

manual checkout

dynamic payment



---

12. Webhook

Webhook digunakan untuk menerima notifikasi pembayaran realtime.

Mayar akan mengirim:

POST
Content-Type: application/json

Payload example:

{
  "event": "payment.success",
  "data": {
    "id": "invoice-id",
    "status": "paid",
    "amount": 100000,
    "customer": {
      "name": "Budi",
      "email": "budi@email.com"
    },
    "payment": {
      "method": "QRIS",
      "referenceId": "ref-xxx"
    }
  }
}


---

13. Webhook Endpoints

Register webhook:

POST https://api.mayar.id/hl/v1/webhook/register

Test webhook:

POST https://api.mayar.id/hl/v1/webhook/test

Retry webhook:

POST https://api.mayar.id/hl/v1/webhook/retry


---

14. Webhook Events

Event Description

payment.success payment completed
payment.failed payment failed
payment.expired payment timeout
subscription.active subscription active
subscription.cancel subscription cancelled



---

15. Next.js Webhook Example

import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const body = await req.json()

  if (body.event === "payment.success") {
    const invoiceId = body.data.id

    // update order database
    // await updateOrder(invoiceId, "paid")
  }

  return NextResponse.json({ ok: true })
}


---

16. Webhook Verification

Mayar mengirim header:

x-mayar-signature

Contoh verifikasi:

import crypto from "crypto"

function verifyWebhook(payload: string, signature: string, secret: string) {
  const hash = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")

  return hash === signature
}


---

17. Recommended Backend Architecture

Flow integrasi yang direkomendasikan:

User klik bayar
↓
Frontend call backend API
↓
Backend call Mayar API
↓
Backend simpan order (PENDING)
↓
Frontend redirect ke Mayar checkout
↓
User bayar
↓
Mayar kirim webhook
↓
Backend update order = PAID


---

18. Backend API Structure

Contoh endpoint internal:

POST /api/mayar/create-payment
GET /api/mayar/products
GET /api/mayar/invoice/:id
POST /api/mayar/webhook
POST /api/mayar/webhook/test


---

19. Minimum Database Fields

Simpan minimal:

order_id
user_id
product_id
mayar_invoice_id
mayar_transaction_id
payment_link
amount
status
webhook_payload
created_at
paid_at


---

20. Security Rules (Important)

AI agent harus mengikuti aturan berikut:

1. API key hanya di server.


2. Jangan expose API key di frontend.


3. Semua request ke Mayar harus lewat backend.


4. Gunakan webhook untuk update status pembayaran.


5. Simpan raw webhook payload.


6. Gunakan idempotency key (invoice id / transaction id).




---

21. AI Agent Implementation Rules

Jika AI agent membuat code integrasi Mayar:

WAJIB:

gunakan server-side request

gunakan environment variables

simpan order ke database sebelum redirect

gunakan webhook untuk update status


DILARANG:

expose API key di client

memproses payment di frontend

polling API terus-menerus tanpa webhook



---

22. Example Payment Flow

User klik bayar
↓
frontend POST /api/mayar/create-payment
↓
backend call Mayar API
↓
backend return payment link
↓
frontend redirect user
↓
user bayar
↓
Mayar webhook
↓
backend update database


---

23. Documentation References

Official docs:

https://docs.mayar.id

Headless API:

https://api.mayar.id/headless/docs/

Important sections:

API Reference

Payment Link

Invoice

Webhook

Product Search

Dynamic QR Code



---

24. Best Practice

Gunakan:

webhook untuk status update

database reconciliation

retry webhook handling

error handling

request queue untuk rate limit



---
