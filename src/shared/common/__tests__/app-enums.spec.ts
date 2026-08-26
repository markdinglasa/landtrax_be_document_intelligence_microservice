import * as appEnums from '../app-enums';

describe('App Enums', () => {
  it('should define API_TAGS', () => {
    expect(appEnums.API_TAGS).toBeDefined();
    expect(Object.keys(appEnums.API_TAGS).length).toBeGreaterThan(0);
  });

  it('should define USER_TYPE', () => {
    expect(appEnums.USER_TYPE).toBeDefined();
    expect(Object.keys(appEnums.USER_TYPE).length).toBeGreaterThan(0);
  });

  it('should define CONTROLLER', () => {
    expect(appEnums.CONTROLLER).toBeDefined();
    expect(Object.keys(appEnums.CONTROLLER).length).toBeGreaterThan(0);
  });

  it('should define API_SECURITY', () => {
    expect(appEnums.API_SECURITY).toBeDefined();
    expect(Object.keys(appEnums.API_SECURITY).length).toBeGreaterThan(0);
  });

  it('should define CollectionStatus', () => {
    expect(appEnums.CollectionStatus).toBeDefined();
    expect(Object.keys(appEnums.CollectionStatus).length).toBeGreaterThan(0);
  });

  it('should define DocumentCategory', () => {
    expect(appEnums.DocumentCategory).toBeDefined();
    expect(Object.keys(appEnums.DocumentCategory).length).toBeGreaterThan(0);
  });

  it('should define ProgressStatus', () => {
    expect(appEnums.ProgressStatus).toBeDefined();
    expect(Object.keys(appEnums.ProgressStatus).length).toBeGreaterThan(0);
  });

  it('should define AnalyticsPeriod', () => {
    expect(appEnums.AnalyticsPeriod).toBeDefined();
    expect(Object.keys(appEnums.AnalyticsPeriod).length).toBeGreaterThan(0);
  });

  it('should define AnalyticsGroupBy', () => {
    expect(appEnums.AnalyticsGroupBy).toBeDefined();
    expect(Object.keys(appEnums.AnalyticsGroupBy).length).toBeGreaterThan(0);
  });
});
