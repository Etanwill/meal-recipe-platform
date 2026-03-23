import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import (
    JWTManager, create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity
)
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import uuid
import random
import string
import re
from sqlalchemy import or_

# Initialize extensions
db = SQLAlchemy()
jwt = JWTManager()

# Get the absolute path for the database
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_PATH = os.path.join(BASE_DIR, 'meal_platform.db')

# Configuration
class Config:
    SECRET_KEY = 'dev-secret-key-change-in-production'
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{DATABASE_PATH}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = 'jwt-secret-key-change-in-production'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

# Models
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='customer')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'role': self.role,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Meal(db.Model):
    __tablename__ = 'meals'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    price = db.Column(db.Float, nullable=False)
    discount_price = db.Column(db.Float, nullable=True)
    stock_quantity = db.Column(db.Integer, default=0)
    image_url = db.Column(db.String(500), nullable=True)
    is_available = db.Column(db.Boolean, default=True)
    rating = db.Column(db.Float, default=0.0)
    total_reviews = db.Column(db.Integer, default=0)
    vendor_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    @property
    def final_price(self):
        return self.discount_price if self.discount_price and self.discount_price < self.price else self.price
    
    @property
    def has_discount(self):
        return self.discount_price is not None and self.discount_price < self.price
    
    def to_dict(self):
        vendor = User.query.get(self.vendor_id)
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'category': self.category,
            'price': self.price,
            'discount_price': self.discount_price,
            'final_price': self.final_price,
            'has_discount': self.has_discount,
            'stock_quantity': self.stock_quantity,
            'image_url': self.image_url,
            'is_available': self.is_available,
            'rating': self.rating,
            'total_reviews': self.total_reviews,
            'vendor_id': self.vendor_id,
            'vendor_name': f"{vendor.first_name} {vendor.last_name}" if vendor else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Order(db.Model):
    __tablename__ = 'orders'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_number = db.Column(db.String(20), unique=True, nullable=False)
    customer_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='pending')
    delivery_address = db.Column(db.Text, nullable=False)
    delivery_phone = db.Column(db.String(20), nullable=False)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    @staticmethod
    def generate_order_number():
        return 'ORD' + ''.join(random.choices(string.digits, k=8))
    
    def to_dict(self):
        customer = User.query.get(self.customer_id)
        return {
            'id': self.id,
            'order_number': self.order_number,
            'customer_id': self.customer_id,
            'customer_name': f"{customer.first_name} {customer.last_name}" if customer else None,
            'total_amount': self.total_amount,
            'status': self.status,
            'delivery_address': self.delivery_address,
            'delivery_phone': self.delivery_phone,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class OrderItem(db.Model):
    __tablename__ = 'order_items'
    
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.String(36), db.ForeignKey('orders.id'), nullable=False)
    meal_id = db.Column(db.String(36), db.ForeignKey('meals.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Float, nullable=False)
    subtotal = db.Column(db.Float, nullable=False)
    
    def to_dict(self):
        meal = Meal.query.get(self.meal_id)
        return {
            'id': self.id,
            'meal_id': self.meal_id,
            'meal_name': meal.name if meal else None,
            'meal_image': meal.image_url if meal else None,
            'quantity': self.quantity,
            'unit_price': self.unit_price,
            'subtotal': self.subtotal
        }

class Review(db.Model):
    __tablename__ = 'reviews'
    
    id = db.Column(db.Integer, primary_key=True)
    meal_id = db.Column(db.String(36), db.ForeignKey('meals.id'), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        user = User.query.get(self.user_id)
        return {
            'id': self.id,
            'meal_id': self.meal_id,
            'user_id': self.user_id,
            'user_name': f"{user.first_name} {user.last_name}" if user else None,
            'rating': self.rating,
            'comment': self.comment,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Recipe(db.Model):
    __tablename__ = 'recipes'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    ingredients = db.Column(db.Text, nullable=False)
    steps = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    prep_time = db.Column(db.Integer, nullable=True)
    cook_time = db.Column(db.Integer, nullable=True)
    servings = db.Column(db.Integer, nullable=True)
    difficulty = db.Column(db.String(20), default='medium')
    image_url = db.Column(db.String(500), nullable=True)
    video_url = db.Column(db.String(500), nullable=True)
    is_featured = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'ingredients': self.ingredients,
            'steps': self.steps,
            'category': self.category,
            'prep_time': self.prep_time,
            'cook_time': self.cook_time,
            'servings': self.servings,
            'difficulty': self.difficulty,
            'image_url': self.image_url,
            'video_url': self.video_url,
            'is_featured': self.is_featured,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

# Helper functions
def generate_otp(length=6):
    return ''.join(random.choices(string.digits, k=length))

def validate_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password):
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    return True, "OK"

# Create Flask app
app = Flask(__name__)
app.config.from_object(Config)

# Initialize extensions
CORS(app)
db.init_app(app)
jwt.init_app(app)

# Create tables
with app.app_context():
    db.create_all()
    
    # Create admin user if not exists
    if not User.query.filter_by(email='admin@test.com').first():
        admin = User(
            email='admin@test.com',
            first_name='Admin',
            last_name='User',
            role='vendor',
            is_active=True
        )
        admin.set_password('Admin@123')
        db.session.add(admin)
    
    # Create sample vendor
    if not User.query.filter_by(email='vendor@test.com').first():
        vendor = User(
            email='vendor@test.com',
            first_name='Restaurant',
            last_name='Owner',
            role='vendor',
            is_active=True
        )
        vendor.set_password('Vendor@123')
        db.session.add(vendor)
    
    # Create sample customer
    if not User.query.filter_by(email='customer@test.com').first():
        customer = User(
            email='customer@test.com',
            first_name='John',
            last_name='Doe',
            role='customer',
            is_active=True
        )
        customer.set_password('Customer@123')
        db.session.add(customer)
    
    # Create sample meals if none exist
    if Meal.query.count() == 0:
        vendor = User.query.filter_by(email='vendor@test.com').first()
        if vendor:
            sample_meals = [

    # ⭐ Staples & Side Dishes
    Meal(
        name='Fufu Corn & Njama Njama',
        description='Corn fufu served with sautéed huckleberry leaves and spicy sauce',
        category='Staples & Side Dishes',
        price=8.99,
        discount_price=6.99,
        stock_quantity=35,
        image_url='data:image/jpeg;base64,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',
        vendor_id=vendor.id
    ),
    Meal(
        name='Plantains & Beans',
        description='Ripe and unripe boiled plantains served with beans',
        category='Staples & Side Dishes',
        price=6.99,
        stock_quantity=40,
        image_url='data:image/jpeg;base64,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',
        vendor_id=vendor.id
    ),

    # 🍲 Soups & Stews
    Meal(
        name='Ndolé with Meat',
        description='Cameroon bitterleaf stew cooked with peanuts and served with plantains',
        category='Soups & Stews',
        price=11.99,
        discount_price=9.99,
        stock_quantity=25,
        image_url='data:image/jpeg;base64,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',
        vendor_id=vendor.id
    ),
    Meal(
        name='Eru & Water Fufu',
        description='Traditional stew made with okok leaves, waterleaf and cow skin, served with fufu',
        category='Soups & Stews',
        price=10.99,
        stock_quantity=30,
        image_url='data:image/jpeg;base64,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',
        vendor_id=vendor.id
    ),

    # 🥘 One-Pot Meals
    Meal(
        name='Poulet DG',
        description='Chicken, ripe plantains, vegetables and spices cooked in one pot',
        category='One-Pot Meals',
        price=13.99,
        discount_price=11.99,
        stock_quantity=22,
        image_url='https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTOlWCfHm7QZxDo9WY1yUVOKIu9w6BJu0zUdQ&s',
        vendor_id=vendor.id
    ),
    Meal(
        name='Koki Beans',
        description='Steamed bean pudding cooked in banana leaves, often served with plantains',
        category='One-Pot Meals',
        price=7.99,
        stock_quantity=36,
        image_url='data:image/jpeg;base64,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',
        vendor_id=vendor.id
    ),

    # 🍖 Meat & Grill
    Meal(
        name='Kati Kati',
        description='Grilled chicken mixed with palm oil and spices, often served with fufu corn',
        category='Meat & Grill',
        price=12.99,
        stock_quantity=28,
        image_url='data:image/jpeg;base64,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',
        vendor_id=vendor.id
    ),
    Meal(
        name='rice and stew',
        description='Grilled beef skewers sprinkled with suya spices and onions',
        category='Other',
        price=5.99,
        stock_quantity=45,
        image_url='data:image/jpeg;base64,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',
        vendor_id=vendor.id
    ),

    # 🍢 Snacks & Street Food
    Meal(
        name='Puff-Puff & Beans',
        description='Sweet fried dough balls served with fried beans and pepper sauce',
        category='Snacks & Street Food',
        price=4.99,
        stock_quantity=60,
        image_url='data:image/jpeg;base64,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',
        vendor_id=vendor.id
    ),

    # 🐟 Seafood Specials
    Meal(
        name='Poisson Braisé',
        description='Grilled marinated fish served with spicy pepper and plantains',
        category='Seafood Specials',
        price=14.99,
        discount_price=12.99,
        stock_quantity=20,
        image_url='https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTdA6XJ2GMPMPzC6sN76CT-J996k7fPgRlZkg&s',
        vendor_id=vendor.id
    ),
    # 🌱 Vegetarian Options
    Meal(
        name='Ekwang',
        description='Grated cocoyams wrapped in leaves, cooked with palm oil and spices',
        category='Vegetarian Options',
        price=9.99,
        stock_quantity=18,
        image_url='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxMTEhUTExMWFRUXGB0YGBgYGBgaHhodHRsYGhgYHhsaHyggIBomGxgaIjEhJSkrLi4uGB8zODMtNygtLisBCgoKDg0OGxAQGi0lICYtLSsyLS81LS8vNS0tLS0vLy0tLS8tLS8tLS0vLS0tLS0tLS0tLS0tLS0tLS0tLS0tL//AABEIAKgBLAMBIgACEQEDEQH/xAAcAAACAgMBAQAAAAAAAAAAAAAFBgMEAAIHAQj/xAA9EAABAgQFAQYEBAYBAwUAAAABAhEAAyExBAUSQVFhBhMicYGRMqGx8ELB0eEHFCNScvFiM4KSFRckosL/xAAaAQACAwEBAAAAAAAAAAAAAAADBAECBQAG/8QAMhEAAgIBBAAEBAQHAAMAAAAAAQIAAxEEEiExEyJBUQUyYYEUcbHBI5Gh0eHw8TNScv/aAAwDAQACEQMRAD8A5ZKwuJxs1pUtc5QoNCGAGztRPqYf+z/8JMUsPip/cpN0IOpRHBV8I/8AtHX8qwiJcpCZaEoTpFEgAWGwi20MwUW8g7DYHCMZclJWPxr8avQm3o0MYEeiMjpEyMjHj2JkTyNVGPVGIpgO9PviOyBJmi5kLnaztF/LIGkAqVz+Ef3MLwYnT2sPU1/aELtjipXejvDqOgkpepCdufxbbCA3OwXyQlQXd5+pD/7jTGCtEspJIfxO4uwereg2eBGadoJ2KQEzFrCCoshP46k10uSA7WYNu0BZeIkKOqcCCzBKdKUgVZKQS4ADcuSSetDvtU1XcBel/C7OALOA78U/aEHucjviXC7m4ElVM0zAF+FKaimk9KkAvHk3tIe8dAc2BJoHuwH2Y2TlK5zGcpSR1b5sY2mYGQihDN+IXPuH3hXfXnB5/SOV0sBnqbf+rIURql6quolTMGB2HH3sbE3GyneWV6AaJUxHu1B0Yu0Lk5kKUkeIK5+/T1gtgst7yWlRmBLhykC2zUN3+sM7gqjEBYCTzNp+klwAl9h9/bQxYyYUYYzAa6AEEdKP7H5QLm5YEpJE1Kmam5HPnanXoYmlkqkiWas4vtt99IzriCQfYxrSA5I9xFaXiS7F6xLjJImymSgawpwt2JFtJG4+nrHmZYVUuhqDUH2iHL5+lQK0FaWsC3rYw6Ot6RVlZTtMkyaeNQ7x0h2twA7jgU94N4+dKRL/AKbkqofi9mPI8xAHEY1EyjMR8JP39tHuAw6pk0S7E7/UxzoD5jxOXniE8Lg9fiKtI4APnTb3O8EcBhNSXB0uWGo6XI86bw4ZRk2GlylJUgLVTSvUfW3u3WBWdoShtAFTprVnB1KrvavWM9tQjtsHccFDKN0XFTESpitJWFHcUbqRY+8HcFmGISkHUQDuk+EwMzLLNKgQQoEOGt+0EZEkplhelLbgEOPS8WewbfrL0gg/SNmQdsJkshM7+ojn8Seo58of5akrSFoUFJNQRHFZWYeFmfmrEfKDWT52vDl0LdKqsbHmnMH0vxB6uLMlf6iRqNLXcf4fDfrOoERskxSyXN5eJS6KLHxINx1HIi+UxvV2LYu5TkTHdGRtrDmI3bf+GsjGvNktIxF3A8Cz/wA0jf8A5CvLxwnPskn4SaZWIlmWoWeyh/clVlDqI+rtUUs7yfD4yUZOIlhaTblJ/uSbg+UXPMrPlGXhJi/hQo+Qj3G4fQlKSRqNSBwbP1vSHr+IX8OMTgwZkvVPwqR8Q+KWL+NI2/5CnLRzsJgRhBNRHrRvojCIjE7MjjyJIyIxJzPrWRiwJaSSAAkOT5CBOM7a4RDvOSW2TX259I5iM8n4hATOWFoLeFIZrChAb/yjXEZYjQVpKgkMfhdQs4IcB2PNegNAPqv/AFEsKuMx6mfxIw7OETjx4UD6qipiP4jU8Eg/96wPoPzjnErMZILkLISaBWnxcUH6tWCWHz5MwhCJKi/4lHje3AaxgR1NslaQYxL7e4vwzCJel6IDMfP8Teogthe3kxQS6ZT7gEhvc3+6QqYfKlEhaqKJoNvYmJ8z7OApJ1Mp6lqgMeCHHJLmnut+Pzkbo0NGRyRLXaftHijMJClITp0gJUoJfc0N7QAOOmqZ1LKvxErWfRnjRU8ACWV6lChKmApe/wBS0CMVjydIlKKQp3mK8L/4tUDrcvtV4BtY4J+8vZ4NYzjn2hrG5kZJCApRmM+kKOlBuNQdvQg39q+XZbOnkzCod6pyxcFVWZ+OhpQwKyyR4kpKgQr8SQ4FWq7G4uH8i7hgwK5kozGWlrEqAatCWNQCKv5ejPYweohvOcwT/KzZZWdCkAsBfUDfwkXdiDtVoaMinSpEhwgayLNbzPMB8ViUzdCUKZEtyKuonUqhPrdzcetbF4lXwAiocl9rQhf5iFU9TS0qbVy3rCOJzTvFF254+kDsVJChvvYPXYRRw6Fmakiz72huVMQpIdABFz9RQWhd/wCEwxGQd05nOmnWzVdhFxK9SQWqLih8j1iPOsAUT5jK8IUSk8i4L87ekRSsSwfelI18AqCJluDk5jFg5upLXd9KuW/MUieSsi4/yY/PyjzJ8L3qBMtuG22P6QZ/lkJDAOrnjnpGVbYqsRHq6XADCDsdLQtJD/SFXEJOvSDUUDbwezPCKSCU0Ls4687W+kEMuwMqZKRKKQpY5Dvc6nHrBa7BSu7sTrP4pxjBiNhkATGf78/zg/likggpO7g8fLyjXMsomYcqUgUUGNHYPfytTyiHKGVQXAfo/J9PrDTutiblMUKFGwZ0TLcy1AFRsasHvu1BXzjydKExYISSP7TzzTc0+6lSw00pLpduhavRuH2h+yWWjuDNKqNQbvZvz9Yx7qig8g7mhRaH+b+UT83w60q06gRsKvyBAXKM2UhTzS6TQVArz5Ur5ww46ZqmO4+Jyeg/YQnY7CFaiUkDUfJhuW9flDulAddryLD4bZEef5FM2WmckAGYSynoQkkPp5NPaIcunhQKRYnwljUin1p6QYyXDSxJSiWoeFI3+vnX3iLAd3OClJOlTjUNxsaWFawuHwTxx1/2c1WTvXuRYTEqQQpJKVDcUaG7Ku3JACcQHFtYFfUbwlz5wfwhQIFQfm/BpFCbjNRYVJsI6iy2pv4Z4hnWu5MWDmdrw+OlzE65a0qTyDC7mfasFRkyNRJoZgoBzp3J62jn0rFqkIUnUQVDxEEgAf2ix8yflvtLxBIAJYbNsdgXHMaN3xB3TagwT2f7TNGmrqfLHPsIxZ/jlYWsmYpKiBXVVzdxYxF2h/hUnF4eXiZGiTily0rmS7S5iiHLAfAo9KPtvFOXhEzZstLmZp0neqqAjlnPrHWcskKlSJUtfxJQAqr1aofiD/Dkxu9ovqnLET5SzHLZuHmKlTpapaxdKg3rwRwRSKkyWNrfTpH1V2k7OYbHS+7xEt2+FYotB5Sr8rHcRxDtZ/DfEYNZV/1MOTSakfDwJifw+djyLRqYEUiEJJNg8aEQXxiDL/p0dJNR1N3BrTeBy0dIqRLZjPhMStKAkJ9YI4XMVIlrSomoNL7ft9OkBpq1pYEgEgUFD5sYImW+kbn1jFYlDmPKMjEXcdjdUxSgBp1CibDo/VoN5LnY1hKmBs/5RHj8iCiQl9RuwO3ItAXEZPPlMrQVJBcKFfleC7qrlxmcFdDkTp0nNEj8TUvxERz9KVEEhQavlaEuVjkzEpA+KxBcNu4NmiMTgQEsU/hPNDXahhH8GB3GhqsDmZm2N7yYrSKGjV5d+v7WjXBSilYJAUxbSxrWrdfOLs8Swh0yyXLJSpRL/wDLwAW469IoIKkuH0vcCluYdGAmBM0sWfdLGJx+tVEbvS7Df2+kTYo94n473o2nen6xZy+QGLpoQN2rt5hnp1iRUkJqQGgDWhfKsdo0+7zPAeMwyJekySug8RJavLV+/nYyiWVjUu6jf7EbZvidQAZh0ATT0ghk8hmVMUAGZI6Ubyiz2Hw8nuHVAGwOoYyrDBnaCM3DhSFKTcM455LcRUwjrok+EPXnoCzEwTQgBNwOKcflWMlid3Mb4JwPSKmMwHeLFHAILfNvKBnaXBPMK0JADVADc1PXrDjNACnS4iKZLJIYAkCxAMM06oqR7QdtAbMW+zmbJSEoI0kOHNiXoIYk4kqVQCuw28oTM7y0pU9iTUC3nE2CzJaVJQS4/u6Qe7TrYN6esElrJ5Wj5kctM1MyWpLhr9Rb6RUGWd2dQCglJcM5DcFqgX5aCOTgIQnR4lqDAdTc+idzFjPsJN7pITUuSW4d29+P9q01sxO3qXvdV5MpIygTQ/euDVgatV9/t4S8zw5l4ky5elphVpCQQaJoGHPEHE49aUhJTa5B0kjcE+nSKeIxnd6lIQO8UClNSdDvXVud2ZqDiHaAFPfESLbxwOZFORLGgS1FRstwAAb8/ozQfXLKZVwAaX3FKj3HrCtkU3RqK0vVzuawQ7R58goQlBAIo++x/f0gToWfaB94VRsG/Mp4nE6UrJUB4WFbk0YcxXyvs+vESlzjM7tCX8ShQsLBq+sRLJOhLBiQKhid69au/wCkXZsyasIkAEIQwSigS3NGdRuSal4ar21iAewuYfwuO7slPhLSh8BNKED/ALgzvc7xnZPGdxOUFEFE4sXu7Ofd/cQNmy1IG7ln2agGkAbU9YgxeE/qJUFfCoEkEW3NekJna5I947p+Bgx1xWAlpGpYA1lysE0Ip5f62uEvCSVLmzCKhBKQpIcHre9geGMEs/w2JmslK3Sh0slnIIFT0om/6xX7MYc2UQhKKabHzdosuK6MH5pVgTcSDxJsQdABICuhF+kWMJLE6YnWyUKUTQ0Bbki3pFDNPBMpqmId6hm53i9LnAkNQCrXqfzgXyV8wbr4luBD2WY+VInAoBUNQcmtEtQe3yjqcnEImgKlqCgQ9DX2jjAIu8T4bGKQQUKKTyC0W03xJ6eCMiHt+HI44ODOvqEeatjUGhEKeS9tAWRiB01gfUQ2pZQCkEKSbER6DT6uu8ZU/aY9+mspOGH3iD2s/hnJn6pmGCULKW0H4QxJdB/CeluNO/D82y6bh5qpU5BQtNwqnrW46ikfVbtATPyDMS4B8IuAd1Qx1Adzj+Mwy0o1yVEpIcoNWO+ndr0FRAuQCgpJdJV4q2IfYmOuZj2YStCVyz3a9ILgUJYXFvW8Iee5PMDIWAkioYOD/ibjyjOuqJ7EYQgcgzMvzEVBFHqea7tBkzULDBheorxSE6V4XSp36/fzi1l+KCFeIsGLNb/cZVunwczQp1APBnnaTL0JBXLACh4n58xA7KcHLKVLVqKgAlLFyZqifCzcAnyUII5/M7yWydLs5qPy3/WA+ESUTJqEkMGWlROkOkeIgn1L/wDDyhugHacxbVkbhiFkTgUKdR8CWpsSapAP4dyzQPyvCmYStSgQkuX34FeYrHFJCCkl3Vtt6ihc/QRunEy0nQV+AdLneg2294gqccSqYzzGPHYzDBgFBSjfSDTzaByUGYobAlq36Aev5xLlKJalayk6TcWJG23rBieXCUywlKXckAOzipN/T2hLAQ4H9ZqKx28wZjOxU7QqdMWEBGytw9PxXMUpzDSzP+14M9u8QoS5TlkA/CKmldRc3JPs0KCZjnygyK7qC5+0XssCnAjng1q7tKgBpTxd6Vu/tGTVktt91gfl+MdKUgMfdyLO9GjeZmJTKmhRDMDS/ASluvmB7Qt4JZsASyXhV5kok63dTkdSPoY3wGIUVsNmr9DATBZxolrHdkldAeB+K13p7Qwdn2K6tZ/OJvQ1rkw2nsV8zb+UbV3iSUquoVI9OkI+bSShZWgsAQxBuD+MHguKCz9Y7ImQH0tUfKBXaXI0d0olKajxOLi5I6ux9PKK6PWBW2uPp9JXUVbuVMX+xuazQhMvS+uveEVZ6Vsw49YeZeDcBUyrCgG8c+7GY4NoUwUi3UdPnDdje0yZSUvUlglIDqPUcCCWaixLSir/AClFoDKGJhOamSUtpS5NmfexephMzzCBC6ABJ2FgWq3EHMdmumWJ0xCkAlg4Dmjmj2HMI3ajtL3qU6EFIFS93ttQBvOBVi++zJGMcGFPhVJKGY4wSSQlnWlq2Ym5gbkuWzJyvCNTlgdr3r/uKsuanWCoa6/fEOuQ5pJloKAmchVDrSwF6B3BNLVEbaIEXbMq2wscyfMMhUlIKVh2LueoHhYVKqgB6N1D0Zau7UEljpuerWf2glmObESCoLMwKUwUQRpYalhyTVkp9VDmB2Q4YzVB/MlrOan7tCtyjEtVzzL2JmhaVEDT0d/02itnWLlJl6gpzYioNtmurerQSznJjLGokFIoWpVrffEc+xhUqaoBRqqoD2HPMD09QLEN6Q5sIGY19n8QwCtakqNr/NuWEFZcogBSUEP512N4AS3TpYWvbg1DQ0YeoDVAr5QrqWwc+8JpQXByZ7nEjVLSrZKtKqMamgeKeFUAgB2pGmOxClEoS7qrVyKWeJJeSLCUqUtSkENQMxrTq7bRGN6gE4MN/wCJy+Mieumzv98RPLUNwX3NoHYjChCkNU+V3+2PkYLYQOmt+Sa2b7rAbFAHcYqvLnribopUGnvBTJc/m4dTpJKPxJNv2gPLZyzOb/Zibu2gIdkbcpjDorDaw4nVMszWTiUvLUyt0Gih6bjqIG58n+oP8fzVHP3II9x+ohgxHa1KtPeoOsJAJBFWJrXeN/R/FRZ5beD7zE1Xw41ndXyPaOWE/wCmj/EfQQG7XZfLXIUTQiqSOYL4M+BH+I+gjTNsN3klad2ceYjR1YY0Pt7wcTOpIFgz1mcIzGUty9RAdcxaA2331huzXDVMLOIy6aot1jD0+o3jLGbV+mC/KJrhCEBMxQLlw3NC3zEGXRO0LQxIrQBJSxFjuOhc0hbnYYJa7gv9NvSDXZ/DqK1pSrSUupJ+j9CG+7tYzyDEbgQeRA+Y4PWsmoDuHqfffesR5VlxmrYHSHAJLMHLA1LM+5hrx+FT3a1qOldQzXs/lufugjJClJSFu5Jc0oLCnLj2ifEOIMgbciG8Z2fKJdFkTAwKNROrqK3LjgHaI8t16NSnJHUi2xF+kHcuwYKlFPhI0gMXFQ6SC9i9tmaJsZgh3anT4jQM9x51Yl7tFXRXHHcujsOzAk8fzQEpZJUHYswa71q7MPT1KzisvMslALsaHkf6hxy8gJ8WxFC3yiDtdlqpcwlI8IDvTxBr+sKLZtfA6MbZN1eT2IvZdOZW6SPtvlBTMsDLXKFfEOOTXfza0C5CQZpUpyAK1rQAXPSD2ExyFHQhLJUyaVVfi0XPzgiBGNvMXkIAOghmAr6km3Vx6QUyeeoTUp82dgWAdyfJveNc9ywoJMsEsaDfqD5ivpu7xXwuMlhOkfFuo33p5ah8ovaNykTqvK2ROhYTG6JplqIdnHl/tosZtmKVAoFSKtxtX9OkIOHxpVMlLmTAAi6iam5Nert7RrPxmohZXqdLkhwkgPbmn1hX8MgDYzzDG1iQfaE8vEuXMWpKXBSQAdnu0X8uwOucJi0nw1s9fwj74EUJGCWQGKfIX6PFhWcKSdLFL6amjMGoft4qAwOTnEOtoI9MyLtZMOoKIBoKGzCw+r/nCFmxsHtVuA/0tDnnmMSEPqc7+EUHm53hCW63J3qA/G59/nDuiUYz6QGoOBibYTBFbEWdncUPXfe8OiMElKUpSwWCQoEPqS1b89IEdm8KpThmlksSTQuPv5ciGvM5MtJT3Ts1Rdj4Xb146Qa+xgMiKIqnuLGMw+pQlAUKlKVYAAMUt0en/bDV2dkBDGWRqJDejOGu16/KA2DQe+BDBTkEq00uADqoPxcwz4WZLSF+IrUQzgFj0D7er33gSNu7lnG3gSHtNj/6CksKAhLu6iCx0jdPhvza0I/ZvJElf/yCUk8Eee8OeUFC1rmLZXHCQ+lIB6Ughg+z4OIXMfSkCxfxOzCo6QEagjdj/sOaQMAyDMchlHSZbISlFSHIJDuQ1Wo79atFHKgNSyU0YaVKtcs6QLH2hixXdoStlJCSWCXrQX5Yl6GAk+YAkoI8JYvYj1Ff9Qo9vuuIwlGWzukapKdQZITW4JL8X26QzTcKkSSgK1Ehwz83Y+Q94X8KJSSCottW1+Xi7mOYy5aylMwEMGYks4s482vvASX5bH0/0RlwvCAxfmIJWCA5S4JuKhn84sKS7EmvrEqVXZmvFnL8qXOP9vNrt12jizOZKKKl7lLUNNL9YxOtklaNIV8LKBB59rQSzHK1SUlyC5YPRusBcFmKlKUhd0FuQfIinziQnlbIkG7DDnuX1Gz084pZgnxDy/WCKpQNR5PFPGy1ON6fmYHSfNDWZxOs4T4Ef4j6CLAiDCfAj/EfQRMI9xieQiP2q7P92O8T4kv6jz/WEyZ4S/EdrmSgtJQoOCGMcs7RZWZKyk+h+hjzGu0g0zgp8p/ofb+09BodUbl2P2IlY8Ooqagv9YKdnjqSrQzqF93FBsW2NYybhtVObwElylSpigBU7gsCOWgtD71wDzB6tduCeo1doMT3PdP4pShoN9wfF6h7wqpwykKMtSWUjYmrE086QUwmI7xHdTS4JIDmxqxBs1W9fN480wau6QnUlRQfAoOSQXLElwANJoC2zUhwgEETNGSY15QApCZiHSopALOElVfFppYU4vTeI8vzMpWuRMVUGnLEP9T+wjTspmCFyxYTEhlII43AP4Yg7TKQuahafjAAJHAsOKQmrMpJY/lGzXuAVJPma0y5S2LqNCWFd3++TF7CgTsNL1EhZRV/7bVO1AGvvAVKUzHBUaJcC7niLOSYx9Ulav8AinZwACn0qRALWFpDAYxG618NdpPJi1m+EMokNR77WDD0tEGUYqpFvL78obs/w8syihnUQamrwh5fMMldgVVSxHLio+9oPURYh94rcmw/SPyVPLTLmLQgM5VMbqfcjmv0hZznBInr73Dn4yRRzYt4gLE0LjrxEvanGCTJShJcqSlTkDU6SwPxOCynv9YC5VnUwL8KiXNUmqVX5qKWhqus43RXxNvEgy2TMGIlifKXpc/GlQFiQQ4Y2jr2iXMkJQUpIIZjt1pWn5tCTjsaZ6E6WlqQ4EpRoTZwWDngHmCvZbPtSVS5zhSaO1P+4becLaxGLB1GQOMRii1SpU8HMq6lSFFqJUokA8OW+UEps1E6USAHSq7daeb9RvFTtDNTqAB1KuCBcncq3Nh6Dl437PSwy08t5O71gdjceX1konPMUe1epAoGBoPz/KI+zOWS5qwmYoJBBIKlaXNGFfUtFntxidS0pp4RQclTn5WiHKsIUgTVjVMagLqbg8AAPDVYxSATgmTYTu98R8wfZruwEvRixFQTsLUgXisQVrEoLOoeDQwABNlOPv3ivhs4nhOkKYNZwnpdTjyA5i/gcICsTVKPepUNSSSqjDxOTzV7XHAiuzCEGBD5cAQbMy5cskln6V9eDEmFlkkBVvn84MIy9avxFSRYHz+ZgrhcqSBUEuLFrkDdoQ3M44IjxUKeRKWEysBOrUAmhJGzX3vesBcXmBVOIRMUZSf+osv7AG5YWgl2gSpCCiWrwmjhzX82aFpGju5iQVUG4HIdJ3fmL11jBDDmQ7nIIMNJwsladapzPsAX9XiVLlHwkyySAXqw3qX/ANQMTPK5aGQGFQW+3i9h9BV4/wCmDskH9zAgB0YVnaVJckhTamBLOXoLl/lSMxWEIJIYk1cW8+gpB3AZYhZ8Kwo9QeaH6XiviSZSyF/Cm5DFgaEjlr+kdhgRkShYEZkGWZZMUBMQpCmuioV1ZwxNPnDHJkoUUGWVaVjxM9Ll+ho3mYQZGalaiEEqCVV0i1aKPBeDuBxS6oBKFFgGNzweKCDPXtwSv5wdT5yN0L9ocYgASdSlMH1GrWLecCJGHCaaSN69dz1i9Kytf4g3PiBLdA/ESyMMkGlvYwhdbtBXBEeqqBYNnOJHKRxQHaJcTlq1MQkkN+ZhhyXI+88R8Keeegi9nLJUlKQwCAB7qhj4d8PsvPiNwvp9f8QWt1y1+ROTCOE+BH+I+gicRDhPgR/iPoInAj2E81Nkwr9vZYUmWG8VfakNAiLG4BE0ALFrEXEJ6+l7qCiYzx3+cY0loqtDt1OPGSQW55iDMpKV6NLAg+JR6hreW/TmHLtVkPdEFLlJ3/KFtaAPwgx5dXamzDDDCeiYJqK8r0YsYyWJQDkHcNY7fSJ8uxXeJUSauAetLxZx2G1A9fzijlGDKSZbjUXIYirB+eI0DZ4ycdzOWk0Nz1LM2eiUkrKmVsAKvRiSaAX60gZJzyWQdblbuLMzfWNc5wqioo1UAJJuP9wHl4Vi4TqA3g1VKFfN3OttYHywxhczJUwsbwXlgA692PkX/TaBmDwYEsKIcqt0+zFvDKUPCTS0BtwD5Z1VmThoSkKXMBNWdq38/KBWaZYe8ExqBnNfQnpDBlK0ofUQARF4zPCSEuC9/aE6rdtuPQ8Ru+vemJz7tMAUBe6iGf8AtSlKfOqg7fpEXZfAJmKKyFMlgEpo6i6rtsEqPPh6xf7XyyoOmWQkNV6dWADN+sb9m58tMuSlawNcxS1l1OUswTTqgF6UjeThZj28QrmeACboCKOALcG/+6RZy/CiaNQJTNRQup9aeC9yL16vGY+dVICSEmqddaOQUuBUWrelGpEuUpLKVXxGpNzCVloQn1lqKt7Y6lvOMIhQSEn4QwIsOfdt+BG+XSO7lLJAJIGwNqkkm1CbcRHML/p7e37xDmK/AQ9D/uEVvJbJmw2nG3EQ+0GIAxOoVCQAN7eu8H8Kn+YSAXQ4dIHLb9A9T5QtYjDhU1bqbSHA5v8AkIaezOYSO7Kph0qsnTRxukNva1Y0mUELxM922lpdRKlpASViYQqt3ADU2+dQxgiPiQUGjKCS7akuBpNatcdCIjy/C/hCAgIVpVcOfC9yb7BPFSWBOq5akzyqiQwIALjgU5iNU+K8RfTLutEMSsxWlJGkAPRnG3AiM5oQ9aniKveKc7uz9DEUmQpSmpeMU2H0M3dqgcyrn+OIQ6QQoWO3tArs+uWZf9YtrJJd6h2JpV3EMOOwoKKtQlJArV7e8L+MxKESwkJJILD3t7niHKG3rtPcRuUg7xLeBxKUzDKcEJNNnGxr0aGSZlutBU5oCQ4G35mAWXZkFlKEIWakmiXDP0v+73hgyyZNmJWkPSqTRJI3lrAoFcEAPEvVtbeOR6iV8beNp4lTA45SdACQydwKkdd2q36xPipo7mataEmXapNLnh+faPZeEE0gA6LPqox8vP7rAHt3NVLw/cyy4c6iFaneodqX6Bvraiov5j1+84nHliRludrkTCZQSlKiS1yzlgTQ2b2hhy7NMQslQZ2qoJoOfsvC5gcsUojSDWg68w/dmsjVoCFEpSL7FyBXyYX3aNC1l6iQBzJMnmKM+YCoqJTcjS4BDeEGg6CHrszhEKmMvig5PELWX5IZWId9SWLF/qOYcez+E8er+2sYF43aytAN3XH3OZqVPs0rZOJfn57JSoy2V4S1BQRQzhYUpKklwUBj6qgpiculLVqKa79YF5vLCVJSkMAkN7qj09A1Qci3bt9MTHtNJUFM59cyDsJnicXhZax8QASocEUI++YY4+ff4Zdo/wCVxIQo/wBKayT0V+FX5eo4j6CQoEAiH+osZsBG7xqI9jpE0xOHTMSULDg/bxzftDlhlTVJuNj02jpghf7Y4HUhMwC1D+UY3xnTBqvGUcr+n+O5pfDNQUs2E8H9ZzeeIgweB7tXfqBII0p9S/8A+YI4iU0UJo5NIwarWHRm9ZWD2IN7Q4xS6q9BxADDzlJCnq5dmuzUDDpFnPcR4gBzEGFlliXZvv2jWpXbWMzK1DZbAhrKZveBSCSkUopxUJoD1FuBWN5JAIL09zf2tFKViSMUFKACfDTTQkABVByOPlDDi0uSQh0E0NmNQRQO/gdjwWjrUzyInnBmYzDPL1oJdJ1Bul681+UFMon6pYU/4QOKufK1B6wvSscZbpdgfrz/AKgj2fwP8zLnoMwICFOlKSxFB4qeobqYilEOGEYNrMpzFPtZjVusJQQgHSpRc7uUuaV02HBjO9EtaUlCVd2lMvSXFQlImdKzCq4tTrFDHYeciaBMPeJSoKL0CtLbnkButLmI8LMWomYS51eKj3Lv4nd1cvfeNAt5ciJMPeMa8ZqNAyRTSS7VsK26bQwZHLdAA9D+8LU6fqpUsAePNh+0H8jmgy2EZWpyAY5oh55YX8RFaG459toixSXTf0iWezOaG/5fnFaZMoR98RnjubPpOe54jTPbp/uPcNi0BQejO3AuxI6Fj1aLXabD6pifb5weyfsnKMpyvxEGpBYfdY3hci1rumJdWxsbEL4LFhYlCXqCEBkOW1kUUvSaChbqVK4Y3cUCAFKZ02alQX8m2gZIkl+5QdaUDRUBncWJ3peGlWRq7sMdRZjXfcP5wnrLwFltNVg5MjEsE7ADgi/0+e0aZmvupa1KIsGoxq+3p5RLgJaEOCXUQyh/b1fdqxWzLCCaCkg1oL0vUCFKkAbI7jbnP2i9lcwrVpai7EkCvDmm8XpeQOpSitOlJPLuQ7WYq6PEmX4HSkpWKXu1RS7N1Y1aCcmUCgt4iKK3qA4SDetmH5xo16ZR5jErdQ54EH4PA90T4ak0qNQZm6PzxVni8uVLSgrK1FV6t6v6Ur+kb4s6XANhW59N6xSFVhJT4VO5q6W+JgQNopfgqUX8pahGzuMN4RI7lKj8SgSb1ck1pcN5wPzrLRPklJFqs3Gx33gmlKCAQW6PbqCa2i3h8MKEXe423qeKW+kEqA2hVxjEKxIOTFfJsrlIAJGlewDW5aDyJumxpyHEWRhVTSyap8hb03qYYMFlJTQ+ECxDPW9oT8F3YqjE/lCNdWo3Mog3JsH3i3bwiqj+kMrAUAYR5KlpQGSG/ON0IJMa3w7Q/h13Pjeez+wmZqtR4rcdTSVLJ6wmdru2ODkYjulKUtSEgK0DUAXLpJe43ERfxC7eCQFYXCqeaxEyaLS+UpP9/J287cQnYita7uTGljIisoyjHff4Xdo/5nD92svNleE9R+FXr9QY4IEGlPTeGnsNiZ2GxCJwBCCdKwaOnenS/pF/SVHc+ihGRFhZ4WgKSXBDxLETp7Gs6UFpKTYho9jHiHUMpU9GSCQcic8zbLylRSRaFjMpZEdczfLhOS4+MfPpHO89y0hwQzXjxd2mfR3bG+X0P++s9RpdUt9f1iD/AOnqUtylz9/tF9GEKA2ljT8xaGbA4cmUnSlz8JB6E/t7iNcVqopSQwIDt9fn7Q8Lt3HtErqivJi3luBJ/pzDpLgpKrNcD5/KC0pTpJYKL7mqiWCimla/SCWay0rlagXISSnpuXDbwvdnpyiFBnYClCS5anT9oOOSYtYOAZbmolrDMUqDuFEUrYbuOPOLWUqEnEKBFVy2cOWZ6Uu7iI8zBfxFJFNJSGBSQ4IoKF94jk4kHES6MDL26be4+cdUcMR+UhDmLHaia6jy9f0MA8PmCpai1Xv+XrDH2qQkKJZiojYh+sD8NgylgpIdKtYa70uePDDYIA5lXGTLmVzZqlBOlIDhzcVFE0cOfq8GsH/TUpKvDRwPyg7lGUomYLWgst9RrwWY9N49GVy50rvCDqNLhn8ozbiWbGOIekbeR3BicYFbiPZiwYpYrJFSh4VgMeteg6ffSK2JxRQEpeqjyKXc+ge8AOn8wCx78SAuSJBmeGealVgkV68CCeQTQJg7wOg3uWpf3irMnOly7dQYGYlcxSmkhT8D7uW+YhpKy67SeorY4B3CNq8SjDzloZgpThVDc2LlgP0g1js3KUshYTR71ZTjmv8ArmEXL8nmBPeYvvQo2YuwAYMPq93hgE6UdKACsJdllCkKD/3D8VeGr6wdlTaUzEw7bsyxh5K1JE0BVCXZ71Bf1jSbmpSoJCFKV/ax2HnQRLKnTJaUBKlAkGooQdRBsau3y6QXnZiVjS5IYFyNVwKiwu/WEUUK/mMeLErwIBR/MTCNaESwFC0xIIHTUW26XMEJMpIcFWgAeE1UEn8RUxq9HvaJMTOmiiEpIBDO5JalBY1O5iCVg5ipgJ8Jf4WAa1SRQeX1hx7Qvy8xUISfNDEvSWCWKCb0JPsPntu0Zhcq1KKUgly4DcXHk/0EWcvw40BLMRQUre/oSYZcrl90DoQVLN1Hwj5xn3FbHXDYz364HtjuNq5qUjHP+85izOykyiAol7lJZ6Wq5/KC+CwwUEoKdKd2Jr5xPOwx1lcxQUo7D5QRw6PxGlKDiBaSq2281pwuef8A5+vtn2ldReAgJ5P7yeUlKAyQABxGFUakxtKllRj2KoqjAGBMUsScmey0FRhL/iP2zOGQcPhi01Q8UwAHSHYgPv12+kfb7tr3YVhcIrx2mzR+HlCT/dyrawrbn5my8UkS5y+7mgaZcz8KuEqBtU3EWAzyepGYtYvFlanID7sAAQwFgwekU8QpL1A9z+hi9m+Xrw6zLWGI3BcHqDuOsB50wkxZuuJwkUiaUsR5wUTms4gJHyTFjKsuSmUmaU94tRZCNh1MSTMNMb+tOTLGwDelBVvOKgziJ0z+EfaMrQrCzSdaKpfdJ/Q/lHSnj5ty7Nf5WYhco6lpUCoixG4fqI+hcnzBGIkomoLhQBEWMiXCY1eMMaxE6bhUVsxy6XPSyqK5id4wGB3UpcuxxkS6OyHcpwYmTMgmSJhYOhV252MRqlOGIuSS4G+0PYXzWKOYZKiaCUeCYd9j5iMW/wCFlBmok/T1+006tfuOLB94i5llie6KQ+kgvyD97Qq5NKCFKSzs4P39LwezpU+UpSVLJPsOo94EZYla5hKaFjrbgEU86/OFtIMjIhtWuFlrM5etaUi5ajvpoPKn6QOmJEqdUOEp018rwSn4GWpi6n8J+LTYWYB3LCvWPM4w5IKqgselbgHoL9WgrEBjj3gKazjJi/2hkaiNNhTmnMA5R8SanwkJPQO/z/IQcViyZZ1J07e3X0inh8vSsFfLc03drHyi9bnJBk2KCMiMWT5t3ctaUKQTTwlbEu9gQR5xcnZkZUlCFJKWD6i7Kt6Evt0ihg8JgiolKiFCq9fhOwDCwAJECu0eN0gS9TBBo1Xp19A9bRRatw/P+cH4hV+JTz3P1rV4CAnyrTch2Dn5RSwmJcshJUshitZc9WAokN1rFCY4qqp4JNX3NYZ+x+EVOqS4SAkBhQV3v9mGbCtNZbEooa59uZPhZKpqgguqraZYSA/Uip/8oPyimQwRLBP/ABq1nJVSg3ofMxemzBh0JRLSEah4in4j1fzPMYueBLBSwPwgs3AL+9w30hSu/d5uhDHTAZHZms/NXQkqBUVLYygHVQEuHUaUYsBxcFvJYCvEUd2kB1JSH8weVGtKAH5x4PLCJqio6RZgankHpa/zgqcOSGSpPI8IIo+7PYmDNa2OpCUc8wdhsGuehTpAVTSHsB5bNt0iXLJK9K0rBZNQD1PTanz6xdlzQCAZTEbpVf6iLaBqQQAEgl1FZcqO21h+cIhizc4yAff947s2jjo49pXyyWXc1ADsWawHnWzdYJYHBd6r+mnSm+rgHpFjL8uVMDAaZbuSWdR5/aGKTLTLSEpDAQxptNZeAoOEHr6n6D6fX+UX1F6VknHm9vb8/rIMLlyENcqH4jFhYe5J+X0jwqjx42K9FUgxjMzGuZjnMwS0iyRGEx48byZRUYZStEHlAEGWJ7nsmUVGEzt/2w7tKsNhVMq0yYPw8oSf7uVbWvbft12v7oKw2GV47TJg/DyhJ/u5O3nbmClBm9IIqbuTKlsSioqFnjcKM10HS9gCAxIBAI4U1OD53spQyTpOq7gP7t92iqEWHJpc/SvtFzKiQ5nMUZEtBD6SfEXdLhjL+h9IATVB7t6Qz5liwVrBIJYAuDVuRVyzVcGkLs2QCXBpxSnSpEDPUIO5exOZJlaUy/GUhtRs5uev0rAkzCpRUak3MZGRVZzTaXHVP4Pdo9KjhFmivFLfn8Sfz948jIJ6Sg7nXFRpGRkVkzyMjIyOnT143lqj2MjpMAdscp71ImJDkX/WOfpBkKU1j8/toyMjAvUVavC+ozNahjZpyG9JVx2KUoqUFEA8cNv98xYwWLHdtMdWxq5INB6h949jIVZiDmWBx1FLPJa0kMD4i2nqbMOse4JamYnSzgncVD0O4CTSMjIaztQESjcmEZ0llPQqoTRgQ7l2629IgzCTqBIAZSk+FnKBvevFvWMjI5mO77yqqCpMHy8pJJ/ure1rw29mynDgDSTyU8/p+kZGRS3zZUyqEp5hCk2cmbqYBXiBDkJO+oMS9vrEih4SjQpRP/GgtUuaW3jIyALUvy+kL4zZzLmJRQiqdmLgU+vSsbYZKiEklJ2uTdvC/lHkZB92TiWrOcy3MlJV8RbTQ0d+PX9oPZXluvxzAyHdKeeCfSPIyO01a3aoo3QGce/JHM7UWFKgR/zj0hpR2FBwIiJj2Mj0IGJkTyNXjIyOEibypZUbQsds+1YlA4bDq/qGkxafwcpB/u5O3nbIyLINzcyCcCc4WiharcRpg8D3itL6fy5jIyGD1BjueYrCGUopfxDqzfvEMjDaiALjd+vWj294yMgR6lwOZF2lko7x0pZrbcE9LvC5i5UvU4BrU2Fd6NGRkUxxL+s//9k=',
        vendor_id=vendor.id
    ),


    # 🥤 Beverages & Drinks
    Meal(
        name='Foléré Juice',
        description='Refreshing drink made from hibiscus petals and spices',
        category='Beverages & Drinks',
        price=2.49,
        stock_quantity=50,
        image_url='https://restohqrecipes.wordpress.com/wp-content/uploads/2016/07/folere1.jpg',
        vendor_id=vendor.id
    ),
    
]

            for meal in sample_meals:
                db.session.add(meal)
    
    # Create sample recipes if none exist
    if Recipe.query.count() == 0:
        sample_recipes = [
            Recipe(
                title='Classic Pancakes',
                description='Fluffy homemade pancakes perfect for breakfast',
                ingredients='1 cup all-purpose flour\n2 tbsp sugar\n2 tsp baking powder\n1/2 tsp salt\n1 cup milk\n1 egg\n2 tbsp melted butter',
                steps='1. Mix dry ingredients\n2. Add wet ingredients\n3. Mix until combined\n4. Cook on hot griddle\n5. Serve with syrup',
                category='Breakfast',
                prep_time=10,
                cook_time=15,
                servings=4,
                difficulty='easy',
                image_url='https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445',
                is_featured=True
            ),
            Recipe(
                title='Beef Stir Fry',
                description='Quick and delicious beef stir fry with vegetables',
                ingredients='1 lb beef strips\n2 cups mixed vegetables\n3 cloves garlic\n1/4 cup soy sauce\n2 tbsp oil\n1 tsp ginger',
                steps='1. Heat oil in wok\n2. Stir-fry beef\n3. Add vegetables\n4. Add sauce\n5. Cook until tender',
                category='Asian',
                prep_time=15,
                cook_time=10,
                servings=4,
                difficulty='medium',
                image_url='https://images.unsplash.com/photo-1546069901-ba9599a7e63c'
            ),
            Recipe(
                title='Chocolate Cake',
                description='Rich and moist chocolate cake',
                ingredients='2 cups flour\n2 cups sugar\n3/4 cup cocoa powder\n2 tsp baking powder\n1 1/2 tsp baking soda\n1 tsp salt\n1 cup milk\n1/2 cup oil\n2 eggs\n2 tsp vanilla extract\n1 cup boiling water',
                steps='1. Preheat oven to 350°F\n2. Mix dry ingredients\n3. Add wet ingredients\n4. Add boiling water\n5. Bake for 30-35 minutes',
                category='Dessert',
                prep_time=20,
                cook_time=35,
                servings=12,
                difficulty='medium',
                image_url='https://images.unsplash.com/photo-1578985545062-69928b1d9587',
                is_featured=True
            )
        ]
        for recipe in sample_recipes:
            db.session.add(recipe)
    
    db.session.commit()

# Routes
@app.route('/')
def index():
    return jsonify({
        'name': 'Meal Order Platform API',
        'version': '1.0.0',
        'database': DATABASE_PATH,
        'endpoints': {
            'auth': {
                'register': 'POST /api/auth/register',
                'login': 'POST /api/auth/login',
                'me': 'GET /api/auth/me'
            },
            'meals': {
                'list': 'GET /api/meals',
                'get': 'GET /api/meals/<id>',
                'create': 'POST /api/meals',
                'update': 'PUT /api/meals/<id>',
                'delete': 'DELETE /api/meals/<id>',
                'categories': 'GET /api/meals/categories'
            },
            'orders': {
                'create': 'POST /api/orders',
                'list': 'GET /api/orders',
                'update_status': 'PUT /api/orders/<id>/status'
            },
            'recipes': {
                'list': 'GET /api/recipes',
                'get': 'GET /api/recipes/<id>',
                'categories': 'GET /api/recipes/categories'
            }
        },
        'test_users': {
            'vendor': {'email': 'vendor@test.com', 'password': 'Vendor@123'},
            'customer': {'email': 'customer@test.com', 'password': 'Customer@123'},
            'admin': {'email': 'admin@test.com', 'password': 'Admin@123'}
        }
    })

# Auth routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        if not data or not all(key in data for key in ['email', 'password', 'first_name', 'last_name', 'role']):
            return jsonify({
                'status': 'error',
                'message': 'All fields are required: email, password, first_name, last_name, role'
            }), 400
        
        if not validate_email(data['email']):
            return jsonify({
                'status': 'error',
                'message': 'Invalid email format'
            }), 400
        
        if User.query.filter_by(email=data['email']).first():
            return jsonify({
                'status': 'error',
                'message': 'Email already registered'
            }), 400
        
        if data['role'] not in ['customer', 'vendor']:
            return jsonify({
                'status': 'error',
                'message': 'Role must be customer or vendor'
            }), 400
        
        user = User(
            email=data['email'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            role=data['role']
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        # Generate tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)
        
        return jsonify({
            'status': 'success',
            'message': 'Registration successful',
            'data': {
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': user.to_dict()
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': 'Registration failed',
            'error': str(e)
        }), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data or 'email' not in data or 'password' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Email and password required'
            }), 400
        
        user = User.query.filter_by(email=data['email']).first()
        
        if not user or not user.check_password(data['password']):
            return jsonify({
                'status': 'error',
                'message': 'Invalid credentials'
            }), 401
        
        if not user.is_active:
            return jsonify({
                'status': 'error',
                'message': 'Account is not active'
            }), 403
        
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)
        
        return jsonify({
            'status': 'success',
            'message': 'Login successful',
            'data': {
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': user.to_dict()
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'Login failed',
            'error': str(e)
        }), 500

@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({
                'status': 'error',
                'message': 'User not found'
            }), 404
        
        return jsonify({
            'status': 'success',
            'data': user.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'Failed to get user',
            'error': str(e)
        }), 500

# Meal routes
@app.route('/api/meals', methods=['GET'])
def get_meals():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        category = request.args.get('category')
        search = request.args.get('search')
        available_only = request.args.get('available_only', 'false').lower() == 'true'
        
        query = Meal.query
        
        if category:
            query = query.filter(Meal.category == category)
        
        if search:
            query = query.filter(or_(
                Meal.name.ilike(f'%{search}%'),
                Meal.description.ilike(f'%{search}%')
            ))
        
        if available_only:
            query = query.filter(Meal.is_available == True)
        
        total = query.count()
        meals = query.order_by(Meal.created_at.desc())\
                    .offset((page - 1) * per_page)\
                    .limit(per_page)\
                    .all()
        
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
        return jsonify({
            'status': 'error',
            'message': 'Failed to fetch meals',
            'error': str(e)
        }), 500

@app.route('/api/meals/<meal_id>', methods=['GET'])
def get_meal(meal_id):
    try:
        meal = Meal.query.get(meal_id)
        
        if not meal:
            return jsonify({
                'status': 'error',
                'message': 'Meal not found'
            }), 404
        
        reviews = Review.query.filter_by(meal_id=meal_id).all()
        
        meal_data = meal.to_dict()
        meal_data['reviews'] = [review.to_dict() for review in reviews]
        
        return jsonify({
            'status': 'success',
            'data': meal_data
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'Failed to fetch meal',
            'error': str(e)
        }), 500

@app.route('/api/meals', methods=['POST'])
@jwt_required()
def create_meal():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role != 'vendor':
            return jsonify({
                'status': 'error',
                'message': 'Only vendors can create meals'
            }), 403
        
        data = request.get_json()
        
        required_fields = ['name', 'description', 'category', 'price']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'status': 'error',
                    'message': f'{field} is required'
                }), 400
        
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
        return jsonify({
            'status': 'error',
            'message': 'Failed to create meal',
            'error': str(e)
        }), 500

@app.route('/api/meals/<meal_id>', methods=['PUT'])
@jwt_required()
def update_meal(meal_id):
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
        
        if meal.vendor_id != user_id:
            return jsonify({
                'status': 'error',
                'message': 'You can only update your own meals'
            }), 403
        
        data = request.get_json()
        
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
        return jsonify({
            'status': 'error',
            'message': 'Failed to update meal',
            'error': str(e)
        }), 500

@app.route('/api/meals/<meal_id>', methods=['DELETE'])
@jwt_required()
def delete_meal(meal_id):
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
        
        if meal.vendor_id != user_id:
            return jsonify({
                'status': 'error',
                'message': 'You can only delete your own meals'
            }), 403
        
        # Check if meal has orders
        has_orders = OrderItem.query.filter_by(meal_id=meal_id).first() is not None
        
        if has_orders:
            meal.is_available = False
            message = 'Meal marked as unavailable (has existing orders)'
        else:
            db.session.delete(meal)
            message = 'Meal deleted successfully'
        
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': message
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': 'Failed to delete meal',
            'error': str(e)
        }), 500

