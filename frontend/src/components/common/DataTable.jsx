import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Box,
  TextField,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import LoadingSpinner from './LoadingSpinner';
import EmptyState from './EmptyState';

const DataTable = ({
  columns,
  data,
  loading,
  totalCount,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  onSearch,
  searchPlaceholder = 'Search...',
  onRefresh,
  emptyStateTitle = 'No data found',
  emptyStateDescription = 'There are no items to display.',
  showSearch = true,
  showFilters = false,
  onFilterClick,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  if (loading && !data?.length) {
    return <LoadingSpinner />;
  }

  if (!loading && !data?.length) {
    return (
      <EmptyState
        title={emptyStateTitle}
        description={emptyStateDescription}
      />
    );
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <Box sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        {showSearch && (
          <TextField
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={handleSearch}
            size="small"
            sx={{ flexGrow: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        )}
        {showFilters && (
          <IconButton onClick={onFilterClick}>
            <FilterIcon />
          </IconButton>
        )}
        <IconButton onClick={handleRefresh}>
          <RefreshIcon />
        </IconButton>
      </Box>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align || 'left'}
                  sx={{ fontWeight: 'bold' }}
                >
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && data?.length ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  <LoadingSpinner size={30} />
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, rowIndex) => (
                <TableRow key={row.id || rowIndex}>
                  {columns.map((column) => (
                    <TableCell key={column.id} align={column.align || 'left'}>
                      {column.render ? column.render(row) : row[column.id]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={totalCount || 0}
        page={page || 0}
        onPageChange={(e, newPage) => onPageChange && onPageChange(newPage)}
        rowsPerPage={rowsPerPage || 10}
        onRowsPerPageChange={(e) =>
          onRowsPerPageChange && onRowsPerPageChange(parseInt(e.target.value, 10))
        }
        rowsPerPageOptions={[5, 10, 25, 50]}
      />
    </Paper>
  );
};

export default DataTable;