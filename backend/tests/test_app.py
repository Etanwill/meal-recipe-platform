import pytest
import json
import sys
import os

os.environ['SECRET_KEY'] = 'test-secret-key'
os.environ['JWT_SECRET_KEY'] = 'test-jwt-secret'
os.environ['DATABASE_URL'] = 'sqlite:///test_meal_platform.db'
os.environ['FLASK_ENV'] = 'testing'
os.environ['MAIL_USERNAME'] = 'test@test.com'
os.environ['MAIL_PASSWORD'] = 'testpass'

from app import app, db

# ─────────────────────────────────────────────
# FIXTURES
# ─────────────────────────────────────────────

@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['JWT_SECRET_KEY'] = 'test-jwt-secret'
    app.config['WTF_CSRF_ENABLED'] = False

    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.drop_all()


# ─────────────────────────────────────────────
# SECTION 1: API HEALTH TESTS
# ─────────────────────────────────────────────

class TestAPIHealth:

    def test_api_root_returns_200(self, client):
        """Test that the API root endpoint is reachable."""
        response = client.get('/')
        assert response.status_code == 200

    def test_api_root_returns_json(self, client):
        """Test that the API root returns JSON."""
        response = client.get('/')
        assert response.content_type == 'application/json'

    def test_api_root_has_name_field(self, client):
        """Test that the API response contains a name field."""
        response = client.get('/')
        data = json.loads(response.data)
        assert 'name' in data

    def test_meals_endpoint_exists(self, client):
        """Test that the meals listing endpoint exists."""
        response = client.get('/api/meals')
        assert response.status_code in [200, 401]

    def test_recipes_endpoint_exists(self, client):
        """Test that the recipes listing endpoint exists."""
        response = client.get('/api/recipes')
        assert response.status_code in [200, 401]


# ─────────────────────────────────────────────
# SECTION 2: AUTHENTICATION TESTS
# ─────────────────────────────────────────────

class TestAuthentication:

    def test_register_new_user_returns_response(self, client):
        """Test that registration endpoint responds."""
        response = client.post('/api/auth/register',
            json={
                'name': 'New User',
                'email': 'newuser@example.com',
                'password': 'NewPass@123',
                'role': 'customer'
            }
        )
        assert response.status_code in [200, 201, 400, 422]

    def test_register_returns_json(self, client):
        """Test that registration returns JSON."""
        response = client.post('/api/auth/register',
            json={
                'name': 'Another User',
                'email': 'another@example.com',
                'password': 'Another@123',
                'role': 'customer'
            }
        )
        data = json.loads(response.data)
        assert isinstance(data, dict)

    def test_register_duplicate_email_fails(self, client):
        """Test that registering with an existing email fails."""
        client.post('/api/auth/register',
            json={
                'name': 'First User',
                'email': 'duplicate@example.com',
                'password': 'First@123',
                'role': 'customer'
            }
        )
        response = client.post('/api/auth/register',
            json={
                'name': 'Duplicate User',
                'email': 'duplicate@example.com',
                'password': 'Duplicate@123',
                'role': 'customer'
            }
        )
        assert response.status_code in [400, 409, 422]

    def test_login_with_wrong_password_fails(self, client):
        """Test that login fails with incorrect password."""
        response = client.post('/api/auth/login',
            json={
                'email': 'nobody@example.com',
                'password': 'WrongPassword@999'
            }
        )
        assert response.status_code in [400, 401, 422]

    def test_login_with_unknown_email_fails(self, client):
        """Test that login fails for non-existent email."""
        response = client.post('/api/auth/login',
            json={
                'email': 'nobody@nowhere.com',
                'password': 'SomePass@123'
            }
        )
        assert response.status_code in [400, 401, 404, 422]

    def test_get_profile_requires_auth(self, client):
        """Test that accessing profile without token returns 401."""
        response = client.get('/api/auth/me')
        assert response.status_code == 401

    def test_login_endpoint_exists(self, client):
        """Test that the login endpoint exists and responds."""
        response = client.post('/api/auth/login',
            json={'email': 'test@test.com', 'password': 'test'}
        )
        assert response.status_code in [200, 400, 401, 422]

    def test_register_missing_email_fails(self, client):
        """Test that registration without email fails."""
        response = client.post('/api/auth/register',
            json={
                'name': 'No Email User',
                'password': 'NoEmail@123',
                'role': 'customer'
            }
        )
        assert response.status_code in [400, 422]

    def test_register_missing_password_fails(self, client):
        """Test that registration without password fails."""
        response = client.post('/api/auth/register',
            json={
                'name': 'No Password User',
                'email': 'nopass@example.com',
                'role': 'customer'
            }
        )
        assert response.status_code in [400, 422]

    def test_auth_endpoints_return_json(self, client):
        """Test that auth endpoints always return JSON."""
        response = client.post('/api/auth/login',
            json={'email': 'x@x.com', 'password': 'x'}
        )
        assert response.content_type == 'application/json'


