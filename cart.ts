import { Router } from 'express';
import { FileUtils } from '../utils/fileUtils';
import { AuthMiddleware } from '../middleware/auth'; 
import { ICart, IProduct, ICartItem } from '../types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const fileUtils = new FileUtils();
const authMiddleware = new AuthMiddleware(); 

router.use(authMiddleware.checkAuth);

router.get('/', async (req, res) => {
  try {
    const userId = req.userId; 
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found' });
    }

    const carts = await fileUtils.readFile<ICart>('carts.json');
    let userCart = carts.find(c => c.userId === userId);

    if (!userCart) {
      userCart = {
        id: uuidv4(),
        userId,
        items: [],
        updatedAt: new Date().toISOString()
      };
      await fileUtils.save<ICart>('carts.json', userCart);
    }

    const products = await fileUtils.readFile<IProduct>('products.json');
    const enrichedCart = {
      ...userCart,
      items: userCart.items.map(item => {
        const product = products.find(p => p.id === item.productId);
        return {
          ...item,
          product: product || null
        };
      })
    };
    
    res.json(enrichedCart);
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

router.post('/items', async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found' });
    }

    const { productId, quantity } = req.body;
    
    if (!productId || quantity < 1) {
      return res.status(400).json({ error: 'Invalid product ID or quantity' });
    }
    
    const product = await fileUtils.findById<IProduct>('products.json', productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const carts = await fileUtils.readFile<ICart>('carts.json');
    const userCart = carts.find(c => c.userId === userId);
    
    if (!userCart) {
      return res.status(404).json({ error: 'Cart not found' });
    }
    
    const existingItemIndex = userCart.items.findIndex(i => i.productId === productId);
    
    if (existingItemIndex >= 0) {

      userCart.items[existingItemIndex].quantity += quantity;
    } else {

      userCart.items.push({
        productId,
        quantity,
        addedAt: new Date().toISOString()
      });
    }
    
    userCart.updatedAt = new Date().toISOString();
    await fileUtils.save<ICart>('carts.json', userCart);
    
    res.json(userCart);
  } catch (error) {
    console.error('Error adding item to cart:', error);
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
});


router.put('/items/:productId', async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found' });
    }

    const { productId } = req.params;
    const { quantity } = req.body;
    
    if (quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }
    
    const carts = await fileUtils.readFile<ICart>('carts.json');
    const userCart = carts.find(c => c.userId === userId);
    
    if (!userCart) {
      return res.status(404).json({ error: 'Cart not found' });
    }
    
    const itemIndex = userCart.items.findIndex(i => i.productId === productId);
    
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }
    
    userCart.items[itemIndex].quantity = quantity;
    userCart.updatedAt = new Date().toISOString();
    await fileUtils.save<ICart>('carts.json', userCart);
    
    res.json(userCart);
  } catch (error) {
    console.error('Error updating cart item:', error);
    res.status(500).json({ error: 'Failed to update cart item' });
  }
});


router.delete('/items/:productId', async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found' });
    }

    const { productId } = req.params;
    
    const carts = await fileUtils.readFile<ICart>('carts.json');
    const userCart = carts.find(c => c.userId === userId);
    
    if (!userCart) {
      return res.status(404).json({ error: 'Cart not found' });
    }
    
    userCart.items = userCart.items.filter(i => i.productId !== productId);
    userCart.updatedAt = new Date().toISOString();
    await fileUtils.save<ICart>('carts.json', userCart);
    
    res.json(userCart);
  } catch (error) {
    console.error('Error removing item from cart:', error);
    res.status(500).json({ error: 'Failed to remove item from cart' });
  }
});

router.post('/clear', async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User ID not found' });
    }

    const carts = await fileUtils.readFile<ICart>('carts.json');
    const userCart = carts.find(c => c.userId === userId);
    
    if (!userCart) {
      return res.status(404).json({ error: 'Cart not found' });
    }
    
    userCart.items = [];
    userCart.updatedAt = new Date().toISOString();
    await fileUtils.save<ICart>('carts.json', userCart);
    
    res.json({ message: 'Cart cleared successfully' });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

export default router;