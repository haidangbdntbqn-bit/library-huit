BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[BookCopy] DROP CONSTRAINT [BookCopy_condition_df];
ALTER TABLE [dbo].[BookCopy] ADD CONSTRAINT [BookCopy_condition_df] DEFAULT 'Tốt' FOR [condition];

-- AlterTable
ALTER TABLE [dbo].[BorrowRequest] ADD [copyId] INT,
[loanType] NVARCHAR(10) NOT NULL CONSTRAINT [BorrowRequest_loanType_df] DEFAULT 'HOME';

-- AlterTable
ALTER TABLE [dbo].[LibraryCard] DROP CONSTRAINT [LibraryCard_status_df];
ALTER TABLE [dbo].[LibraryCard] ADD CONSTRAINT [LibraryCard_status_df] DEFAULT 'ACTIVE' FOR [status];

-- AlterTable
ALTER TABLE [dbo].[Major] ADD [facultyId] INT;

-- AlterTable
ALTER TABLE [dbo].[Material] ADD [category] NVARCHAR(20) NOT NULL CONSTRAINT [Material_category_df] DEFAULT 'BAI_GIANG';

-- CreateTable
CREATE TABLE [dbo].[Faculty] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] NVARCHAR(20) NOT NULL,
    [name] NVARCHAR(150) NOT NULL,
    [commissionRate] DECIMAL(5,2) NOT NULL CONSTRAINT [Faculty_commissionRate_df] DEFAULT 5,
    CONSTRAINT [Faculty_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Faculty_code_key] UNIQUE NONCLUSTERED ([code])
);

-- AddForeignKey
ALTER TABLE [dbo].[Major] ADD CONSTRAINT [Major_facultyId_fkey] FOREIGN KEY ([facultyId]) REFERENCES [dbo].[Faculty]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BorrowRequest] ADD CONSTRAINT [BorrowRequest_copyId_fkey] FOREIGN KEY ([copyId]) REFERENCES [dbo].[BookCopy]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
