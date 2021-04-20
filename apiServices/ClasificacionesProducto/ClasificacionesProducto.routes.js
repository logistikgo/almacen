const { Router } = require('express');
const router = new Router();

const ClasificacionesProductos = require('./ClasificacionesProductos.controller');

router.get('/api/clasificacionesProductos', ClasificacionesProductos.get);
router.get('/api/clasificacionesProductos/:_id', ClasificacionesProductos.getById);
router.post('/api/clasificacionesProductos', ClasificacionesProductos.save);
router.put('/api/clasificacionesProductos/:_id', ClasificacionesProductos.update);
router.delete('/api/clasificacionesProductos/:_id', ClasificacionesProductos._delete);
router.get('/api/getValidaClasificacion', ClasificacionesProductos.getValidaClasificacion);

module.exports = router;