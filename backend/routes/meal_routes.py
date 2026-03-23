from flask import Blueprint, request, jsonify, current_app
from sqlalchemy import or_
from models import db, User, Meal, Review, OrderItem
from flask_jwt_extended import jwt_required, get_jwt_identity

meal_bp = Blueprint('meals', __name__)

@meal_bp.route('/', methods=['GET'])
def get_meals():
    """Get all meals with pagination and filtering."""
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        category = request.args.get('category')
        search = request.args.get('search')
        min_price = request.args.get('min_price', type=float)
        max_price = request.args.get('max_price', type=float)
        available_only = request.args.get('available_only', 'false').lower() == 'true'
        
        # Build query
        query = Meal.query
        
        # Apply filters
        if category:
            query = query.filter(Meal.category == category)
        
        if search:
            query = query.filter(or_(
                Meal.name.ilike(f'%{search}%'),
                Meal.description.ilike(f'%{search}%')
            ))
        
        if min_price is not None:
            query = query.filter(Meal.price >= min_price)
        
        if max_price is not None:
            query = query.filter(Meal.price <= max_price)
        
        if available_only:
            query = query.filter(Meal.is_available == True)
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        meals = query.order_by(Meal.created_at.desc())\
                   .offset((page - 1) * per_page)\
                   .limit(per_page)\
                   .all()
        
        # Calculate pagination info
        total_pages = (total + per_page - 1) // per_page
        
        return jsonify({
            'status': 'success',
            'data': {
                'meals': [meal.to_dict() for meal in meals],
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
        current_app.logger.error(f"Get meals error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to fetch meals'
        }), 500

@meal_bp.route('/<meal_id>', methods=['GET'])
def get_meal(meal_id):
    """Get meal by ID."""
    try:
        meal = Meal.query.get(meal_id)
        
        if not meal:
            return jsonify({
                'status': 'error',
                'message': 'Meal not found'
            }), 404
        
        # Get reviews for this meal
        reviews = Review.query.filter_by(meal_id=meal_id).all()
        
        meal_data = meal.to_dict()
        meal_data['reviews'] = [review.to_dict() for review in reviews]
        
        return jsonify({
            'status': 'success',
            'data': meal_data
        }), 200
    except Exception as e:
        current_app.logger.error(f"Get meal error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to fetch meal'
        }), 500

@meal_bp.route('/', methods=['POST'])
@jwt_required()
def create_meal():
    """Create a new meal (vendor only)."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role != 'vendor':
            return jsonify({
                'status': 'error',
                'message': 'Only vendors can create meals'
            }), 403
        
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'description', 'category', 'price']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'status': 'error',
                    'message': f'{field} is required'
                }), 400
        
        # Create meal
        meal = Meal(
            name=data['name'],
            description=data['description'],
            category=data['category'],
            price=float(data['price']),
            discount_price=float(data['discount_price']) if data.get('discount_price') else None,
            stock_quantity=int(data.get('stock_quantity', 0)),
            image_url=data.get('image_url'),
            is_available=data.get('is_available', True),
            vendor_id=user_id
        )
        
        db.session.add(meal)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Meal created successfully',
            'data': meal.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Create meal error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to create meal'
        }), 500

@meal_bp.route('/<meal_id>', methods=['PUT'])
@jwt_required()
def update_meal(meal_id):
    """Update a meal (vendor only)."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role != 'vendor':
            return jsonify({
                'status': 'error',
                'message': 'Only vendors can update meals'
            }), 403
        
        meal = Meal.query.get(meal_id)
        
        if not meal:
            return jsonify({
                'status': 'error',
                'message': 'Meal not found'
            }), 404
        
        # Check if meal belongs to vendor
        if meal.vendor_id != user_id:
            return jsonify({
                'status': 'error',
                'message': 'You can only update your own meals'
            }), 403
        
        data = request.get_json()
        
        # Update fields
        if 'name' in data:
            meal.name = data['name']
        if 'description' in data:
            meal.description = data['description']
        if 'category' in data:
            meal.category = data['category']
        if 'price' in data:
            meal.price = float(data['price'])
        if 'discount_price' in data:
            meal.discount_price = float(data['discount_price']) if data['discount_price'] else None
        if 'stock_quantity' in data:
            meal.stock_quantity = int(data['stock_quantity'])
        if 'image_url' in data:
            meal.image_url = data['image_url']
        if 'is_available' in data:
            meal.is_available = bool(data['is_available'])
        
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Meal updated successfully',
            'data': meal.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Update meal error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to update meal'
        }), 500

@meal_bp.route('/<meal_id>', methods=['DELETE'])
@jwt_required()
def delete_meal(meal_id):
    """Delete or disable a meal."""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role != 'vendor':
            return jsonify({
                'status': 'error',
                'message': 'Only vendors can delete meals'
            }), 403
        
        meal = Meal.query.get(meal_id)
        
        if not meal:
            return jsonify({
                'status': 'error',
                'message': 'Meal not found'
            }), 404
        
        # Check if meal belongs to vendor
        if meal.vendor_id != user_id:
            return jsonify({
                'status': 'error',
                'message': 'You can only delete your own meals'
            }), 403
        
        # Check if meal has orders
        from ..models import OrderItem
        has_orders = OrderItem.query.filter_by(meal_id=meal_id).first() is not None
        
        if has_orders:
            # Mark as unavailable instead of deleting
            meal.is_available = False
            message = 'Meal marked as unavailable (has existing orders)'
        else:
            # Delete the meal
            db.session.delete(meal)
            message = 'Meal deleted successfully'
        
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': message
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Delete meal error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to delete meal'
        }), 500

@meal_bp.route('/<meal_id>/reviews', methods=['POST'])
@jwt_required()
def add_review(meal_id):
    """Add a review to a meal."""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data.get('rating'):
            return jsonify({
                'status': 'error',
                'message': 'Rating is required'
            }), 400
        
        rating = int(data['rating'])
        if rating < 1 or rating > 5:
            return jsonify({
                'status': 'error',
                'message': 'Rating must be between 1 and 5'
            }), 400
        
        # Check if meal exists
        meal = Meal.query.get(meal_id)
        if not meal:
            return jsonify({
                'status': 'error',
                'message': 'Meal not found'
            }), 404
        
        # Check if user already reviewed this meal
        existing_review = Review.query.filter_by(meal_id=meal_id, user_id=user_id).first()
        if existing_review:
            return jsonify({
                'status': 'error',
                'message': 'You have already reviewed this meal'
            }), 400
        
        # Create review
        review = Review(
            meal_id=meal_id,
            user_id=user_id,
            rating=rating,
            comment=data.get('comment')
        )
        
        db.session.add(review)
        
        # Update meal rating
        total_reviews = meal.total_reviews + 1
        total_rating = (meal.rating * meal.total_reviews) + rating
        meal.rating = total_rating / total_reviews
        meal.total_reviews = total_reviews
        
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Review added successfully',
            'data': review.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Add review error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to add review'
        }), 500

@meal_bp.route('/categories', methods=['GET'])
def get_categories():
    """Get all meal categories."""
    try:
        categories = db.session.query(Meal.category).distinct().all()
        category_list = [cat[0] for cat in categories if cat[0]]
        
        return jsonify({
            'status': 'success',
            'data': category_list
        }), 200
    except Exception as e:
        current_app.logger.error(f"Get categories error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to fetch categories'
        }), 500