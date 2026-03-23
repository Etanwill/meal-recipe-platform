import api from './api';

const mealService = {
  // Get all meals with pagination and filters
  getMeals: async (params = {}) => {
    const response = await api.get('/meals', { params });
    return response.data;
  },

  // Get meal by ID
  getMealById: async (mealId) => {
    const response = await api.get(`/meals/${mealId}`);
    return response.data;
  },

  // Create new meal
  createMeal: async (mealData) => {
    const response = await api.post('/meals', mealData);
    return response.data;
  },

  // Update meal
  updateMeal: async (mealId, mealData) => {
    const response = await api.put(`/meals/${mealId}`, mealData);
    return response.data;
  },

  // Delete meal
  deleteMeal: async (mealId) => {
    const response = await api.delete(`/meals/${mealId}`);
    return response.data;
  },

  // Add review to meal
  addReview: async (mealId, reviewData) => {
    const response = await api.post(`/meals/${mealId}/reviews`, reviewData);
    return response.data;
  },

  // Get meal categories
  getCategories: async () => {
    const response = await api.get('/meals/categories');
    return response.data;
  },

  // Upload meal image
  uploadImage: async (formData) => {
    const response = await api.post('/meals/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default mealService;