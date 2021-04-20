const { Router } = require('express');
const router = new Router();

const Producto = require('./Producto.controller');

router.get('/api/productos', Producto.get);
router.get('/api/producto', Producto.getById);
router.get('/api/producto/:clave', Producto.getByClave);
router.get('/api/productos/:idClienteFiscal', Producto.getByIDClienteFiscal);
router.get('/api/productosInventario/:idClienteFiscal', Producto.getByIDClienteFiscalAggregate);
router.post('/api/producto', Producto.save);
router.put('/api/producto/:_id', Producto.update);
router.delete('/api/productos', Producto._delete);
router.get('/api/validaProducto/:clave', Producto.validaProducto);
router.get('/api/getProductos', Producto.getByIDsClientesFiscales);
router.get('/api/getProductosALMXD', Producto.getALM_XD);
router.get('/api/getExistenciasByAlmacen/:almacen_id/:producto_id', Producto.getExistenciasByAlmacen);
router.get('/api/getPartidasxProductoenExistencia/:producto_id', Producto.getPartidasxProductoenExistencia);
router.get('/api/getEquivalencias', Producto.getEquivalencias);
router.get('/api/totalInventario', Producto.getTotalInventory);
router.get('/api/totalInventario/:subclasificacion', Producto.getTotalInventorySubclasificacion);

module.exports = router;