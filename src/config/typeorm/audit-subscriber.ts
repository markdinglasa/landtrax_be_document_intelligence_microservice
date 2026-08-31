import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
} from 'typeorm';


@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
  async setSessionContext(queryRunner: any) {
    if (!queryRunner) return;
    
    const userId = 'SYSTEM';
    const ipAddr = '127.0.0.1';

    // We only need to set it once per transaction/query runner, but setting it before every DML is safe.
    try {
      await queryRunner.query(
        `EXEC sp_set_session_context @key=N'UserID', @value=@0;
         EXEC sp_set_session_context @key=N'IPAddr', @value=@1;`,
        [userId, ipAddr],
      );
    } catch (e) {
      console.error('Failed to set session context:', e);
    }
  }

  async beforeInsert(event: InsertEvent<any>) {
    await this.setSessionContext(event.queryRunner);
  }

  async beforeUpdate(event: UpdateEvent<any>) {
    await this.setSessionContext(event.queryRunner);
  }

  async beforeRemove(event: RemoveEvent<any>) {
    await this.setSessionContext(event.queryRunner);
  }
}
