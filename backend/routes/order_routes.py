from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
from sqlalchemy import or_
from models import db, User, Meal, Order, OrderItem
from flask_jwt_extended import jwt_required, get_jwt_identity

order_bp = Blueprint('orders', __name__)

# ... rest of the order_routes.py code remains the same ...
# Just update the imports at the top

@order_bp.route('/', methods=['POST'])
@jwt_required()
def create_order():
    """Create a new order."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({
                'status': 'error',
                'message': 'User not found'
            }), 404
        
        if user.role != 'customer':
            return jsonify({
                'status': 'error',
                'message': 'Only customers can place orders'
            }), 403
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['items', 'delivery_address', 'delivery_phone']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'status': 'error',
                    'message': f'{field} is required'
                }), 400
        
        if not isinstance(data['items'], list) or len(data['items']) == 0:
            return jsonify({
                'status': 'error',
                'message': 'Order must contain at least one item'
            }), 400
        
        # Validate items and calculate total
        total_amount = 0
        order_items = []
        
        for item_data in data['items']:
            if 'meal_id' not in item_data or 'quantity' not in item_data:
                return jsonify({
                    'status': 'error',
                    'message': 'Each item must have meal_id and quantity'
                }), 400
            
            meal = Meal.query.get(item_data['meal_id'])
            if not meal:
                return jsonify({
                    'status': 'error',
                    'message': f"Meal {item_data['meal_id']} not found"
                }), 404
            
            if not meal.is_available:
                return jsonify({
                    'status': 'error',
                    'message': f"Meal {meal.name} is not available"
                }), 400
            
            quantity = int(item_data['quantity'])
            if quantity <= 0:
                return jsonify({
                    'status': 'error',
                    'message': f"Quantity for {meal.name} must be positive"
                }), 400
            
            if meal.stock_quantity < quantity:
                return jsonify({
                    'status': 'error',
                    'message': f"Not enough stock for {meal.name}. Available: {meal.stock_quantity}"
                }), 400
            
            # Calculate subtotal
            unit_price = meal.final_price
            subtotal = unit_price * quantity
            total_amount += subtotal
            
            # Create order item
            order_item = OrderItem(
                meal_id=meal.id,
                quantity=quantity,
                unit_price=unit_price,
                subtotal=subtotal
            )
            order_items.append(order_item)
            
            # Reduce stock
            meal.stock_quantity -= quantity
        
        # Create order
        order = Order(
            order_number=Order.generate_order_number(),
            customer_id=user_id,
            total_amount=total_amount,
            delivery_address=data['delivery_address'],
            delivery_phone=data['delivery_phone'],
            notes=data.get('notes')
        )
        
        # Add order items
        for item in order_items:
            order.items.append(item)
        
        db.session.add(order)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Order created successfully',
            'data': order.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Create order error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to create order'
        }), 500

@order_bp.route('/', methods=['GET'])
@jwt_required()
def get_orders():
    """Get orders with pagination and filtering."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({
                'status': 'error',
                'message': 'User not found'
            }), 404
        
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        status = request.args.get('status')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Build query based on user role
        if user.role == 'customer':
            query = Order.query.filter_by(customer_id=user_id)
        else:  # vendor
            # Get vendor's meals first
            vendor_meals = Meal.query.filter_by(vendor_id=user_id).all()
            meal_ids = [meal.id for meal in vendor_meals]
            
            # Get orders containing vendor's meals
            query = Order.query.join(OrderItem).filter(OrderItem.meal_id.in_(meal_ids)).distinct()
        
        # Apply filters
        if status:
            query = query.filter(Order.status == status)
        
        if start_date:
            try:
                start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                query = query.filter(Order.created_at >= start)
            except ValueError:
                pass
        
        if end_date:
            try:
                end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                query = query.filter(Order.created_at <= end)
            except ValueError:
                pass
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        orders = query.order_by(Order.created_at.desc())\
                     .offset((page - 1) * per_page)\
                     .limit(per_page)\
                     .all()
        
        # Calculate pagination info
        total_pages = (total + per_page - 1) // per_page
        
        # Filter items for vendor (only show their items)
        orders_data = []
        for order in orders:
            order_data = order.to_dict()
            if user.role == 'vendor':
                # Filter items to only show vendor's meals
                vendor_items = [item for item in order_data['items'] if item['meal_id'] in meal_ids]
                if vendor_items:  # Only include order if vendor has items in it
                    order_data['items'] = vendor_items
                    order_data['total_amount'] = sum(item['subtotal'] for item in vendor_items)
                    orders_data.append(order_data)
            else:
                orders_data.append(order_data)
        
        return jsonify({
            'status': 'success',
            'data': {
                'orders': orders_data,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': total,
                    'total_pages': total_pages,
                    'has_next': page < total_pages,
                    'has_prev': page > 1
                }
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Get orders error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to fetch orders'
        }), 500

