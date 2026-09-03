import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOcrTablesAndColumns20260903140500 implements MigrationInterface {
  name = 'CreateOcrTablesAndColumns20260903140500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Ensure OCRRequestHistory table exists with default NEWID() for Id
    await queryRunner.query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[OCRRequestHistory]') AND type in (N'U'))
      BEGIN
        CREATE TABLE [dbo].[OCRRequestHistory] (
          [Id] NVARCHAR(36) NOT NULL CONSTRAINT [DF_OCRRequestHistory_Id] DEFAULT NEWID(),
          [DocumentId] NVARCHAR(36) NOT NULL,
          [UserId] NVARCHAR(36) NOT NULL,
          [Response] NVARCHAR(MAX) NULL,
          [Payload] NVARCHAR(MAX) NULL,
          [ErrorMessage] NVARCHAR(MAX) NULL,
          [Status] NVARCHAR(100) NOT NULL,
          [Timestamp] DATETIMEOFFSET NOT NULL CONSTRAINT [DF_OCRRequestHistory_Timestamp] DEFAULT SYSDATETIMEOFFSET(),
          CONSTRAINT [PK_OCRRequestHistory] PRIMARY KEY CLUSTERED ([Id] ASC)
        );

        CREATE NONCLUSTERED INDEX [IX_OCRRequestHistory_DocumentId] ON [dbo].[OCRRequestHistory] ([DocumentId]);
        CREATE NONCLUSTERED INDEX [IX_OCRRequestHistory_UserId] ON [dbo].[OCRRequestHistory] ([UserId]);
        CREATE NONCLUSTERED INDEX [IX_OCRRequestHistory_Status] ON [dbo].[OCRRequestHistory] ([Status]);
        CREATE NONCLUSTERED INDEX [IX_OCRRequestHistory_Timestamp] ON [dbo].[OCRRequestHistory] ([Timestamp]);
      END
      ELSE
      BEGIN
        IF NOT EXISTS (
          SELECT * FROM sys.default_constraints
          WHERE parent_object_id = OBJECT_ID(N'[dbo].[OCRRequestHistory]')
            AND parent_column_id = COLUMNPROPERTY(OBJECT_ID(N'[dbo].[OCRRequestHistory]'), 'Id', 'ColumnId')
        )
        BEGIN
          ALTER TABLE [dbo].[OCRRequestHistory] ADD CONSTRAINT [DF_OCRRequestHistory_Id] DEFAULT NEWID() FOR [Id];
        END
      END
    `);

    // 2. Ensure ExtractedFields table exists with default NEWID() for Id
    await queryRunner.query(`
      IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ExtractedFields]') AND type in (N'U'))
      BEGIN
        CREATE TABLE [dbo].[ExtractedFields] (
          [Id] NVARCHAR(36) NOT NULL CONSTRAINT [DF_ExtractedFields_Id] DEFAULT NEWID(),
          [DocumentId] NVARCHAR(36) NOT NULL,
          [Field] NVARCHAR(255) NOT NULL,
          [Value] NVARCHAR(MAX) NULL,
          [Confidence] DECIMAL(5, 2) NULL,
          [IsUserModified] BIT NOT NULL CONSTRAINT [DF_ExtractedFields_IsUserModified] DEFAULT 0,
          [ExtractedDate] DATETIMEOFFSET NULL,
          [CreatedDate] DATETIME NOT NULL CONSTRAINT [DF_ExtractedFields_CreatedDate] DEFAULT GETUTCDATE(),
          [UpdatedDate] DATETIME NULL,
          [DeletedDate] DATETIME NULL,
          CONSTRAINT [PK_ExtractedFields] PRIMARY KEY CLUSTERED ([Id] ASC)
        );

        CREATE NONCLUSTERED INDEX [IX_ExtractedFields_DocumentId] ON [dbo].[ExtractedFields] ([DocumentId]);
        CREATE NONCLUSTERED INDEX [IX_ExtractedFields_Field] ON [dbo].[ExtractedFields] ([Field]);
      END
      ELSE
      BEGIN
        IF NOT EXISTS (
          SELECT * FROM sys.default_constraints
          WHERE parent_object_id = OBJECT_ID(N'[dbo].[ExtractedFields]')
            AND parent_column_id = COLUMNPROPERTY(OBJECT_ID(N'[dbo].[ExtractedFields]'), 'Id', 'ColumnId')
        )
        BEGIN
          ALTER TABLE [dbo].[ExtractedFields] ADD CONSTRAINT [DF_ExtractedFields_Id] DEFAULT NEWID() FOR [Id];
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'Field' AND Object_ID = Object_ID(N'[dbo].[ExtractedFields]'))
        BEGIN
          ALTER TABLE [dbo].[ExtractedFields] ADD [Field] NVARCHAR(255) NULL;
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'Value' AND Object_ID = Object_ID(N'[dbo].[ExtractedFields]'))
        BEGIN
          ALTER TABLE [dbo].[ExtractedFields] ADD [Value] NVARCHAR(MAX) NULL;
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'IsUserModified' AND Object_ID = Object_ID(N'[dbo].[ExtractedFields]'))
        BEGIN
          ALTER TABLE [dbo].[ExtractedFields] ADD [IsUserModified] BIT NOT NULL CONSTRAINT [DF_ExtractedFields_IsUserModified_Alt] DEFAULT 0;
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'ExtractedDate' AND Object_ID = Object_ID(N'[dbo].[ExtractedFields]'))
        BEGIN
          ALTER TABLE [dbo].[ExtractedFields] ADD [ExtractedDate] DATETIMEOFFSET NULL;
        END
      END
    `);

    // 3. Ensure Document table OCR columns exist
    await queryRunner.query(`
      IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Document]') AND type in (N'U'))
      BEGIN
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'OCRProcessed' AND Object_ID = Object_ID(N'[dbo].[Document]'))
        BEGIN
          ALTER TABLE [dbo].[Document] ADD [OCRProcessed] BIT NOT NULL CONSTRAINT [DF_Document_OCRProcessed] DEFAULT 0;
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'OCRText' AND Object_ID = Object_ID(N'[dbo].[Document]'))
        BEGIN
          ALTER TABLE [dbo].[Document] ADD [OCRText] NVARCHAR(255) NULL;
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'OCRConfidence' AND Object_ID = Object_ID(N'[dbo].[Document]'))
        BEGIN
          ALTER TABLE [dbo].[Document] ADD [OCRConfidence] DECIMAL(5, 2) NULL;
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'OCRProcessFailedReason' AND Object_ID = Object_ID(N'[dbo].[Document]'))
        BEGIN
          ALTER TABLE [dbo].[Document] ADD [OCRProcessFailedReason] NVARCHAR(255) NULL;
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'OCRProcessedDate' AND Object_ID = Object_ID(N'[dbo].[Document]'))
        BEGIN
          ALTER TABLE [dbo].[Document] ADD [OCRProcessedDate] DATETIME NULL;
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'TransactionServiceId' AND Object_ID = Object_ID(N'[dbo].[Document]'))
        BEGIN
          ALTER TABLE [dbo].[Document] ADD [TransactionServiceId] NVARCHAR(36) NULL;
        END
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[OCRRequestHistory]') AND type in (N'U'))
      BEGIN
        DROP TABLE [dbo].[OCRRequestHistory];
      END
    `);
  }
}
