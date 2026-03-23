import uuid
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import relationship
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    role = db.Column(db.Enum('customer', 'vendor', name='user_role'), nullable=False, default='customer')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    vendor_meals = relationship('Meal', back_populates='vendor', cascade='all, delete-orphan')
    customer_orders = relationship('Order', back_populates='customer')
    
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

class OTP(db.Model):
    __tablename__ = 'otps'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), nullable=False, index=True)
    otp_code = db.Column(db.String(6), nullable=False)
    purpose = db.Column(db.String(20), nullable=False)  # 'signup', 'reset_password'
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_used = db.Column(db.Boolean, default=False)

class Meal(db.Model):
    __tablename__ = 'meals'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50), nullable=False, index=True)
    price = db.Column(db.Float, nullable=False)
    discount_price = db.Column(db.Float, nullable=True)
    stock_quantity = db.Column(db.Integer, default=0)
    image_url = db.Column(db.String(500), nullable=True)
    is_available = db.Column(db.Boolean, default=True)
    rating = db.Column(db.Float, default=0.0)
    total_reviews = db.Column(db.Integer, default=0)
    vendor_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    vendor = relationship('User', back_populates='vendor_meals')
    order_items = relationship('OrderItem', back_populates='meal', cascade='all, delete-orphan')
    reviews = relationship('Review', back_populates='meal', cascade='all, delete-orphan')
    
    @property
    def final_price(self):
        return self.discount_price if self.discount_price and self.discount_price < self.price else self.price
    
    @property
    def has_discount(self):
        return self.discount_price is not None and self.discount_price < self.price
    
    def to_dict(self):
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
            'vendor_name': f"{self.vendor.first_name} {self.vendor.last_name}" if self.vendor else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Order(db.Model):
    __tablename__ = 'orders'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    order_number = db.Column(db.String(20), unique=True, nullable=False)
    customer_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.Enum('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled', name='order_status'), default='pending')
    delivery_address = db.Column(db.Text, nullable=False)
    delivery_phone = db.Column(db.String(20), nullable=False)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    customer = relationship('User', back_populates='customer_orders')
    items = relationship('OrderItem', back_populates='order', cascade='all, delete-orphan')
    
    @staticmethod
    def generate_order_number():
        import random
        import string
        return 'ORD' + ''.join(random.choices(string.digits, k=8))
    
    def to_dict(self):
        return {
            'id': self.id,
            'order_number': self.order_number,
            'customer_id': self.customer_id,
            'customer_name': f"{self.customer.first_name} {self.customer.last_name}" if self.customer else None,
            'total_amount': self.total_amount,
            'status': self.status,
            'delivery_address': self.delivery_address,
            'delivery_phone': self.delivery_phone,
            'notes': self.notes,
            'items': [item.to_dict() for item in self.items],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class OrderItem(db.Model):
    __tablename__ = 'order_items'
    
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.String(36), db.ForeignKey('orders.id'), nullable=False)
    meal_id = db.Column(db.String(36), db.ForeignKey('meals.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Float, nullable=False)
    subtotal = db.Column(db.Float, nullable=False)
    
    # Relationships
    order = relationship('Order', back_populates='items')
    meal = relationship('Meal', back_populates='order_items')
    
    def to_dict(self):
        return {
            'id': self.id,
            'meal_id': self.meal_id,
            'meal_name': self.meal.name if self.meal else None,
            'meal_image': self.meal.image_url if self.meal else None,
            'quantity': self.quantity,
            'unit_price': self.unit_price,
            'subtotal': self.subtotal
        }

class Review(db.Model):
    __tablename__ = 'reviews'
    
    id = db.Column(db.Integer, primary_key=True)
    meal_id = db.Column(db.String(36), db.ForeignKey('meals.id'), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    rating = db.Column(db.Integer, nullable=False)  # 1-5
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    meal = relationship('Meal', back_populates='reviews')
    user = relationship('User')
    
    def to_dict(self):
        return {
            'id': self.id,
            'meal_id': self.meal_id,
            'user_id': self.user_id,
            'user_name': f"{self.user.first_name} {self.user.last_name}" if self.user else None,
            'rating': self.rating,
            'comment': self.comment,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Recipe(db.Model):
    __tablename__ = 'recipes'
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    ingredients = db.Column(db.Text, nullable=False)  # JSON string or text
    steps = db.Column(db.Text, nullable=False)  # JSON string or text
    category = db.Column(db.String(50), nullable=False, index=True)
    prep_time = db.Column(db.Integer, nullable=True)  # in minutes
    cook_time = db.Column(db.Integer, nullable=True)  # in minutes
    servings = db.Column(db.Integer, nullable=True)
    difficulty = db.Column(db.Enum('easy', 'medium', 'hard', name='recipe_difficulty'), default='medium')
    image_url = db.Column(db.String(500), nullable=True)
    video_url = db.Column(db.String(500), nullable=True)
    is_featured = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
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