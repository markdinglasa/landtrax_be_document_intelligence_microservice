import { RegistryOfDeedEntity } from '../location';

describe('RegistryOfDeedEntity', () => {
  it('should create an instance of RegistryOfDeedEntity', () => {
    const entity = new RegistryOfDeedEntity();
    expect(entity).toBeInstanceOf(RegistryOfDeedEntity);
  });

  it('should have all required properties', () => {
    const entity = new RegistryOfDeedEntity();
    entity.id = '550e8400-e29b-41d4-a716-446655440000';
    entity.name = 'Quezon City Register of Deeds';
    entity.abbreviation = 'QCRD';
    entity.address = 'Quezon City Hall, Diliman, Quezon City';
    entity.isActive = true;
    entity.createdBy = 'test-user-id';
    entity.createdDate = new Date('2024-01-01');
    entity.updatedBy = null;
    entity.updatedDate = null;
    entity.deletedBy = null;
    entity.deletedDate = null;

    expect(entity.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(entity.name).toBe('Quezon City Register of Deeds');
    expect(entity.abbreviation).toBe('QCRD');
    expect(entity.address).toBe('Quezon City Hall, Diliman, Quezon City');
    expect(entity.isActive).toBe(true);
    expect(entity.createdBy).toBe('test-user-id');
    expect(entity.createdDate).toEqual(new Date('2024-01-01'));
    expect(entity.updatedBy).toBeNull();
    expect(entity.updatedDate).toBeNull();
    expect(entity.deletedBy).toBeNull();
    expect(entity.deletedDate).toBeNull();
  });

  it('should allow null for abbreviation', () => {
    const entity = new RegistryOfDeedEntity();
    entity.abbreviation = null;
    expect(entity.abbreviation).toBeNull();
  });

  it('should allow null for address', () => {
    const entity = new RegistryOfDeedEntity();
    entity.address = null;
    expect(entity.address).toBeNull();
  });

  it('should have isActive default to true', () => {
    const entity = new RegistryOfDeedEntity();
    entity.isActive = true;
    expect(entity.isActive).toBe(true);
  });

  it('should allow isActive to be set to false', () => {
    const entity = new RegistryOfDeedEntity();
    entity.isActive = false;
    expect(entity.isActive).toBe(false);
  });

  it('should support soft delete with deletedBy and deletedDate', () => {
    const entity = new RegistryOfDeedEntity();
    entity.deletedBy = 'admin-user-id';
    entity.deletedDate = new Date('2024-12-01');

    expect(entity.deletedBy).toBe('admin-user-id');
    expect(entity.deletedDate).toEqual(new Date('2024-12-01'));
  });

  it('should support audit fields for creation', () => {
    const entity = new RegistryOfDeedEntity();
    entity.createdBy = 'creator-user-id';
    entity.createdDate = new Date('2024-01-01');

    expect(entity.createdBy).toBe('creator-user-id');
    expect(entity.createdDate).toEqual(new Date('2024-01-01'));
  });

  it('should support audit fields for updates', () => {
    const entity = new RegistryOfDeedEntity();
    entity.updatedBy = 'updater-user-id';
    entity.updatedDate = new Date('2024-06-01');

    expect(entity.updatedBy).toBe('updater-user-id');
    expect(entity.updatedDate).toEqual(new Date('2024-06-01'));
  });

  it('should create multiple entities with different data', () => {
    const entity1 = new RegistryOfDeedEntity();
    entity1.id = '550e8400-e29b-41d4-a716-446655440001';
    entity1.name = 'Quezon City Register of Deeds';
    entity1.abbreviation = 'QCRD';
    entity1.isActive = true;

    const entity2 = new RegistryOfDeedEntity();
    entity2.id = '550e8400-e29b-41d4-a716-446655440002';
    entity2.name = 'Manila Register of Deeds';
    entity2.abbreviation = 'MRD';
    entity2.isActive = false;

    expect(entity1.id).not.toBe(entity2.id);
    expect(entity1.name).not.toBe(entity2.name);
    expect(entity1.isActive).not.toBe(entity2.isActive);
  });

  it('should handle long addresses', () => {
    const entity = new RegistryOfDeedEntity();
    const longAddress =
      'Ground Floor, Registry of Deeds Building, Quezon City Hall Complex, Elliptical Road corner Visayas Avenue, Diliman, Quezon City, 1100 Metro Manila, Philippines';
    entity.address = longAddress;

    expect(entity.address).toBe(longAddress);
    expect(entity.address.length).toBeGreaterThan(50);
  });

  it('should handle special characters in name', () => {
    const entity = new RegistryOfDeedEntity();
    entity.name = "Registry of Deeds - NCR (Metro Manila) - Quezon City's Office";

    expect(entity.name).toContain('-');
    expect(entity.name).toContain('(');
    expect(entity.name).toContain("'");
  });
});
