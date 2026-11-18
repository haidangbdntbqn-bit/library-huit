BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Major] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] NVARCHAR(20) NOT NULL,
    [name] NVARCHAR(150) NOT NULL,
    CONSTRAINT [Major_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Major_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[Setting] (
    [key] NVARCHAR(50) NOT NULL,
    [value] NVARCHAR(200) NOT NULL,
    CONSTRAINT [Setting_pkey] PRIMARY KEY CLUSTERED ([key])
);

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] INT NOT NULL IDENTITY(1,1),
    [username] NVARCHAR(50) NOT NULL,
    [passwordHash] NVARCHAR(200) NOT NULL,
    [fullName] NVARCHAR(150) NOT NULL,
    [email] NVARCHAR(150),
    [phone] NVARCHAR(20),
    [role] NVARCHAR(20) NOT NULL CONSTRAINT [User_role_df] DEFAULT 'READER',
    [isActive] BIT NOT NULL CONSTRAINT [User_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_username_key] UNIQUE NONCLUSTERED ([username])
);

-- CreateTable
CREATE TABLE [dbo].[Reader] (
    [id] INT NOT NULL IDENTITY(1,1),
    [userId] INT NOT NULL,
    [studentCode] NVARCHAR(20) NOT NULL,
    [readerType] NVARCHAR(20) NOT NULL CONSTRAINT [Reader_readerType_df] DEFAULT 'STUDENT',
    [majorId] INT,
    [className] NVARCHAR(30),
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [Reader_status_df] DEFAULT 'ACTIVE',
    [maxBooks] INT NOT NULL CONSTRAINT [Reader_maxBooks_df] DEFAULT 5,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Reader_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Reader_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Reader_userId_key] UNIQUE NONCLUSTERED ([userId]),
    CONSTRAINT [Reader_studentCode_key] UNIQUE NONCLUSTERED ([studentCode])
);