@app.route('/api/meals/categories', methods=['GET'])
def get_meal_categories():
    try:
        categories = db.session.query(Meal.category).distinct().all()
        category_list = [cat[0] for cat in categories if cat[0]]
        
        return jsonify({
            'status': 'success',
            'data': category_list
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'Failed to fetch categories',
            'error': str(e)
        }), 500

# Order routes
@app.route('/api/orders', methods=['POST'])
@jwt_required()
def create_order():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role != 'customer':
            return jsonify({
                'status': 'error',
                'message': 'Only customers can place orders'
            }), 403
        
        data = request.get_json()
        
        if not data or 'items' not in data or 'delivery_address' not in data or 'delivery_phone' not in data:
            return jsonify({
                'status': 'error',
                'message': 'Items, delivery_address, and delivery_phone are required'
            }), 400
        
        if not isinstance(data['items'], list) or len(data['items']) == 0:
            return jsonify({
                'status': 'error',
                'message': 'Order must contain at least one item'
            }), 400
        
        # Validate items and calculate total
        total_amount = 0
        order_items = []
        
        for item in data['items']:
            if 'meal_id' not in item or 'quantity' not in item:
                return jsonify({
                    'status': 'error',
                    'message': 'Each item must have meal_id and quantity'
                }), 400
            
            meal = Meal.query.get(item['meal_id'])
            if not meal:
                return jsonify({
                    'status': 'error',
                    'message': f'Meal {item["meal_id"]} not found'
                }), 404
            
            if not meal.is_available:
                return jsonify({
                    'status': 'error',
                    'message': f'Meal {meal.name} is not available'
                }), 400
            
            quantity = int(item['quantity'])
            if quantity <= 0:
                return jsonify({
                    'status': 'error',
                    'message': f'Quantity for {meal.name} must be positive'
                }), 400
            
            if meal.stock_quantity < quantity:
                return jsonify({
                    'status': 'error',
                    'message': f'Not enough stock for {meal.name}'
                }), 400
            
            unit_price = meal.final_price
            subtotal = unit_price * quantity
            total_amount += subtotal
            
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
        
        db.session.add(order)
        db.session.flush()  # Get order ID
        
        # Add order items
        for order_item in order_items:
            order_item.order_id = order.id
            db.session.add(order_item)
        
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Order created successfully',
            'data': order.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': 'Failed to create order',
            'error': str(e)
        }), 500
    
