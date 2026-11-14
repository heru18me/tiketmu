-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'ORGANIZER');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('WAITING_PAYMENT', 'WAITING_CONFIRMATION', 'DONE', 'REJECTED', 'EXPIRED', 'CANCELED');

-- CreateEnum
CREATE TYPE "PointSourceType" AS ENUM ('REFERRAL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "avatar" TEXT,
    "referralCode" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "event_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "availableSeats" INTEGER NOT NULL,
    "totalSeats" INTEGER NOT NULL,
    "price" INTEGER NOT NULL DEFAULT 0,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "imageUrl" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_types" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "availableSeats" INTEGER NOT NULL,
    "totalSeats" INTEGER NOT NULL,
    "description" TEXT,

    CONSTRAINT "ticket_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vouchers" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discount" INTEGER NOT NULL,
    "discountType" "DiscountType" NOT NULL DEFAULT 'PERCENTAGE',
    "maxUsage" INTEGER NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discount" INTEGER NOT NULL,
    "discountType" "DiscountType" NOT NULL DEFAULT 'PERCENTAGE',
    "expiredAt" TIMESTAMP(3) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "voucherId" TEXT,
    "couponId" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'WAITING_PAYMENT',
    "totalAmount" INTEGER NOT NULL,
    "finalAmount" INTEGER NOT NULL,
    "pointsUsed" INTEGER NOT NULL DEFAULT 0,
    "voucherDiscount" INTEGER NOT NULL DEFAULT 0,
    "couponDiscount" INTEGER NOT NULL DEFAULT 0,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "paymentDeadline" TIMESTAMP(3) NOT NULL,
    "confirmDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_details" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "ticketTypeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,

    CONSTRAINT "transaction_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_proofs" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_proofs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "points" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "expiredAt" TIMESTAMP(3) NOT NULL,
    "isExpired" BOOLEAN NOT NULL DEFAULT false,
    "sourceType" "PointSourceType" NOT NULL DEFAULT 'REFERRAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "giverId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_referralCode_key" ON "users"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "event_categories_name_key" ON "event_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_code_key" ON "vouchers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_couponId_key" ON "transactions"("couponId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_proofs_transactionId_key" ON "payment_proofs"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_receiverId_key" ON "referrals"("receiverId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_userId_eventId_key" ON "reviews"("userId", "eventId");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "event_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_types" ADD CONSTRAINT "ticket_types_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_details" ADD CONSTRAINT "transaction_details_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_details" ADD CONSTRAINT "transaction_details_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "ticket_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points" ADD CONSTRAINT "points_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_giverId_fkey" FOREIGN KEY ("giverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
