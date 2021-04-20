const { Router } = require('express');
const router = new Router();

const MovimientosInventario = require('./MovimientoInventario.controller');


router.get('/api/movimientosInventarioByProducto', MovimientosInventario.getByProducto);
router.get('/api/posicionesxProducto', MovimientosInventario.getPosicionesByProducto);
router.get('/api/movimientosInventario', MovimientosInventario.get);
router.get('/api/movimientosInventarioByIDs', MovimientosInventario.getByIDs_cte_suc_alm);
router.post('/api/ajuste', MovimientosInventario.saveAjuste);




module.exports = router;