# Add review route
@app.route('/api/meals/<meal_id>/reviews', methods=['POST'])
@jwt_required()
def add_review(meal_id):
    """Add a review to a meal."""
    try:
        # Get user identity from JWT
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
            comment=data.get('comment', '')
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
        return jsonify({
            'status': 'error',
            'message': 'Failed to add review',
            'error': str(e)
        }), 500
    
# Get meal reviews route
@app.route('/api/meals/<meal_id>/reviews', methods=['GET'])
def get_meal_reviews(meal_id):
    """Get all reviews for a meal."""
    try:
        reviews = Review.query.filter_by(meal_id=meal_id).all()
        
        return jsonify({
            'status': 'success',
            'data': [review.to_dict() for review in reviews]
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'Failed to fetch reviews',
            'error': str(e)
        }), 500

@app.route('/api/orders', methods=['GET'])
@jwt_required()
def get_orders():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({
                'status': 'error',
                'message': 'User not found'
            }), 404
        
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        status = request.args.get('status')
        
        if user.role == 'customer':
            query = Order.query.filter_by(customer_id=user_id)
        else:  # vendor
            # Get vendor's meal IDs
            vendor_meals = Meal.query.filter_by(vendor_id=user_id).all()
            meal_ids = [meal.id for meal in vendor_meals]
            
            # Get order items with vendor's meals
            order_item_ids = OrderItem.query.filter(OrderItem.meal_id.in_(meal_ids)).with_entities(OrderItem.order_id).distinct()
            query = Order.query.filter(Order.id.in_(order_item_ids))
        
        if status:
            query = query.filter(Order.status == status)
        
        total = query.count()
        orders = query.order_by(Order.created_at.desc())\
                     .offset((page - 1) * per_page)\
                     .limit(per_page)\
                     .all()
        
        # Convert orders to dict with items
        orders_data = []
        for order in orders:
            order_data = order.to_dict()
            orders_data.append(order_data)
        
        total_pages = (total + per_page - 1) // per_page
        
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
        return jsonify({
            'status': 'error',
            'message': 'Failed to fetch orders',
            'error': str(e)
        }), 500

