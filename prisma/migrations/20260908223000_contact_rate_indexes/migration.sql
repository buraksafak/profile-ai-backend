-- CreateIndex
CREATE INDEX "contact_messages_ip_address_created_at_idx" ON "contact_messages"("ip_address", "created_at");

-- CreateIndex
CREATE INDEX "contact_messages_email_created_at_idx" ON "contact_messages"("email", "created_at");
