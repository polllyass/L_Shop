import { Router } from 'express';
import { FileUtils } from '../utils/fileUtils';
import { IProduct } from '../types';

const router = Router();
const fileUtils = new FileUtils();


router.get('/', async (req, res) => {
  try {
    const products = await fileUtils.readFile<IProduct>('products.json');
    let filteredProducts = [...products];
    

    if (req.query.search) {
      const searchTerm = String(req.query.search).toLowerCase();
      filteredProducts = filteredProducts.filter(p => 
        p.name.toLowerCase().includes(searchTerm) || 
        p.description.toLowerCase().includes(searchTerm)
      );
    }
 
    if (req.query.category) {
      filteredProducts = filteredProducts.filter(p => 
        p.category === req.query.category
      );
    }
    

    if (req.query.inStock === 'true') {
      filteredProducts = filteredProducts.filter(p => p.inStock);
    } else if (req.query.inStock === 'false') {
      filteredProducts = filteredProducts.filter(p => !p.inStock);
    }

    if (req.query.sort === 'price_asc') {
      filteredProducts.sort((a, b) => a.price - b.price);
    } else if (req.query.sort === 'price_desc') {
      filteredProducts.sort((a, b) => b.price - a.price);
    }
    
    res.json(filteredProducts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await fileUtils.findById<IProduct>('products.json', req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

export default router;