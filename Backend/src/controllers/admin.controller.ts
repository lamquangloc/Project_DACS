import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/category.service';
import { ProductService } from '../services/product.service';
import { UserService } from '../services/user.service';
import { OrderService } from '../services/order.service';
import { ReservationService } from '../services/reservation.service';
import { ComboService } from '../services/combo.service';

// Dashboard Controllers
export const getDashboardStats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await OrderService.getDashboardStats();
    res.status(200).json({
      status: 'success',
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

export const getDailyRevenue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query;
    const revenue = await OrderService.getDailyRevenue(startDate as string, endDate as string);
    res.status(200).json({
      status: 'success',
      data: revenue
    });
  } catch (error) {
    next(error);
  }
};

export const getMonthlyRevenue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { year } = req.query;
    const revenue = await OrderService.getMonthlyRevenue(year as string);
    res.status(200).json({
      status: 'success',
      data: revenue
    });
  } catch (error) {
    next(error);
  }
};

export const getMenuStats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await ProductService.getMenuStats();
    res.status(200).json({
      status: 'success',
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

// Category Controllers
export const getCategories = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await CategoryService.getAllCategories();
    res.status(200).json({
      status: 'success',
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = await CategoryService.createCategory(req.body);
    res.status(201).json({
      status: 'success',
      data: category
    });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = await CategoryService.updateCategory(req.params.id, req.body);
    res.status(200).json({
      status: 'success',
      data: category
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await CategoryService.deleteCategory(req.params.id);
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

// Product Controllers
export const getProducts = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await ProductService.getAllProducts();
    res.status(200).json({
      status: 'success',
      data: products
    });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await ProductService.createProduct(req.body);
    res.status(201).json({
      status: 'success',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await ProductService.updateProduct(req.params.id, req.body);
    res.status(200).json({
      status: 'success',
      data: product
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ProductService.deleteProduct(req.params.id);
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

// User Controllers
export const getUsers = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await UserService.getAllUsers();
    res.status(200).json({
      status: 'success',
      data: users
    });
  } catch (error) {
    next(error);
  }
};

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await UserService.register(req.body);
    res.status(201).json({
      status: 'success',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await UserService.updateUser(req.params.id, req.body);
    res.status(200).json({
      status: 'success',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await UserService.deleteUser(req.params.id);
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};

// Order Controllers
export const getOrders = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await OrderService.getAllOrders();
    res.status(200).json({
      status: 'success',
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    const order = await OrderService.updateOrderStatus(req.params.id, status);
    res.status(200).json({
      status: 'success',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// Reservation Controllers
export const getReservations = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const reservations = await ReservationService.getAllReservations();
    res.status(200).json({
      status: 'success',
      data: reservations
    });
  } catch (error) {
    next(error);
  }
};

export const updateReservationStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body;
    const reservation = await ReservationService.updateReservationStatus(req.params.id, status);
    res.status(200).json({
      status: 'success',
      data: reservation
    });
  } catch (error) {
    next(error);
  }
};

// Combo Controllers
export const getCombos = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const combos = await ComboService.getAllCombos();
    res.status(200).json({
      status: 'success',
      data: combos
    });
  } catch (error) {
    next(error);
  }
};

export const createCombo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const combo = await ComboService.createCombo(req.body);
    res.status(201).json({
      status: 'success',
      data: combo
    });
  } catch (error) {
    next(error);
  }
};

export const updateCombo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const combo = await ComboService.updateCombo(req.params.id, req.body);
    res.status(200).json({
      status: 'success',
      data: combo
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCombo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ComboService.deleteCombo(req.params.id);
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
}; 