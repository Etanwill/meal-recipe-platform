import React, { useState, useEffect } from 'react';
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
  Collapse,
} from '@mui/material';
import {
  KeyboardArrowDown,
  KeyboardArrowUp,
  Visibility,
  Refresh,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import orderService from '../../services/orderService';
import LoadingSpinner from '../common/LoadingSpinner';
import EmptyState from '../common/EmptyState';
import toast from 'react-hot-toast';

const OrderHistory = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 10,
    total: 0,
  });
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
  });
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const statusColors = {
    pending: 'warning',
    confirmed: 'info',
    preparing: 'primary',
    ready: 'secondary',
    delivered: 'success',
    cancelled: 'error',
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
        setOrders(response.data.orders || []);
        setPagination(response.data.pagination || {
          page: 1,
          per_page: 10,
          total: 0,
          total_pages: 1,
        });
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchOrders();
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

  const toggleOrderExpand = (orderId) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
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

  const columns = [
    {
      id: 'expand',
      label: '',
      render: (row) => (
        <IconButton
          size="small"
          onClick={() => toggleOrderExpand(row.id)}
        >
          {expandedOrder === row.id ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
        </IconButton>
      ),
    },
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
      id: 'created_at',
      label: 'Date',
      render: (row) => formatDate(row.created_at),
    },
    {
      id: 'total_amount',
      label: 'Total',
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
      id: 'actions',
      label: 'Actions',
      align: 'right',
      render: (row) => (
        <IconButton
          size="small"
          onClick={() => handleViewOrder(row)}
          title="View Details"
        >
          <Visibility />
        </IconButton>
      ),
    },
  ];

  if (loading && orders.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Order History
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          View and manage your past orders
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
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="confirmed">Confirmed</MenuItem>
                <MenuItem value="preparing">Preparing</MenuItem>
                <MenuItem value="ready">Ready</MenuItem>
                <MenuItem value="delivered">Delivered</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
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
            <Button
              startIcon={<Refresh />}
              onClick={handleRefresh}
              sx={{ mt: 1 }}
            >
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Orders Table */}
      {!loading && (!orders || orders.length === 0) ? (
        <EmptyState
          title="No orders found"
          description="You haven't placed any orders yet."
        />
      ) : (
        <Paper>
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
                {orders.map((order, index) => (
                  <React.Fragment key={order.id || index}>
                    <TableRow>
                      {columns.map((column) => (
                        <TableCell key={column.id} align={column.align || 'left'}>
                          {column.render ? column.render(order) : order[column.id]}
                        </TableCell>
                      ))}
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={columns.length} sx={{ py: 0 }}>
                        <Collapse in={expandedOrder === order.id} timeout="auto" unmountOnExit>
                          <Box sx={{ p: 2, backgroundColor: 'background.default' }}>
                            <Typography variant="subtitle1" gutterBottom>
                              Order Items
                            </Typography>
                            {order.items && order.items.length > 0 ? (
                              <>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>Item</TableCell>
                                      <TableCell align="right">Price</TableCell>
                                      <TableCell align="center">Quantity</TableCell>
                                      <TableCell align="right">Subtotal</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {order.items.map((item, itemIndex) => (
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
                                <Box sx={{ mt: 2 }}>
                                  <Typography variant="body2" color="text.secondary">
                                    <strong>Delivery Address:</strong> {order.delivery_address || 'N/A'}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    <strong>Phone:</strong> {order.delivery_phone || 'N/A'}
                                  </Typography>
                                  {order.notes && (
                                    <Typography variant="body2" color="text.secondary">
                                      <strong>Notes:</strong> {order.notes}
                                    </Typography>
                                  )}
                                </Box>
                              </>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                No items found for this order
                              </Typography>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

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
        </Paper>
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
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Order Status
                    </Typography>
                    <Chip
                      label={selectedOrder.status}
                      color={statusColors[selectedOrder.status] || 'default'}
                      size="medium"
                    />
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>
                    Customer Information
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    <strong>Name:</strong> {selectedOrder.customer_name || 'N/A'}
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
                    Order Items
                  </Typography>
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Item</TableCell>
                          <TableCell align="right">Price</TableCell>
                          <TableCell align="center">Quantity</TableCell>
                          <TableCell align="right">Subtotal</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedOrder.items.map((item, index) => (
                          <TableRow key={item.id || index}>
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
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setViewDialogOpen(false)}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default OrderHistory;