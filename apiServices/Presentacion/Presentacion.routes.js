const { Router } = require('express');
const router = new Router();

const Presentacion = require('./Presentacion.controller');

router.get('/api/presentaciones', Presentacion.get);
router.get('/api/presentacion', Presentacion.getById);
router.post('/api/presentacion', Presentacion.save);
router.put('/api/presentacion', Presentacion.update);
router.delete('/api/presentacion', Presentacion._delete);

module.exports = router;