import TransactionEntity from '../transaction-entity';
import TransactionServiceEntity from '../transaction-service-entity';

describe('TransactionEntity', () => {
  let transaction: TransactionEntity;

  beforeEach(() => {
    transaction = new TransactionEntity();
  });

  describe('setIsAllServicesMatch', () => {
    it('should be true when there are no services', () => {
      transaction.transactionServices = [];
      transaction.setIsAllServicesMatch();
      expect(transaction.isAllServicesMatch).toBe(true);
    });

    it('should be true when only non-EOS services exist', () => {
      const ts = new TransactionServiceEntity();
      ts.isEOS = false;
      transaction.transactionServices = [ts];
      transaction.setIsAllServicesMatch();
      expect(transaction.isAllServicesMatch).toBe(true);
    });

    it('should be true when only EOS services exist', () => {
      const ts = new TransactionServiceEntity();
      ts.isEOS = true;
      transaction.transactionServices = [ts];
      transaction.setIsAllServicesMatch();
      expect(transaction.isAllServicesMatch).toBe(true);
    });

    it('should be true when sets match (single service)', () => {
      const ts1 = new TransactionServiceEntity();
      ts1.isEOS = false;
      ts1.serviceName = 'Service A';
      ts1.totalServiceAmount = 100;

      const ts2 = new TransactionServiceEntity();
      ts2.isEOS = true;
      ts2.serviceName = 'Service A';
      ts2.totalEOSAmount = 100;

      transaction.transactionServices = [ts1, ts2];
      transaction.setIsAllServicesMatch();
      expect(transaction.isAllServicesMatch).toBe(true);
    });

    it('should be true when sets match (multiple services)', () => {
      const ts1 = new TransactionServiceEntity();
      ts1.isEOS = false;
      ts1.serviceName = 'Service A';
      ts1.totalServiceAmount = 100;

      const ts2 = new TransactionServiceEntity();
      ts2.isEOS = false;
      ts2.serviceName = 'Service B';
      ts2.totalServiceAmount = 200;

      const eos1 = new TransactionServiceEntity();
      eos1.isEOS = true;
      eos1.serviceName = 'Service A';
      eos1.totalEOSAmount = 100;

      const eos2 = new TransactionServiceEntity();
      eos2.isEOS = true;
      eos2.serviceName = 'Service B';
      eos2.totalEOSAmount = 200;

      transaction.transactionServices = [ts1, ts2, eos1, eos2];
      transaction.setIsAllServicesMatch();
      expect(transaction.isAllServicesMatch).toBe(true);
    });

    it('should be true when sets match but in different order', () => {
      const ts1 = new TransactionServiceEntity();
      ts1.isEOS = false;
      ts1.serviceName = 'Service A';
      ts1.totalServiceAmount = 100;

      const ts2 = new TransactionServiceEntity();
      ts2.isEOS = false;
      ts2.serviceName = 'Service B';
      ts2.totalServiceAmount = 200;

      const eos1 = new TransactionServiceEntity();
      eos1.isEOS = true;
      eos1.serviceName = 'Service B';
      eos1.totalEOSAmount = 200;

      const eos2 = new TransactionServiceEntity();
      eos2.isEOS = true;
      eos2.serviceName = 'Service A';
      eos2.totalEOSAmount = 100;

      transaction.transactionServices = [ts1, ts2, eos1, eos2];
      transaction.setIsAllServicesMatch();
      expect(transaction.isAllServicesMatch).toBe(true);
    });

    it('should be false when service names mismatch', () => {
      const ts1 = new TransactionServiceEntity();
      ts1.isEOS = false;
      ts1.serviceName = 'Service A';
      ts1.totalServiceAmount = 100;

      const eos1 = new TransactionServiceEntity();
      eos1.isEOS = true;
      eos1.serviceName = 'Service B';
      eos1.totalEOSAmount = 100;

      transaction.transactionServices = [ts1, eos1];
      transaction.setIsAllServicesMatch();
      expect(transaction.isAllServicesMatch).toBe(false);
    });

    it('should be false when amounts mismatch', () => {
      const ts1 = new TransactionServiceEntity();
      ts1.isEOS = false;
      ts1.serviceName = 'Service A';
      ts1.totalServiceAmount = 100;

      const eos1 = new TransactionServiceEntity();
      eos1.isEOS = true;
      eos1.serviceName = 'Service A';
      eos1.totalEOSAmount = 101;

      transaction.transactionServices = [ts1, eos1];
      transaction.setIsAllServicesMatch();
      expect(transaction.isAllServicesMatch).toBe(false);
    });

    it('should be false when counts mismatch', () => {
      const ts1 = new TransactionServiceEntity();
      ts1.isEOS = false;
      ts1.serviceName = 'Service A';
      ts1.totalServiceAmount = 100;

      const ts2 = new TransactionServiceEntity();
      ts2.isEOS = false;
      ts2.serviceName = 'Service A';
      ts2.totalServiceAmount = 100;

      const eos1 = new TransactionServiceEntity();
      eos1.isEOS = true;
      eos1.serviceName = 'Service A';
      eos1.totalEOSAmount = 100;

      transaction.transactionServices = [ts1, ts2, eos1];
      transaction.setIsAllServicesMatch();
      expect(transaction.isAllServicesMatch).toBe(false);
    });

    it('should be false when quantity mismatches', () => {
      const ts1 = new TransactionServiceEntity();
      ts1.isEOS = false;
      ts1.serviceName = 'Service A';
      ts1.quantity = 1;
      ts1.totalServiceAmount = 700;

      const eos1 = new TransactionServiceEntity();
      eos1.isEOS = true;
      eos1.serviceName = 'Service A';
      eos1.quantity = 10;
      eos1.totalEOSAmount = 700;

      transaction.transactionServices = [ts1, eos1];
      transaction.setIsAllServicesMatch();
      expect(transaction.isAllServicesMatch).toBe(false);
    });

    it('should be false when discount mismatches', () => {
      const ts1 = new TransactionServiceEntity();
      ts1.isEOS = false;
      ts1.serviceName = 'Service A';
      ts1.discount = 0;
      ts1.totalServiceAmount = 700;

      const eos1 = new TransactionServiceEntity();
      eos1.isEOS = true;
      eos1.serviceName = 'Service A';
      eos1.discount = 30;
      eos1.totalEOSAmount = 700;

      transaction.transactionServices = [ts1, eos1];
      transaction.setIsAllServicesMatch();
      expect(transaction.isAllServicesMatch).toBe(false);
    });

    it('should be false when service fee mismatches', () => {
      const ts1 = new TransactionServiceEntity();
      ts1.isEOS = false;
      ts1.serviceName = 'Service A';
      ts1.serviceFee = 100;
      ts1.totalServiceAmount = 700;

      const eos1 = new TransactionServiceEntity();
      eos1.isEOS = true;
      eos1.serviceName = 'Service A';
      eos1.serviceFee = 70;
      eos1.totalEOSAmount = 700;

      transaction.transactionServices = [ts1, eos1];
      transaction.setIsAllServicesMatch();
      expect(transaction.isAllServicesMatch).toBe(false);
    });

    it('should be true when 1 EOS with qty 3 matches 3 Transaction Services with default qty 1', () => {
      const eos1 = new TransactionServiceEntity();
      eos1.isEOS = true;
      eos1.serviceName = 'Title Traceback';
      eos1.quantity = 3;
      eos1.discount = 30;
      eos1.serviceFee = 100;
      eos1.totalEOSAmount = 235.2;

      const ts1 = new TransactionServiceEntity();
      ts1.isEOS = false;
      ts1.serviceName = 'Title Traceback';
      ts1.discount = 30;
      ts1.serviceFee = 100;
      ts1.totalServiceAmount = 78.4;

      const ts2 = new TransactionServiceEntity();
      ts2.isEOS = false;
      ts2.serviceName = 'Title Traceback';
      ts2.discount = 30;
      ts2.serviceFee = 100;
      ts2.totalServiceAmount = 78.4;

      const ts3 = new TransactionServiceEntity();
      ts3.isEOS = false;
      ts3.serviceName = 'Title Traceback';
      ts3.discount = 30;
      ts3.serviceFee = 100;
      ts3.totalServiceAmount = 78.4;

      transaction.transactionServices = [eos1, ts1, ts2, ts3];
      transaction.setIsAllServicesMatch();
      expect(transaction.isAllServicesMatch).toBe(true);
    });

    it('should be false for Scenario 1: Quantity Mismatch with Compensating Unit Price', () => {
      // EOS: 10 Title Tracebacks * $10.00 each = $100.00 total
      const eos1 = new TransactionServiceEntity();
      eos1.isEOS = true;
      eos1.serviceName = 'Title Traceback';
      eos1.quantity = 10;
      eos1.serviceFee = 10;
      eos1.totalEOSAmount = 100;

      // TS: 1 Title Traceback * $100.00 = $100.00 total
      const ts1 = new TransactionServiceEntity();
      ts1.isEOS = false;
      ts1.serviceName = 'Title Traceback';
      ts1.quantity = 1;
      ts1.serviceFee = 100;
      ts1.totalServiceAmount = 100;

      transaction.transactionServices = [eos1, ts1];
      transaction.setIsAllServicesMatch();
      expect(transaction.isAllServicesMatch).toBe(false);
    });

    it('should be false for Scenario 2: Discount Evasion / Offsetting', () => {
      // EOS: 10 Title Tracebacks * $100.00 each with 30% discount = $700.00 net total
      const eos1 = new TransactionServiceEntity();
      eos1.isEOS = true;
      eos1.serviceName = 'Title Traceback';
      eos1.quantity = 10;
      eos1.serviceFee = 100;
      eos1.discount = 30;
      eos1.totalEOSAmount = 700;

      // TS: 10 Title Tracebacks * $70.00 each with 0% discount = $700.00 net total
      const ts1 = new TransactionServiceEntity();
      ts1.isEOS = false;
      ts1.serviceName = 'Title Traceback';
      ts1.quantity = 10;
      ts1.serviceFee = 70;
      ts1.discount = 0;
      ts1.totalServiceAmount = 700;

      transaction.transactionServices = [eos1, ts1];
      transaction.setIsAllServicesMatch();
      expect(transaction.isAllServicesMatch).toBe(false);
    });

    it('should be false for Scenario 3: Ambiguous Sorting with Duplicate Service Names', () => {
      // EOS:
      // Title Traceback (Qty: 10, Discount: 30%, Fee: 100) -> Total: $700.00
      // Title Traceback (Qty: 2, Discount: 0%, Fee: 100) -> Total: $200.00
      const eos1 = new TransactionServiceEntity();
      eos1.isEOS = true;
      eos1.serviceName = 'Title Traceback';
      eos1.quantity = 10;
      eos1.serviceFee = 100;
      eos1.discount = 30;
      eos1.totalEOSAmount = 700;

      const eos2 = new TransactionServiceEntity();
      eos2.isEOS = true;
      eos2.serviceName = 'Title Traceback';
      eos2.quantity = 2;
      eos2.serviceFee = 100;
      eos2.discount = 0;
      eos2.totalEOSAmount = 200;

      // TS:
      // Title Traceback (Qty: 1, Discount: 0%, Fee: 700) -> Total: $700.00
      // Title Traceback (Qty: 2, Discount: 0%, Fee: 100) -> Total: $200.00
      const ts1 = new TransactionServiceEntity();
      ts1.isEOS = false;
      ts1.serviceName = 'Title Traceback';
      ts1.quantity = 1;
      ts1.serviceFee = 700;
      ts1.discount = 0;
      ts1.totalServiceAmount = 700;

      const ts2 = new TransactionServiceEntity();
      ts2.isEOS = false;
      ts2.serviceName = 'Title Traceback';
      ts2.quantity = 2;
      ts2.serviceFee = 100;
      ts2.discount = 0;
      ts2.totalServiceAmount = 200;

      transaction.transactionServices = [eos1, eos2, ts1, ts2];
      transaction.setIsAllServicesMatch();
      expect(transaction.isAllServicesMatch).toBe(false);
    });
  });
});
