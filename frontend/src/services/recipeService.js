import api from './api';

const recipeService = {
  getRecipes: async (params = {}) => {
    const response = await api.get('/recipes', { params });
    return response.data;
  },

  getRecipeById: async (recipeId) => {
    const response = await api.get(`/recipes/${recipeId}`);
    return response.data;
  },

  createRecipe: async (recipeData) => {
    const response = await api.post('/recipes', recipeData);
    return response.data;
  },

  updateRecipe: async (recipeId, recipeData) => {
    const response = await api.put(`/recipes/${recipeId}`, recipeData);
    return response.data;
  },

  deleteRecipe: async (recipeId) => {
    const response = await api.delete(`/recipes/${recipeId}`);
    return response.data;
  },

  getCategories: async () => {
    const response = await api.get('/recipes/categories');
    return response.data;
  },

  getDifficulties: async () => {
    const response = await api.get('/recipes/difficulties');
    return response.data;
  },
};

export default recipeService;