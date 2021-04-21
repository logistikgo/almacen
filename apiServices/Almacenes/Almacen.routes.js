const { Router } = require('express');
const router = new Router();

const Almacen = require('./Almacen.controller');

router.get('/api/getAlmacen/:idAlmacen', Almacen.getAlmacen);
router.get('/api/almacen', Almacen.getById);
router.get('/api/getBySurcursalClienteXD', Almacen.getBySurcursalClienteXD);
router.get('/api/almacenes', Almacen.get);
router.get('/api/almacenesCatalogo', Almacen.getCatalogo);
router.post('/api/saveAlmacen', Almacen.save);
router.put('/api/almacen', Almacen.update);
router.delete('/api/almacen', Almacen._delete);
router.get('/api/validaPosicion/:posicion/:nivel/:almacen_id', Almacen.validaPosicion);
router.get('/api/ubicaciones', Almacen.getUbicaciones);
router.get('/api/getAlmacenesFull', Almacen.getAlmacenesFull);

module.exports = router;