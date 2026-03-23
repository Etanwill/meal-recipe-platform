import React, { useState, useEffect } from 'react';
import Alert from '@mui/material/Alert';
import {
  Container,
  Paper,
  Typography,
  Box,
  Chip,
  Button,
  Grid,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Refresh,
  Visibility,
  Update,
  FilterList,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import orderService from '../../services/orderService';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';
import ConfirmationDialog from '../common/ConfirmationDialog';
import toast from 'react-hot-toast';

const VendorOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statuses, setStatuses] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 10,
    total: 0,
    total_pages: 1,
  });
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
    showOnlyMine: true,
  });
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  const statusColors = {
    pending: 'warning',
    confirmed: 'info',
    preparing: 'primary',
    ready: 'secondary',
    delivered: 'success',
    cancelled: 'error',
  };

  const statusFlow = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['ready', 'cancelled'],
    ready: ['delivered'],
    delivered: [],
    cancelled: [],
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        per_page: pagination.per_page,
        ...filters,
      };

      const response = await orderService.getOrders(params);
      
      if (response.status === 'success') {
        setOrders(response.data.orders || []); // Default to empty array
        setPagination(response.data.pagination || {
          page: 1,
          per_page: 10,
          total: 0,
          total_pages: 1,
          has_next: false,
          has_prev: false,
        });
      } else {
        setOrders([]);
        setPagination({
          page: 1,
          per_page: 10,
          total: 0,
          total_pages: 1,
          has_next: false,
          has_prev: false,
        });
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('Failed to load orders');
      setOrders([]);
      setPagination({
        page: 1,
        per_page: 10,
        total: 0,
        total_pages: 1,
        has_next: false,
        has_prev: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStatuses = async () => {
    try {
      const response = await orderService.getOrderStatuses();
      if (response.status === 'success') {
        setStatuses(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch statuses:', error);
      setStatuses([]);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
      fetchStatuses();
    }
  }, [user, pagination.page, filters]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleRefresh = () => {
    fetchOrders();
  };

  const handleViewOrder = (order) => {
    setSelectedOrder(order);
    setViewDialogOpen(true);
  };

  const handleUpdateStatus = (order) => {
    setSelectedOrder(order);
    setSelectedStatus('');
    setStatusDialogOpen(true);
  };

  const handleStatusChange = async () => {
    if (!selectedStatus) {
      toast.error('Please select a status');
      return;
    }

    try {
      const response = await orderService.updateOrderStatus(
        selectedOrder.id,
        selectedStatus
      );
      
      if (response.status === 'success') {
        toast.success('Order status updated successfully');
        setStatusDialogOpen(false);
        fetchOrders();
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      const message = error.response?.data?.message || 'Failed to update status';
      toast.error(message);
    }
  };

  const handleCancelOrder = (order) => {
    setSelectedOrder(order);
    setSelectedStatus('cancelled');
    setConfirmationOpen(true);
  };

  const confirmCancelOrder = async () => {
    try {
      const response = await orderService.updateOrderStatus(
        selectedOrder.id,
        'cancelled'
      );
      
      if (response.status === 'success') {
        toast.success('Order cancelled successfully');
        setConfirmationOpen(false);
        fetchOrders();
      }
    } catch (error) {
      console.error('Failed to cancel order:', error);
      const message = error.response?.data?.message || 'Failed to cancel order';
      toast.error(message);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  const getAvailableStatuses = (currentStatus) => {
    return statusFlow[currentStatus] || [];
  };

  const columns = [
    {
      id: 'order_number',
      label: 'Order #',
      render: (row) => (
        <Typography variant="body2" fontWeight="medium">
          {row.order_number || 'N/A'}
        </Typography>
      ),
    },
    {
      id: 'customer_name',
      label: 'Customer',
      render: (row) => row.customer_name || 'N/A',
    },
    {
      id: 'created_at',
      label: 'Date',
      render: (row) => formatDate(row.created_at),
    },
    {
      id: 'total_amount',
      label: 'Amount',
      align: 'right',
      render: (row) => formatCurrency(row.total_amount),
    },
    {
      id: 'status',
      label: 'Status',
      render: (row) => (
        <Chip
          label={row.status || 'pending'}
          color={statusColors[row.status] || 'default'}
          size="small"
        />
      ),
    },
    {
      id: 'item_count',
      label: 'Items',
      align: 'center',
      render: (row) => (row.items || []).length,
    },
    {
      id: 'actions',
      label: 'Actions',
      align: 'right',
      render: (row) => {
        const availableStatuses = getAvailableStatuses(row.status);
        const canUpdate = availableStatuses.length > 0;
        const canCancel = row.status !== 'cancelled' && row.status !== 'delivered';

        return (
          <Box>
            <IconButton
              size="small"
              onClick={() => handleViewOrder(row)}
              title="View Details"
            >
              <Visibility />
            </IconButton>
            {canUpdate && (
              <IconButton
                size="small"
                onClick={() => handleUpdateStatus(row)}
                title="Update Status"
                color="primary"
              >
                <Update />
              </IconButton>
            )}
            {canCancel && (
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => handleCancelOrder(row)}
                sx={{ ml: 1 }}
              >
                Cancel
              </Button>
            )}
          </Box>
        );
      },
    },
  ];

  if (loading && (!orders || orders.length === 0)) {
    return <LoadingSpinner />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Order Management
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          View and manage customer orders for your meals
        </Typography>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="">All Status</MenuItem>
                {statuses.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              label="From Date"
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              label="To Date"
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={filters.showOnlyMine}
                  onChange={(e) => handleFilterChange('showOnlyMine', e.target.checked)}
                />
              }
              label="Show Only Orders with Your Meals"
            />
          </Grid>
          <Grid item xs={12}>
            <Button
              startIcon={<Refresh />}
              onClick={handleRefresh}
              sx={{ mt: 1 }}
            >
              Refresh Orders
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Orders Table */}
      {!loading && (!orders || orders.length === 0) ? (
        <EmptyState
          title="No orders found"
          description="You haven't received any orders yet."
        />
      ) : (
        <TableContainer component={Paper}>
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
              {orders.map((order, index) => (
                <TableRow key={order.id || index}>
                  {columns.map((column) => (
                    <TableCell key={column.id} align={column.align || 'left'}>
                      {column.render ? column.render(order) : order[column.id]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <Button
                disabled={!pagination.has_prev}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </Button>
              <Box sx={{ display: 'flex', alignItems: 'center', mx: 2 }}>
                Page {pagination.page} of {pagination.total_pages}
              </Box>
              <Button
                disabled={!pagination.has_next}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </Button>
            </Box>
          )}
        </TableContainer>
      )}

      {/* Order Details Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedOrder && (
          <>
            <DialogTitle>
              Order Details: {selectedOrder.order_number}
              <Chip
                label={selectedOrder.status}
                color={statusColors[selectedOrder.status]}
                size="small"
                sx={{ ml: 2 }}
              />
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Customer Information
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    <strong>Name:</strong> {selectedOrder.customer_name || 'N/A'}
                    <br />
                    <strong>Order #:</strong> {selectedOrder.order_number || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Delivery Information
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    <strong>Address:</strong> {selectedOrder.delivery_address || 'N/A'}
                    <br />
                    <strong>Phone:</strong> {selectedOrder.delivery_phone || 'N/A'}
                    {selectedOrder.notes && (
                      <>
                        <br />
                        <strong>Notes:</strong> {selectedOrder.notes}
                      </>
                    )}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Order Items (Your Meals)
                  </Typography>
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Meal</TableCell>
                            <TableCell align="right">Price</TableCell>
                            <TableCell align="center">Quantity</TableCell>
                            <TableCell align="right">Subtotal</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedOrder.items.map((item, itemIndex) => (
                            <TableRow key={item.id || itemIndex}>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                  <img
                                    src={item.meal_image || '/meal-placeholder.jpg'}
                                    alt={item.meal_name}
                                    style={{
                                      width: 40,
                                      height: 40,
                                      objectFit: 'cover',
                                      borderRadius: 4,
                                    }}
                                  />
                                  <Typography variant="body2">
                                    {item.meal_name || 'Unknown Item'}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell align="right">
                                {formatCurrency(item.unit_price)}
                              </TableCell>
                              <TableCell align="center">
                                {item.quantity || 0}
                              </TableCell>
                              <TableCell align="right">
                                {formatCurrency(item.subtotal)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No items found for this order
                    </Typography>
                  )}
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ textAlign: 'right', mt: 2 }}>
                    <Typography variant="h6">
                      Total: {formatCurrency(selectedOrder.total_amount)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" gutterBottom>
                    Order Timeline
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Placed:</strong> {formatDate(selectedOrder.created_at)}
                    <br />
                    <strong>Last Updated:</strong> {formatDate(selectedOrder.updated_at)}
                  </Typography>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setViewDialogOpen(false)}>
                Close
              </Button>
              {getAvailableStatuses(selectedOrder.status).length > 0 && (
                <Button
                  variant="contained"
                  onClick={() => {
                    setViewDialogOpen(false);
                    handleUpdateStatus(selectedOrder);
                  }}
                >
                  Update Status
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog
        open={statusDialogOpen}
        onClose={() => setStatusDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        {selectedOrder && (
          <>
            <DialogTitle>
              Update Order Status: {selectedOrder.order_number}
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body1" gutterBottom>
                  Current Status: <Chip label={selectedOrder.status} color={statusColors[selectedOrder.status]} />
                </Typography>
              </Box>
              <FormControl fullWidth>
                <InputLabel>New Status</InputLabel>
                <Select
                  value={selectedStatus}
                  label="New Status"
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  {getAvailableStatuses(selectedOrder.status).map((status) => (
                    <MenuItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {selectedStatus && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Changing status from <strong>{selectedOrder.status}</strong> to <strong>{selectedStatus}</strong>
                </Alert>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setStatusDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleStatusChange}
                disabled={!selectedStatus}
              >
                Update Status
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmationOpen}
        title="Cancel Order"
        message={`Are you sure you want to cancel order ${selectedOrder?.order_number}? This action cannot be undone and will restore stock.`}
        confirmText="Cancel Order"
        cancelText="Keep Order"
        onConfirm={confirmCancelOrder}
        onCancel={() => setConfirmationOpen(false)}
        severity="error"
      />
    </Container>
  );
};

// Add missing Alert import


export default VendorOrders;