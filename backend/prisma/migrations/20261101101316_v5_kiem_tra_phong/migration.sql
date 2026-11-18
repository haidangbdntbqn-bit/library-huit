BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[BookCopy] DROP CONSTRAINT [BookCopy_condition_df];
ALTER TABLE [dbo].[BookCopy] ADD CONSTRAINT [BookCopy_condition_df] DEFAULT 'Tốt' FOR [condition];

-- AlterTable
ALTER TABLE [dbo].[RoomBooking] ADD [damageFee] DECIMAL(18,2) NOT NULL CONSTRAINT [RoomBooking_damageFee_df] DEFAULT 0,
[inspectedBy] NVARCHAR(100),
[inspection] NVARCHAR(2000),
[roomCondition] NVARCHAR(20);

-- AlterTable
ALTER TABLE [dbo].[Violation] ADD [bookingId] INT;

-- CreateTable
CREATE TABLE [dbo].[AuditLog] (
    [id] INT NOT NULL IDENTITY(1,1),
    [userId] INT,
    [username] NVARCHAR(50),
    [role] NVARCHAR(20),
    [action] NVARCHAR(80) NOT NULL,
    [method] NVARCHAR(10) NOT NULL,
    [path] NVARCHAR(200) NOT NULL,
    [status] INT NOT NULL,
    [detail] NVARCHAR(1000),
    [ip] NVARCHAR(64),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AuditLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AuditLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[NotificationLog] (
    [id] INT NOT NULL IDENTITY(1,1),
    [readerId] INT NOT NULL,
    [kind] NVARCHAR(30) NOT NULL,
    [refKey] NVARCHAR(60) NOT NULL,
    [channel] NVARCHAR(10) NOT NULL CONSTRAINT [NotificationLog_channel_df] DEFAULT 'EMAIL',
    [toAddress] NVARCHAR(150),
    [subject] NVARCHAR(200) NOT NULL,
    [sent] BIT NOT NULL CONSTRAINT [NotificationLog_sent_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [NotificationLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [NotificationLog_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [NotificationLog_refKey_channel_key] UNIQUE NONCLUSTERED ([refKey],[channel])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_createdAt_idx] ON [dbo].[AuditLog]([createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_userId_idx] ON [dbo].[AuditLog]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [NotificationLog_readerId_idx] ON [dbo].[NotificationLog]([readerId]);

-- AddForeignKey
ALTER TABLE [dbo].[Violation] ADD CONSTRAINT [Violation_bookingId_fkey] FOREIGN KEY ([bookingId]) REFERENCES [dbo].[RoomBooking]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