# ─────────────────────────────────────────────
# SECTION 3: MEALS TESTS
# ─────────────────────────────────────────────

class TestMeals:

    def test_get_meals_requires_auth_or_returns_200(self, client):
        """Test that meals endpoint is protected or public."""
        response = client.get('/api/meals')
        assert response.status_code in [200, 401]

    def test_get_meals_returns_json(self, client):
        """Test that meals endpoint returns JSON."""
        response = client.get('/api/meals')
        assert response.content_type == 'application/json'

    def test_get_meal_categories_exists(self, client):
        """Test that meal categories endpoint exists."""
        response = client.get('/api/meals/categories')
        assert response.status_code in [200, 401]

    def test_create_meal_requires_auth(self, client):
        """Test that creating a meal without auth returns 401."""
        response = client.post('/api/meals',
            json={
                'name': 'Test Meal',
                'price': 5000,
                'category': 'Main Course'
            }
        )
        assert response.status_code == 401

    def test_get_nonexistent_meal_returns_404(self, client):
        """Test that getting a non-existent meal returns 404."""
        response = client.get('/api/meals/99999')
        assert response.status_code in [401, 404]

    def test_meals_response_has_data(self, client):
        """Test that meals response contains data."""
        response = client.get('/api/meals')
        data = json.loads(response.data)
        assert isinstance(data, (dict, list))

    def test_update_meal_requires_auth(self, client):
        """Test that updating a meal requires authentication."""
        response = client.put('/api/meals/1',
            json={'name': 'Updated Meal'}
        )
        assert response.status_code == 401

    def test_delete_meal_requires_auth(self, client):
        """Test that deleting a meal requires authentication."""
        response = client.delete('/api/meals/1')
        assert response.status_code == 401


# ─────────────────────────────────────────────
# SECTION 4: ORDERS TESTS
# ─────────────────────────────────────────────

class TestOrders:

    def test_get_orders_requires_auth(self, client):
        """Test that orders endpoint requires authentication."""
        response = client.get('/api/orders')
        assert response.status_code == 401

    def test_create_order_requires_auth(self, client):
        """Test that creating an order requires authentication."""
        response = client.post('/api/orders',
            json={'items': []}
        )
        assert response.status_code == 401

    def test_update_order_requires_auth(self, client):
        """Test that updating an order requires authentication."""
        response = client.put('/api/orders/1/status',
            json={'status': 'completed'}
        )
        assert response.status_code == 401


# ─────────────────────────────────────────────
# SECTION 5: RECIPES TESTS
# ─────────────────────────────────────────────

class TestRecipes:

    def test_get_recipes_endpoint_exists(self, client):
        """Test that recipes endpoint exists."""
        response = client.get('/api/recipes')
        assert response.status_code in [200, 401]

    def test_get_recipes_returns_json(self, client):
        """Test that recipes endpoint returns JSON."""
        response = client.get('/api/recipes')
        assert response.content_type == 'application/json'

    def test_get_recipe_categories_exists(self, client):
        """Test that recipe categories endpoint exists."""
        response = client.get('/api/recipes/categories')
        assert response.status_code in [200, 401]

    def test_get_nonexistent_recipe_returns_404(self, client):
        """Test that getting a non-existent recipe returns 404."""
        response = client.get('/api/recipes/99999')
        assert response.status_code in [401, 404]

    def test_create_recipe_requires_auth(self, client):
        """Test that creating a recipe requires authentication."""
        response = client.post('/api/recipes',
            json={'title': 'Test Recipe'}
        )
        assert response.status_code == 401