@app.route('/api/orders/<order_id>/status', methods=['PUT'])
@jwt_required()
def update_order_status(order_id):
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
        order_items = OrderItem.query.filter_by(order_id=order_id).all()
        vendor_items = [item for item in order_items if item.meal_id in meal_ids]
        
        if not vendor_items:
            return jsonify({
                'status': 'error',
                'message': 'Order does not contain your meals'
            }), 403
        
        data = request.get_json()
        
        if not data or 'status' not in data:
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
        
        # Update status
        order.status = new_status
        
        # If cancelled, restore stock
        if new_status == 'cancelled' and order.status != 'cancelled':
            for item in vendor_items:
                meal = Meal.query.get(item.meal_id)
                if meal:
                    meal.stock_quantity += item.quantity
        
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Order status updated successfully',
            'data': order.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': 'Failed to update order status',
            'error': str(e)
        }), 500

# Recipe routes
@app.route('/api/recipes', methods=['GET'])
def get_recipes():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        category = request.args.get('category')
        search = request.args.get('search')
        difficulty = request.args.get('difficulty')
        featured_only = request.args.get('featured_only', 'false').lower() == 'true'
        
        query = Recipe.query
        
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
        
        total = query.count()
        recipes = query.order_by(Recipe.created_at.desc())\
                      .offset((page - 1) * per_page)\
                      .limit(per_page)\
                      .all()
        
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
        return jsonify({
            'status': 'error',
            'message': 'Failed to fetch recipes',
            'error': str(e)
        }), 500

