import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsOcrToDocument20260903234000 implements MigrationInterface {
  name = 'AddIsOcrToDocument20260903234000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Document]') AND type in (N'U'))
      BEGIN
        -- 1. Add IsOCR column if it doesn't already exist
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'IsOCR' AND Object_ID = Object_ID(N'[dbo].[Document]'))
        BEGIN
          ALTER TABLE [dbo].[Document] ADD [IsOCR] BIT NOT NULL CONSTRAINT [DF_Document_IsOCR] DEFAULT 0;
        END

        -- 2. Backfill existing OCR documents so previous uploads are retained
        UPDATE [dbo].[Document]
        SET [IsOCR] = 1
        WHERE [Category] IN ('COMPOSITE', 'OCR')
           OR [Notes] LIKE 'OCR%'
           OR ([OCRText] IS NOT NULL AND [OCRText] <> '');

        -- 3. Create composite index for optimal reconciliation cron queries
        IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_Document_IsOCR_OCRProcessed' AND object_id = OBJECT_ID(N'[dbo].[Document]'))
        BEGIN
          CREATE NONCLUSTERED INDEX [IX_Document_IsOCR_OCRProcessed] 
          ON [dbo].[Document] ([IsOCR], [OCRProcessed], [DeletedDate], [CreatedDate]);
        END
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_Document_IsOCR_OCRProcessed' AND object_id = OBJECT_ID(N'[dbo].[Document]'))
      BEGIN
        DROP INDEX [IX_Document_IsOCR_OCRProcessed] ON [dbo].[Document];
      END

      IF EXISTS (SELECT * FROM sys.columns WHERE Name = N'IsOCR' AND Object_ID = Object_ID(N'[dbo].[Document]'))
      BEGIN
        -- Drop default constraint first
        DECLARE @ConstraintName NVARCHAR(200);
        SELECT @ConstraintName = d.name
        FROM sys.default_constraints d
        JOIN sys.columns c ON d.parent_column_id = c.column_id AND d.parent_object_id = c.object_id
        WHERE c.name = N'IsOCR' AND c.object_id = OBJECT_ID(N'[dbo].[Document]');

        IF @ConstraintName IS NOT NULL
        BEGIN
          EXEC('ALTER TABLE [dbo].[Document] DROP CONSTRAINT ' + @ConstraintName);
        END

        ALTER TABLE [dbo].[Document] DROP COLUMN [IsOCR];
      END
    `);
  }
}