@order_bp.route('/<order_id>', methods=['GET'])
@jwt_required()
def get_order(order_id):
    """Get order by ID."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({
                'status': 'error',
                'message': 'User not found'
            }), 404
        
        order = Order.query.get(order_id)
        
        if not order:
            return jsonify({
                'status': 'error',
                'message': 'Order not found'
            }), 404
        
        # Check permissions
        if user.role == 'customer' and order.customer_id != user_id:
            return jsonify({
                'status': 'error',
                'message': 'Access denied'
            }), 403
        
        if user.role == 'vendor':
            # Check if order contains vendor's meals
            vendor_meals = Meal.query.filter_by(vendor_id=user_id).all()
            meal_ids = [meal.id for meal in vendor_meals]
            vendor_items = [item for item in order.items if item.meal_id in meal_ids]
            
            if not vendor_items:
                return jsonify({
                    'status': 'error',
                    'message': 'Access denied'
                }), 403
        
        return jsonify({
            'status': 'success',
            'data': order.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Get order error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to fetch order'
        }), 500

@order_bp.route('/<order_id>/status', methods=['PUT'])
@jwt_required()
def update_order_status(order_id):
    """Update order status."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role != 'vendor':
            return jsonify({
                'status': 'error',
                'message': 'Only vendors can update order status'
            }), 403
        
        order = Order.query.get(order_id)
        
        if not order:
            return jsonify({
                'status': 'error',
                'message': 'Order not found'
            }), 404
        
        # Check if order contains vendor's meals
        vendor_meals = Meal.query.filter_by(vendor_id=user_id).all()
        meal_ids = [meal.id for meal in vendor_meals]
        vendor_items = [item for item in order.items if item.meal_id in meal_ids]
        
        if not vendor_items:
            return jsonify({
                'status': 'error',
                'message': 'Order does not contain your meals'
            }), 403
        
        data = request.get_json()
        
        if not data.get('status'):
            return jsonify({
                'status': 'error',
                'message': 'Status is required'
            }), 400
        
        new_status = data['status']
        valid_statuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled']
        
        if new_status not in valid_statuses:
            return jsonify({
                'status': 'error',
                'message': f'Invalid status. Must be one of: {", ".join(valid_statuses)}'
            }), 400
        
        # Validate status transition
        status_flow = {
            'pending': ['confirmed', 'cancelled'],
            'confirmed': ['preparing', 'cancelled'],
            'preparing': ['ready', 'cancelled'],
            'ready': ['delivered'],
            'delivered': [],
            'cancelled': []
        }
        
        if new_status not in status_flow.get(order.status, []):
            return jsonify({
                'status': 'error',
                'message': f'Cannot change status from {order.status} to {new_status}'
            }), 400
        
        # Handle cancellation - restore stock
        if new_status == 'cancelled' and order.status != 'cancelled':
            for item in vendor_items:
                meal = Meal.query.get(item.meal_id)
                if meal:
                    meal.stock_quantity += item.quantity
        
        order.status = new_status
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Order status updated successfully',
            'data': order.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Update order status error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to update order status'
        }), 500

@order_bp.route('/statuses', methods=['GET'])
def get_order_statuses():
    """Get all order statuses."""
    return jsonify({
        'status': 'success',
        'data': ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled']
    }), 200