from flask import Blueprint, request, jsonify, current_app
from sqlalchemy import or_
from models import db, Recipe

recipe_bp = Blueprint('recipes', __name__)

# ... rest of the recipe_routes.py code remains the same ...
# Just update the imports at the top
@recipe_bp.route('/', methods=['GET'])
def get_recipes():
    """Get all recipes with pagination and filtering."""
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        category = request.args.get('category')
        search = request.args.get('search')
        difficulty = request.args.get('difficulty')
        featured_only = request.args.get('featured_only', 'false').lower() == 'true'
        
        # Build query
        query = Recipe.query
        
        # Apply filters
        if category:
            query = query.filter(Recipe.category == category)
        
        if search:
            query = query.filter(or_(
                Recipe.title.ilike(f'%{search}%'),
                Recipe.description.ilike(f'%{search}%'),
                Recipe.ingredients.ilike(f'%{search}%')
            ))
        
        if difficulty:
            query = query.filter(Recipe.difficulty == difficulty)
        
        if featured_only:
            query = query.filter(Recipe.is_featured == True)
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        recipes = query.order_by(Recipe.created_at.desc())\
                      .offset((page - 1) * per_page)\
                      .limit(per_page)\
                      .all()
        
        # Calculate pagination info
        total_pages = (total + per_page - 1) // per_page
        
        return jsonify({
            'status': 'success',
            'data': {
                'recipes': [recipe.to_dict() for recipe in recipes],
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
        current_app.logger.error(f"Get recipes error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to fetch recipes'
        }), 500

@recipe_bp.route('/<recipe_id>', methods=['GET'])
def get_recipe(recipe_id):
    """Get recipe by ID."""
    try:
        recipe = Recipe.query.get(recipe_id)
        
        if not recipe:
            return jsonify({
                'status': 'error',
                'message': 'Recipe not found'
            }), 404
        
        return jsonify({
            'status': 'success',
            'data': recipe.to_dict()
        }), 200
    except Exception as e:
        current_app.logger.error(f"Get recipe error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to fetch recipe'
        }), 500

@recipe_bp.route('/categories', methods=['GET'])
def get_recipe_categories():
    """Get all recipe categories."""
    try:
        categories = db.session.query(Recipe.category).distinct().all()
        category_list = [cat[0] for cat in categories if cat[0]]
        
        return jsonify({
            'status': 'success',
            'data': category_list
        }), 200
    except Exception as e:
        current_app.logger.error(f"Get recipe categories error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to fetch categories'
        }), 500

@recipe_bp.route('/difficulties', methods=['GET'])
def get_recipe_difficulties():
    """Get all recipe difficulty levels."""
    return jsonify({
        'status': 'success',
        'data': ['easy', 'medium', 'hard']
    }), 200