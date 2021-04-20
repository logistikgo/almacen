const { Router } = require('express');
const router = new Router();

const Posicion = require('./Posicion.controller');

router.get('/api/posiciones', Posicion.get);
router.get('/api/posicionesxPasillo', Posicion.getxPasillo);
router.get('/api/posicionesxPasilloDisponibles', Posicion.getxPasilloDisponibles);
router.get('/api/posicion', Posicion.getById);
router.get('/api/nivel', Posicion.getNivel);
router.get('/api/posicionesxProducto/:almacen_id/:producto_id', Posicion.getPosicionesxProducto)
router.get('/api/posicionAutomatica', Posicion.getPosicionAutomatica);
router.put('/api/posicion', Posicion.update);
router.delete('/api/posicion', Posicion._delete);

module.exports = router;