-- CreateTable
CREATE TABLE [dbo].[LibraryCard] (
    [id] INT NOT NULL IDENTITY(1,1),
    [readerId] INT NOT NULL,
    [cardNumber] NVARCHAR(30),
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [LibraryCard_status_df] DEFAULT 'PENDING',
    [requestedAt] DATETIME2 NOT NULL CONSTRAINT [LibraryCard_requestedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [issuedAt] DATETIME2,
    [expiresAt] DATETIME2,
    [note] NVARCHAR(300),
    CONSTRAINT [LibraryCard_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [LibraryCard_readerId_key] UNIQUE NONCLUSTERED ([readerId])
);

-- CreateTable
CREATE TABLE [dbo].[Staff] (
    [id] INT NOT NULL IDENTITY(1,1),
    [userId] INT NOT NULL,
    [staffCode] NVARCHAR(20) NOT NULL,
    [position] NVARCHAR(100) NOT NULL,
    [hiredAt] DATETIME2,
    CONSTRAINT [Staff_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Staff_userId_key] UNIQUE NONCLUSTERED ([userId]),
    CONSTRAINT [Staff_staffCode_key] UNIQUE NONCLUSTERED ([staffCode])
);

-- CreateTable
CREATE TABLE [dbo].[Book] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] NVARCHAR(30) NOT NULL,
    [title] NVARCHAR(300) NOT NULL,
    [author] NVARCHAR(200) NOT NULL,
    [publisher] NVARCHAR(200),
    [publishYear] INT,
    [isbn] NVARCHAR(20),
    [docType] NVARCHAR(20) NOT NULL,
    [majorId] INT,
    [shelf] NVARCHAR(30),
    [description] NVARCHAR(max),
    [coverUrl] NVARCHAR(500),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Book_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Book_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Book_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[BookCopy] (
    [id] INT NOT NULL IDENTITY(1,1),
    [barcode] NVARCHAR(40) NOT NULL,
    [bookId] INT NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [BookCopy_status_df] DEFAULT 'AVAILABLE',
    [onsiteOnly] BIT NOT NULL CONSTRAINT [BookCopy_onsiteOnly_df] DEFAULT 0,
    [condition] NVARCHAR(100) NOT NULL CONSTRAINT [BookCopy_condition_df] DEFAULT 'Tốt',
    [importId] INT,
    [liquidationId] INT,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [BookCopy_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [BookCopy_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [BookCopy_barcode_key] UNIQUE NONCLUSTERED ([barcode])
);

-- CreateTable
CREATE TABLE [dbo].[BookImport] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] NVARCHAR(30) NOT NULL,
    [staffId] INT NOT NULL,
    [supplier] NVARCHAR(200),
    [totalCost] DECIMAL(18,2) NOT NULL CONSTRAINT [BookImport_totalCost_df] DEFAULT 0,
    [note] NVARCHAR(500),
    [importedAt] DATETIME2 NOT NULL CONSTRAINT [BookImport_importedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [BookImport_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [BookImport_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[Liquidation] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] NVARCHAR(30) NOT NULL,
    [staffId] INT NOT NULL,
    [reason] NVARCHAR(500) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Liquidation_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Liquidation_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Liquidation_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[BorrowRequest] (
    [id] INT NOT NULL IDENTITY(1,1),
    [readerId] INT NOT NULL,
    [bookId] INT NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [BorrowRequest_status_df] DEFAULT 'PENDING',
    [note] NVARCHAR(300),
    [pickupBefore] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [BorrowRequest_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [handledAt] DATETIME2,
    CONSTRAINT [BorrowRequest_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Loan] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] NVARCHAR(30) NOT NULL,
    [readerId] INT NOT NULL,
    [staffId] INT,
    [loanType] NVARCHAR(10) NOT NULL,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [Loan_status_df] DEFAULT 'BORROWING',
    [note] NVARCHAR(300),
    [borrowedAt] DATETIME2 NOT NULL CONSTRAINT [Loan_borrowedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Loan_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Loan_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[LoanItem] (
    [id] INT NOT NULL IDENTITY(1,1),
    [loanId] INT NOT NULL,
    [copyId] INT NOT NULL,
    [dueAt] DATETIME2 NOT NULL,
    [renewCount] INT NOT NULL CONSTRAINT [LoanItem_renewCount_df] DEFAULT 0,
    [returnedAt] DATETIME2,
    [returnCondition] NVARCHAR(20),
    [fine] DECIMAL(18,2) NOT NULL CONSTRAINT [LoanItem_fine_df] DEFAULT 0,
    CONSTRAINT [LoanItem_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Violation] (
    [id] INT NOT NULL IDENTITY(1,1),
    [readerId] INT NOT NULL,
    [loanItemId] INT,
    [type] NVARCHAR(20) NOT NULL,
    [description] NVARCHAR(500) NOT NULL,
    [fineAmount] DECIMAL(18,2) NOT NULL CONSTRAINT [Violation_fineAmount_df] DEFAULT 0,
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [Violation_status_df] DEFAULT 'UNPAID',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Violation_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [resolvedAt] DATETIME2,
    CONSTRAINT [Violation_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Room] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] NVARCHAR(20) NOT NULL,
    [name] NVARCHAR(100) NOT NULL,
    [roomType] NVARCHAR(20) NOT NULL,
    [capacity] INT NOT NULL,
    [floor] NVARCHAR(20),
    [equipment] NVARCHAR(300),
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [Room_status_df] DEFAULT 'AVAILABLE',
    CONSTRAINT [Room_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Room_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[RoomBooking] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] NVARCHAR(30) NOT NULL,
    [roomId] INT NOT NULL,
    [readerId] INT NOT NULL,
    [startTime] DATETIME2 NOT NULL,
    [endTime] DATETIME2 NOT NULL,
    [people] INT NOT NULL,
    [purpose] NVARCHAR(300),
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [RoomBooking_status_df] DEFAULT 'PENDING',
    [note] NVARCHAR(300),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [RoomBooking_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [checkedInAt] DATETIME2,
    [checkedOutAt] DATETIME2,
    CONSTRAINT [RoomBooking_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [RoomBooking_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[Material] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] NVARCHAR(30) NOT NULL,
    [title] NVARCHAR(300) NOT NULL,
    [lecturer] NVARCHAR(150),
    [majorId] INT,
    [format] NVARCHAR(10) NOT NULL CONSTRAINT [Material_format_df] DEFAULT 'PRINT',
    [price] DECIMAL(18,2) NOT NULL,
    [stock] INT NOT NULL CONSTRAINT [Material_stock_df] DEFAULT 0,
    [description] NVARCHAR(max),
    [isActive] BIT NOT NULL CONSTRAINT [Material_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Material_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Material_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Material_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[Order] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] NVARCHAR(30) NOT NULL,
    [readerId] INT NOT NULL,
    [totalAmount] DECIMAL(18,2) NOT NULL,
    [paymentMethod] NVARCHAR(20) NOT NULL CONSTRAINT [Order_paymentMethod_df] DEFAULT 'CASH',
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [Order_status_df] DEFAULT 'PENDING',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Order_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [paidAt] DATETIME2,
    CONSTRAINT [Order_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Order_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[OrderItem] (
    [id] INT NOT NULL IDENTITY(1,1),
    [orderId] INT NOT NULL,
    [materialId] INT NOT NULL,
    [quantity] INT NOT NULL,
    [unitPrice] DECIMAL(18,2) NOT NULL,
    CONSTRAINT [OrderItem_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ChatLog] (
    [id] INT NOT NULL IDENTITY(1,1),
    [userId] INT,
    [sessionId] NVARCHAR(80) NOT NULL,
    [message] NVARCHAR(1000) NOT NULL,
    [reply] NVARCHAR(max) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ChatLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ChatLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[Reader] ADD CONSTRAINT [Reader_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Reader] ADD CONSTRAINT [Reader_majorId_fkey] FOREIGN KEY ([majorId]) REFERENCES [dbo].[Major]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LibraryCard] ADD CONSTRAINT [LibraryCard_readerId_fkey] FOREIGN KEY ([readerId]) REFERENCES [dbo].[Reader]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Staff] ADD CONSTRAINT [Staff_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Book] ADD CONSTRAINT [Book_majorId_fkey] FOREIGN KEY ([majorId]) REFERENCES [dbo].[Major]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BookCopy] ADD CONSTRAINT [BookCopy_bookId_fkey] FOREIGN KEY ([bookId]) REFERENCES [dbo].[Book]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BookCopy] ADD CONSTRAINT [BookCopy_importId_fkey] FOREIGN KEY ([importId]) REFERENCES [dbo].[BookImport]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BookCopy] ADD CONSTRAINT [BookCopy_liquidationId_fkey] FOREIGN KEY ([liquidationId]) REFERENCES [dbo].[Liquidation]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BookImport] ADD CONSTRAINT [BookImport_staffId_fkey] FOREIGN KEY ([staffId]) REFERENCES [dbo].[Staff]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Liquidation] ADD CONSTRAINT [Liquidation_staffId_fkey] FOREIGN KEY ([staffId]) REFERENCES [dbo].[Staff]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BorrowRequest] ADD CONSTRAINT [BorrowRequest_readerId_fkey] FOREIGN KEY ([readerId]) REFERENCES [dbo].[Reader]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[BorrowRequest] ADD CONSTRAINT [BorrowRequest_bookId_fkey] FOREIGN KEY ([bookId]) REFERENCES [dbo].[Book]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Loan] ADD CONSTRAINT [Loan_readerId_fkey] FOREIGN KEY ([readerId]) REFERENCES [dbo].[Reader]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Loan] ADD CONSTRAINT [Loan_staffId_fkey] FOREIGN KEY ([staffId]) REFERENCES [dbo].[Staff]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LoanItem] ADD CONSTRAINT [LoanItem_loanId_fkey] FOREIGN KEY ([loanId]) REFERENCES [dbo].[Loan]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[LoanItem] ADD CONSTRAINT [LoanItem_copyId_fkey] FOREIGN KEY ([copyId]) REFERENCES [dbo].[BookCopy]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Violation] ADD CONSTRAINT [Violation_readerId_fkey] FOREIGN KEY ([readerId]) REFERENCES [dbo].[Reader]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Violation] ADD CONSTRAINT [Violation_loanItemId_fkey] FOREIGN KEY ([loanItemId]) REFERENCES [dbo].[LoanItem]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RoomBooking] ADD CONSTRAINT [RoomBooking_roomId_fkey] FOREIGN KEY ([roomId]) REFERENCES [dbo].[Room]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[RoomBooking] ADD CONSTRAINT [RoomBooking_readerId_fkey] FOREIGN KEY ([readerId]) REFERENCES [dbo].[Reader]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Material] ADD CONSTRAINT [Material_majorId_fkey] FOREIGN KEY ([majorId]) REFERENCES [dbo].[Major]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Order] ADD CONSTRAINT [Order_readerId_fkey] FOREIGN KEY ([readerId]) REFERENCES [dbo].[Reader]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[OrderItem] ADD CONSTRAINT [OrderItem_orderId_fkey] FOREIGN KEY ([orderId]) REFERENCES [dbo].[Order]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[OrderItem] ADD CONSTRAINT [OrderItem_materialId_fkey] FOREIGN KEY ([materialId]) REFERENCES [dbo].[Material]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ChatLog] ADD CONSTRAINT [ChatLog_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
