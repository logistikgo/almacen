const { Router } = require('express');
const router = new Router();

const Sucursal = require('./Sucursal.controller');
const Helper = require('../../services/utils/helpers');

router.get('/api/sucursales', Sucursal.get);
router.get('/api/sucursalesXD', Helper.getSucursalesXD);
router.get('/api/sucursal', Sucursal.getById);
router.get('/api/clientesxSucursal', Sucursal.getClientes);
router.post('/api/sucursal', Sucursal.save);
router.put('/api/sucursal', Sucursal.update);
router.delete('/api/sucursal', Sucursal._delete);

module.exports = router;