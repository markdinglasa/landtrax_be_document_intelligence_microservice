/**
 * Meta data for pagination
 * TotalPages: Total/Limit = TotalPages
 * Page: current-page
 * Total: total-records
 * Limit: number of records per page
 */

export interface CustomMeta {
  totalPages: number; // Total/Limit = TotalPages
  page: number; // current-page
  total: number; // total-records
  limit: number; //
}
/**
 * Get data by paging
 * Page: current-page
 * Limit: number of records per page
 * Search: search term
 * SortDirection: sort direction
 * SortByField: field to sort by
 */
export interface GetDataByPaging {
  page: number;
  limit: number;
  search: string;
  sortDirection: 'ASC' | 'DESC';
  ortByField: string;
}