@app.route('/api/recipes/<recipe_id>', methods=['GET'])
def get_recipe(recipe_id):
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
        return jsonify({
            'status': 'error',
            'message': 'Failed to fetch recipe',
            'error': str(e)
        }), 500

@app.route('/api/recipes/categories', methods=['GET'])
def get_recipe_categories():
    try:
        categories = db.session.query(Recipe.category).distinct().all()
        category_list = [cat[0] for cat in categories if cat[0]]
        
        return jsonify({
            'status': 'success',
            'data': category_list
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': 'Failed to fetch categories',
            'error': str(e)
        }), 500

@app.route('/api/recipes/difficulties', methods=['GET'])
def get_recipe_difficulties():
    return jsonify({
        'status': 'success',
        'data': ['easy', 'medium', 'hard']
    }), 200

# Recipe creation route (vendor only)
@app.route('/api/recipes', methods=['POST'])
@jwt_required()
def create_recipe():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role != 'vendor':
            return jsonify({
                'status': 'error',
                'message': 'Only vendors can create recipes'
            }), 403
        
        data = request.get_json()
        
        required_fields = ['title', 'description', 'ingredients', 'steps', 'category']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'status': 'error',
                    'message': f'{field} is required'
                }), 400
        
        recipe = Recipe(
            title=data['title'],
            description=data['description'],
            ingredients=data['ingredients'],
            steps=data['steps'],
            category=data['category'],
            prep_time=data.get('prep_time'),
            cook_time=data.get('cook_time'),
            servings=data.get('servings'),
            difficulty=data.get('difficulty', 'medium'),
            image_url=data.get('image_url'),
            video_url=data.get('video_url'),
            is_featured=data.get('is_featured', False)
        )
        
        db.session.add(recipe)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Recipe created successfully',
            'data': recipe.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': 'Failed to create recipe',
            'error': str(e)
        }), 500

# Recipe update route (vendor only)
@app.route('/api/recipes/<recipe_id>', methods=['PUT'])
@jwt_required()
def update_recipe(recipe_id):
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role != 'vendor':
            return jsonify({
                'status': 'error',
                'message': 'Only vendors can update recipes'
            }), 403
        
        recipe = Recipe.query.get(recipe_id)
        
        if not recipe:
            return jsonify({
                'status': 'error',
                'message': 'Recipe not found'
            }), 404
        
        data = request.get_json()
        
        if 'title' in data:
            recipe.title = data['title']
        if 'description' in data:
            recipe.description = data['description']
        if 'ingredients' in data:
            recipe.ingredients = data['ingredients']
        if 'steps' in data:
            recipe.steps = data['steps']
        if 'category' in data:
            recipe.category = data['category']
        if 'prep_time' in data:
            recipe.prep_time = data['prep_time']
        if 'cook_time' in data:
            recipe.cook_time = data['cook_time']
        if 'servings' in data:
            recipe.servings = data['servings']
        if 'difficulty' in data:
            recipe.difficulty = data['difficulty']
        if 'image_url' in data:
            recipe.image_url = data['image_url']
        if 'video_url' in data:
            recipe.video_url = data['video_url']
        if 'is_featured' in data:
            recipe.is_featured = bool(data['is_featured'])
        
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Recipe updated successfully',
            'data': recipe.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': 'Failed to update recipe',
            'error': str(e)
        }), 500

# Recipe delete route (vendor only)
@app.route('/api/recipes/<recipe_id>', methods=['DELETE'])
@jwt_required()
def delete_recipe(recipe_id):
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role != 'vendor':
            return jsonify({
                'status': 'error',
                'message': 'Only vendors can delete recipes'
            }), 403
        
        recipe = Recipe.query.get(recipe_id)
        
        if not recipe:
            return jsonify({
                'status': 'error',
                'message': 'Recipe not found'
            }), 404
        
        db.session.delete(recipe)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Recipe deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'status': 'error',
            'message': 'Failed to delete recipe',
            'error': str(e)
        }), 500

if __name__ == '__main__':
    print(f"Database path: {DATABASE_PATH}")
    print(f"Starting server on http://localhost:5000")
    print("Test users:")
    print("  Vendor: vendor@test.com / Vendor@123")
    print("  Customer: customer@test.com / Customer@123")
    print("  Admin: admin@test.com / Admin@123")
    app.run(debug=True, host='0.0.0.0', port=5000)